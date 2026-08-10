import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, Trash2, Globe, EyeOff, ImagePlus, AlertCircle, Eye, Lock, Gauge } from "lucide-react";
import { optimizeImage, formatBytes, type OptimizedImage } from "@/lib/imageOptimizer";
import CataloguePreviewDialog from "./CataloguePreviewDialog";
import CatalogueAuditLog from "./CatalogueAuditLog";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_MB = 10;

interface Row {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  is_available: boolean;
  published_at: string;
  category: string | null;
  collection: string | null;
  tags: string[] | null;
}

interface Draft { name: string; price: string; category: string; collection: string; tags: string }

interface Props {
  orgId: string;
  currency?: string;
  canEdit?: boolean;
  /** Roles allowed to upload/edit drafts. Defaults to canEdit. */
  canUpload?: boolean;
  /** Roles allowed to publish/unpublish. Defaults to canEdit. */
  canPublish?: boolean;
  orgName?: string;
}

const toDraft = (r: Row): Draft => ({
  name: r.name,
  price: r.price?.toString() || "",
  category: r.category || "",
  collection: r.collection || "",
  tags: (r.tags || []).join(", "),
});

const CatalogueUploadPublishPanel = ({ orgId, currency = "NGN", canEdit = true, canUpload, canPublish, orgName }: Props) => {
  const { toast } = useToast();
  const allowUpload = canUpload ?? canEdit;
  const allowPublish = canPublish ?? canEdit;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [optimizations, setOptimizations] = useState<OptimizedImage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIds, setPreviewIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_catalogue_items")
      .select("id,name,price,currency,image_url,is_available,published_at,category,collection,tags")
      .eq("org_id", orgId)
      .order("published_at", { ascending: false });
    if (error) toast({ title: "Could not load catalogue", description: error.message, variant: "destructive" });
    const list = ((data as any[]) || []) as Row[];
    setRows(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.id, toDraft(r)])));
    setLoading(false);
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const validate = (file: File): string | null => {
    if (!ALLOWED.includes(file.type)) return `${file.name}: unsupported type (JPG, PNG, WebP, GIF or AVIF only)`;
    if (file.size > MAX_MB * 1024 * 1024) return `${file.name}: too large (max ${MAX_MB} MB)`;
    return null;
  };

  const handleFiles = async (files: File[]) => {
    if (!allowUpload || files.length === 0) return;
    const bad = files.map(validate).filter(Boolean) as string[];
    const good = files.filter((f) => !validate(f));
    setErrors(bad);
    if (good.length === 0) return;

    const optimized: OptimizedImage[] = [];
    setProgress({ done: 0, total: good.length, label: "Optimising" });
    for (let i = 0; i < good.length; i += 1) {
      try {
        optimized.push(await optimizeImage(good[i]));
      } catch (e: any) {
        setErrors((prev) => [...prev, `${good[i].name}: ${e?.message || "could not optimise"}`]);
      }
      setProgress({ done: i + 1, total: good.length, label: "Optimising" });
    }
    setOptimizations(optimized);

    setProgress({ done: 0, total: optimized.length, label: "Uploading" });
    let done = 0;
    for (const opt of optimized) {
      const file = opt.file;
      const path = `${orgId}/catalogue/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("garment-images").upload(path, file, { upsert: true });
      if (upErr) {
        setErrors((e) => [...e, `${file.name}: upload failed — ${upErr.message}`]);
      } else {
        const { data } = supabase.storage.from("garment-images").getPublicUrl(path);
        const { error: insErr } = await supabase.from("org_catalogue_items").insert({
          org_id: orgId,
          name: file.name.replace(/\.[^.]+$/, ""),
          image_url: data.publicUrl,
          media_url: data.publicUrl,
          currency,
          is_available: false,
        });
        if (insErr) setErrors((e) => [...e, `${file.name}: ${insErr.message}`]);
      }
      done += 1;
      setProgress({ done, total: optimized.length, label: "Uploading" });
    }
    setProgress(null);
    toast({ title: "Upload complete", description: `${done} file(s) added as drafts. Set a price, then publish.` });
    await load();
  };

  const saveRow = async (row: Row) => {
    const d = drafts[row.id];
    if (!d) return;
    if (!d.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (d.price && (isNaN(Number(d.price)) || Number(d.price) < 0)) {
      toast({ title: "Invalid price", description: "Enter a positive number.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("org_catalogue_items")
      .update({
        name: d.name.trim(),
        price: d.price ? Number(d.price) : null,
        category: d.category.trim() || null,
        collection: d.collection.trim() || null,
        tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
      } as any)
      .eq("id", row.id);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); load(); }
  };

  const setPublished = async (ids: string[], publish: boolean) => {
    if (ids.length === 0) return;
    if (!allowPublish) {
      toast({ title: "Not allowed", description: "Your role cannot publish or unpublish catalogue items.", variant: "destructive" });
      return;
    }
    if (publish) {
      const missing = rows.filter((r) => ids.includes(r.id)).filter((r) => !r.image_url || (drafts[r.id]?.price ?? "") === "");
      if (missing.length > 0) {
        toast({
          title: "Cannot publish yet",
          description: `${missing.length} item(s) need an image and a price.`,
          variant: "destructive",
        });
        return;
      }
    }
    setBusy(true);
    const { error } = await supabase
      .from("org_catalogue_items")
      .update({ is_available: publish, published_at: new Date().toISOString() })
      .in("id", ids);
    setBusy(false);
    if (error) toast({ title: publish ? "Publish failed" : "Unpublish failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: publish ? "Published to your website" : "Moved back to drafts" });
      setSelected({});
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("org_catalogue_items").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  const openPreview = (ids: string[]) => { setPreviewIds(ids); setPreviewOpen(true); };

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const draftsList = rows.filter((r) => !r.is_available);
  const publishedList = rows.filter((r) => r.is_available);

  const previewItems = useMemo(
    () => rows.filter((r) => previewIds.includes(r.id)).map((r) => {
      const d = drafts[r.id];
      return {
        id: r.id,
        name: d?.name ?? r.name,
        price: d?.price ? Number(d.price) : r.price,
        currency: r.currency,
        image_url: r.image_url,
        category: d?.category ?? r.category,
        collection: d?.collection ?? r.collection,
        tags: d ? d.tags.split(",").map((t) => t.trim()).filter(Boolean) : r.tags,
      };
    }),
    [rows, drafts, previewIds],
  );

  const optSummary = useMemo(() => {
    if (optimizations.length === 0) return null;
    const before = optimizations.reduce((s, o) => s + o.originalBytes, 0);
    const after = optimizations.reduce((s, o) => s + o.optimizedBytes, 0);
    return { before, after, saved: before - after, pct: before ? Math.round(((before - after) / before) * 100) : 0 };
  }, [optimizations]);

  const renderCard = (row: Row) => (
    <Card key={row.id} className="overflow-hidden">
      <div className="relative aspect-square bg-muted">
        {row.image_url ? (
          <img src={row.image_url} alt={row.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImagePlus size={24} /></div>
        )}
        {allowUpload && (
          <div className="absolute top-2 left-2 bg-background/90 rounded p-1">
            <Checkbox
              checked={!!selected[row.id]}
              onCheckedChange={(v) => setSelected((s) => ({ ...s, [row.id]: !!v }))}
              aria-label={`Select ${row.name}`}
            />
          </div>
        )}
        <Badge variant={row.is_available ? "default" : "secondary"} className="absolute top-2 right-2 text-[10px]">
          {row.is_available ? "Published" : "Draft"}
        </Badge>
      </div>
      <div className="p-3 space-y-2">
        <Input
          value={drafts[row.id]?.name ?? ""}
          disabled={!allowUpload}
          onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], name: e.target.value } }))}
          className="h-8 text-sm"
          placeholder="Item name"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            value={drafts[row.id]?.price ?? ""}
            disabled={!allowUpload}
            onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], price: e.target.value } }))}
            className="h-8 text-sm"
            placeholder={`Price (${row.currency || currency})`}
          />
          <Button size="sm" variant="outline" className="h-8" disabled={!allowUpload || busy} onClick={() => saveRow(row)}>Save</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={drafts[row.id]?.category ?? ""}
            disabled={!allowUpload}
            onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], category: e.target.value } }))}
            className="h-8 text-xs"
            placeholder="Category"
          />
          <Input
            value={drafts[row.id]?.collection ?? ""}
            disabled={!allowUpload}
            onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], collection: e.target.value } }))}
            className="h-8 text-xs"
            placeholder="Collection"
          />
        </div>
        <Input
          value={drafts[row.id]?.tags ?? ""}
          disabled={!allowUpload}
          onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], tags: e.target.value } }))}
          className="h-8 text-xs"
          placeholder="Tags (comma separated)"
        />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {allowPublish && (
              <Button size="sm" variant={row.is_available ? "outline" : "default"} className="h-7 text-xs"
                disabled={busy} onClick={() => setPublished([row.id], !row.is_available)}>
                {row.is_available ? <><EyeOff size={12} className="mr-1" /> Unpublish</> : <><Globe size={12} className="mr-1" /> Publish</>}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openPreview([row.id])}>
              <Eye size={12} className="mr-1" /> Preview
            </Button>
          </div>
          {allowUpload && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(row.id)}>
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {!allowUpload && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Lock size={14} className="mt-0.5 shrink-0" />
          Your role can view the catalogue but cannot upload, edit or publish items.
        </div>
      )}

      {allowUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(",")}
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
          />
          {progress ? (
            <div className="space-y-2">
              <Loader2 className="mx-auto animate-spin text-primary" size={24} />
              <p className="text-sm text-muted-foreground">{progress.label} {progress.done}/{progress.total}…</p>
              <div className="h-1.5 w-full max-w-xs mx-auto rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="mx-auto text-muted-foreground" size={24} />
              <p className="text-sm font-medium">Drop product images here or click to browse</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF or AVIF — up to {MAX_MB} MB each. Images are resized and compressed automatically.</p>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive flex items-start gap-1.5"><AlertCircle size={12} className="mt-0.5 shrink-0" />{e}</p>
          ))}
        </div>
      )}

      {optSummary && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gauge size={14} className="text-primary" /> Optimisation impact
            <span className="text-xs font-normal text-muted-foreground">
              {formatBytes(optSummary.before)} → {formatBytes(optSummary.after)} (saved {formatBytes(optSummary.saved)}, {optSummary.pct}%)
            </span>
          </div>
          <ul className="space-y-1">
            {optimizations.map((o, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                <span className="font-medium text-foreground">{o.file.name}</span>
                <span>{formatBytes(o.originalBytes)} → {formatBytes(o.optimizedBytes)}</span>
                {o.width > 0 && <span>{o.originalWidth}×{o.originalHeight} → {o.width}×{o.height}</span>}
                <span>quality {Math.round(o.quality * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allowUpload && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPreview(selectedIds)}>
            <Eye size={12} className="mr-1" /> Preview
          </Button>
          {allowPublish && (
            <>
              <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => setPublished(selectedIds, true)}>
                <Globe size={12} className="mr-1" /> Publish selected
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => setPublished(selectedIds, false)}>
                <EyeOff size={12} className="mr-1" /> Unpublish selected
              </Button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Drafts <span className="text-muted-foreground font-normal">({draftsList.length})</span></h4>
              {draftsList.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openPreview(draftsList.map((r) => r.id))}>
                  <Eye size={12} className="mr-1" /> Preview all drafts
                </Button>
              )}
            </div>
            {draftsList.length === 0 ? (
              <p className="text-xs text-muted-foreground">No drafts. Upload images to get started.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{draftsList.map(renderCard)}</div>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Published <span className="text-muted-foreground font-normal">({publishedList.length})</span></h4>
            {publishedList.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing published yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{publishedList.map(renderCard)}</div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-3">
            <CatalogueAuditLog orgId={orgId} />
          </section>
        </>
      )}

      <CataloguePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        items={previewItems}
        currency={currency}
        orgName={orgName}
      />
    </div>
  );
};

export default CatalogueUploadPublishPanel;
