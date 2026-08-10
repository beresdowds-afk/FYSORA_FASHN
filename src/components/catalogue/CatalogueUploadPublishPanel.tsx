import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, Trash2, Globe, EyeOff, ImagePlus, AlertCircle } from "lucide-react";

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
}

interface Props {
  orgId: string;
  currency?: string;
  canEdit?: boolean;
}

const CatalogueUploadPublishPanel = ({ orgId, currency = "NGN", canEdit = true }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, { name: string; price: string }>>({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_catalogue_items")
      .select("id,name,price,currency,image_url,is_available,published_at")
      .eq("org_id", orgId)
      .order("published_at", { ascending: false });
    if (error) toast({ title: "Could not load catalogue", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setDrafts(Object.fromEntries(((data as Row[]) || []).map((r) => [r.id, { name: r.name, price: r.price?.toString() || "" }])));
    setLoading(false);
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const validate = (file: File): string | null => {
    if (!ALLOWED.includes(file.type)) return `${file.name}: unsupported type (JPG, PNG, WebP, GIF or AVIF only)`;
    if (file.size > MAX_MB * 1024 * 1024) return `${file.name}: too large (max ${MAX_MB} MB)`;
    return null;
  };

  const handleFiles = async (files: File[]) => {
    if (!canEdit || files.length === 0) return;
    const bad = files.map(validate).filter(Boolean) as string[];
    const good = files.filter((f) => !validate(f));
    setErrors(bad);
    if (good.length === 0) return;

    setProgress({ done: 0, total: good.length });
    let done = 0;
    for (const file of good) {
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
      setProgress({ done, total: good.length });
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
      .update({ name: d.name.trim(), price: d.price ? Number(d.price) : null })
      .eq("id", row.id);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); load(); }
  };

  const setPublished = async (ids: string[], publish: boolean) => {
    if (ids.length === 0) return;
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

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const draftsList = rows.filter((r) => !r.is_available);
  const publishedList = rows.filter((r) => r.is_available);

  const renderCard = (row: Row) => (
    <Card key={row.id} className="overflow-hidden">
      <div className="relative aspect-square bg-muted">
        {row.image_url ? (
          <img src={row.image_url} alt={row.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImagePlus size={24} /></div>
        )}
        {canEdit && (
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
          disabled={!canEdit}
          onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], name: e.target.value } }))}
          className="h-8 text-sm"
          placeholder="Item name"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            value={drafts[row.id]?.price ?? ""}
            disabled={!canEdit}
            onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], price: e.target.value } }))}
            className="h-8 text-sm"
            placeholder={`Price (${row.currency || currency})`}
          />
          <Button size="sm" variant="outline" className="h-8" disabled={!canEdit || busy} onClick={() => saveRow(row)}>Save</Button>
        </div>
        {canEdit && (
          <div className="flex items-center justify-between pt-1">
            <Button size="sm" variant={row.is_available ? "outline" : "default"} className="h-7 text-xs"
              disabled={busy} onClick={() => setPublished([row.id], !row.is_available)}>
              {row.is_available ? <><EyeOff size={12} className="mr-1" /> Unpublish</> : <><Globe size={12} className="mr-1" /> Publish</>}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(row.id)}>
              <Trash2 size={12} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {canEdit && (
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
              <p className="text-sm text-muted-foreground">Uploading {progress.done}/{progress.total}…</p>
              <div className="h-1.5 w-full max-w-xs mx-auto rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          ) : (
            <>
              <Upload className="mx-auto text-muted-foreground mb-2" size={24} />
              <p className="text-sm font-medium">Drop product images here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, GIF or AVIF · up to {MAX_MB} MB each · uploaded as drafts</p>
            </>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle size={14} /> Some files were rejected
          </div>
          {errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}
        </div>
      )}

      {canEdit && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <span className="text-sm">{selectedIds.length} selected</span>
          <Button size="sm" disabled={busy} onClick={() => setPublished(selectedIds, true)}>
            <Globe size={14} className="mr-1" /> Publish
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setPublished(selectedIds, false)}>
            <EyeOff size={14} className="mr-1" /> Unpublish
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <>
          <section className="space-y-3">
            <h4 className="font-heading font-semibold text-sm">Drafts ({draftsList.length})</h4>
            {draftsList.length === 0 ? (
              <p className="text-xs text-muted-foreground">No drafts. Upload images above to start.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{draftsList.map(renderCard)}</div>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="font-heading font-semibold text-sm">Published ({publishedList.length})</h4>
            {publishedList.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing published yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{publishedList.map(renderCard)}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default CatalogueUploadPublishPanel;
