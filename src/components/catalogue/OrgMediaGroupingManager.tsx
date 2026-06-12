import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgMediaGroups, NodeType, MediaAsset, GroupNode } from "@/hooks/useOrgMediaGroups";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Trash2, Layers, FolderTree, Album, Image as ImageIcon, ChevronRight, Send, FilePlus2 } from "lucide-react";

interface Props { orgId: string; currency?: string }

const labelFor = (t: NodeType) =>
  t === "image" ? "Image" : t === "design_set" ? "Design Set" : t === "collection" ? "Collection" : "Album";

const childOptionsFor = (t: Exclude<NodeType, "image">): NodeType[] =>
  t === "design_set" ? ["image"] :
  t === "collection" ? ["design_set", "image"] :
  ["collection", "design_set", "image"];

const OrgMediaGroupingManager = ({ orgId, currency = "NGN" }: Props) => {
  const { toast } = useToast();
  const g = useOrgMediaGroups(orgId);
  const [tab, setTab] = useState<"library" | "sets" | "collections" | "albums">("library");
  const [selection, setSelection] = useState<Array<{ type: NodeType; id: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishCat, setPublishCat] = useState<string>("");
  const [publishPrice, setPublishPrice] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqLabel, setReqLabel] = useState("");
  const [reqDesc, setReqDesc] = useState("");

  useEffect(() => {
    (supabase as any).from("platform_catalogue_categories")
      .select("id,label").eq("is_active", true).order("sort_order")
      .then(({ data }: any) => setCategories(data || []));
  }, []);

  const toggleSel = (type: NodeType, id: string) => {
    setSelection(prev => {
      const exists = prev.find(s => s.type === type && s.id === id);
      return exists ? prev.filter(s => !(s.type === type && s.id === id)) : [...prev, { type, id }];
    });
  };
  const isSel = (type: NodeType, id: string) => !!selection.find(s => s.type === type && s.id === id);

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const { error } = await g.uploadImage(f);
      if (error) toast({ title: "Upload failed", description: f.name, variant: "destructive" });
    }
    toast({ title: `${files.length} image(s) uploaded` });
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setTab("library");
      await onUpload(files);
    }
  };

  const submitCategoryRequest = async () => {
    if (!reqLabel.trim()) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const slug = reqLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await (supabase as any).from("platform_category_requests").insert({
      org_id: orgId, requested_by: uid, label: reqLabel.trim(),
      slug_suggestion: slug, description: reqDesc.trim() || null,
    });
    if (error) return toast({ title: "Request failed", description: error.message, variant: "destructive" });
    toast({ title: "Category request sent to Super Admin" });
    setReqOpen(false); setReqLabel(""); setReqDesc("");
  };

  const doPublish = async () => {
    const { error, count } = await g.publishToCatalogue(selection, {
      category_id: publishCat || null,
      price: publishPrice ? parseFloat(publishPrice) : null,
      currency,
    });
    if (error) return toast({ title: "Publish failed", description: error.message, variant: "destructive" });
    toast({ title: `${count} item(s) published to catalogue` });
    setSelection([]); setPublishOpen(false); setPublishPrice("");
  };

  const previewCount = useMemo(() => {
    const seen = new Set<string>();
    let n = 0;
    for (const s of selection) n += g.expandToImages(s.type, s.id, seen).length;
    return n;
  }, [selection, g]);

  return (
    <Card
      className={`p-4 space-y-4 transition-colors ${dragActive ? "ring-2 ring-primary bg-primary/5" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            <Layers size={18} className="text-primary" /> Media Library & Grouping
          </h3>
          <p className="text-xs text-muted-foreground">
            Drag &amp; drop product images anywhere on this card, group into Design Sets / Collections / Albums, then publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selection.length > 0 && (
            <Badge variant="secondary">{selection.length} selected · {previewCount} image(s)</Badge>
          )}
          <Dialog open={reqOpen} onOpenChange={setReqOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <FilePlus2 size={14} className="mr-1" /> Request Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request new platform category</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Proposed category name</label>
                  <Input value={reqLabel} onChange={(e) => setReqLabel(e.target.value)} placeholder="e.g. Bridal Wear" />
                </div>
                <div>
                  <label className="text-xs font-medium">Why is this needed? (optional)</label>
                  <Textarea rows={3} value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} placeholder="Short justification for the Super Admin..." />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your request is sent to the Super Admin for approval. You'll be able to use this category once approved.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setReqOpen(false)}>Cancel</Button>
                <Button onClick={submitCategoryRequest} disabled={!reqLabel.trim()}>Send Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={selection.length === 0}>
                <Send size={14} className="mr-1" /> Publish to Catalogue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Publish {previewCount} image(s) to Catalogue</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Platform category (optional)</label>
                  <Select value={publishCat} onValueChange={setPublishCat}>
                    <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Default price (optional)</label>
                  <Input type="number" value={publishPrice} onChange={e => setPublishPrice(e.target.value)} placeholder={`e.g. 25000 ${currency}`} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Items appear in the platform catalogue ordered by publish time (your selection order is preserved).
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPublishOpen(false)}>Cancel</Button>
                <Button onClick={doPublish}>Publish</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="library"><ImageIcon size={12} className="mr-1" />Images</TabsTrigger>
          <TabsTrigger value="sets"><Layers size={12} className="mr-1" />Design Sets</TabsTrigger>
          <TabsTrigger value="collections"><FolderTree size={12} className="mr-1" />Collections</TabsTrigger>
          <TabsTrigger value="albums"><Album size={12} className="mr-1" />Albums</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-6 cursor-pointer text-center transition-colors"
          >
            <Upload size={22} className="text-primary" />
            <p className="text-sm font-medium">Drag &amp; drop images here, or click to browse</p>
            <p className="text-[11px] text-muted-foreground">Multiple files supported. They land in your Library, ready to group.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.images.map(img => (
              <SelectableCard key={img.id} selected={isSel("image", img.id)}
                onToggle={() => toggleSel("image", img.id)}
                onDelete={() => g.deleteNode("image", img.id)}
                title={img.name} image={img.media_url} />
            ))}
          </div>
          {g.images.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No images yet.</p>}
        </TabsContent>

        <TabsContent value="sets"><GroupSection kind="design_set" hook={g} toggleSel={toggleSel} isSel={isSel} /></TabsContent>
        <TabsContent value="collections"><GroupSection kind="collection" hook={g} toggleSel={toggleSel} isSel={isSel} /></TabsContent>
        <TabsContent value="albums"><GroupSection kind="album" hook={g} toggleSel={toggleSel} isSel={isSel} /></TabsContent>
      </Tabs>
    </Card>
  );
};

const SelectableCard = ({ selected, onToggle, onDelete, title, image, subtitle, onClick }: {
  selected: boolean; onToggle: () => void; onDelete?: () => void;
  title: string; image?: string | null; subtitle?: string; onClick?: () => void;
}) => (
  <div className={`relative rounded-lg border overflow-hidden bg-card ${selected ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
    <div className="absolute top-1 left-1 z-10 bg-background/80 rounded">
      <Checkbox checked={selected} onCheckedChange={onToggle} />
    </div>
    {onDelete && (
      <Button variant="ghost" size="icon" className="absolute top-1 right-1 z-10 h-6 w-6 bg-background/80 text-destructive"
        onClick={onDelete}><Trash2 size={12} /></Button>
    )}
    <button type="button" onClick={onClick} className="w-full text-left">
      <div className="aspect-square bg-muted">
        {image ? <img src={image} alt={title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={24} /></div>}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </button>
  </div>
);

const GroupSection = ({ kind, hook, toggleSel, isSel }: {
  kind: Exclude<NodeType, "image">;
  hook: ReturnType<typeof useOrgMediaGroups>;
  toggleSel: (t: NodeType, id: string) => void;
  isSel: (t: NodeType, id: string) => boolean;
}) => {
  const { toast } = useToast();
  const items: GroupNode[] = kind === "design_set" ? hook.sets : kind === "collection" ? hook.collections : hook.albums;
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await hook.createGroup(kind, name.trim(), desc.trim() || undefined);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { toast({ title: `${labelFor(kind)} created` }); setName(""); setDesc(""); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium">New {labelFor(kind)} name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. Spring 2026 ${labelFor(kind)}`} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Textarea rows={1} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" />
        </div>
        <Button size="sm" onClick={create}><Plus size={14} className="mr-1" /> Create</Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No {labelFor(kind).toLowerCase()}s yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(it => {
            const children = hook.groupings.filter(x => x.parent_type === kind && x.parent_id === it.id);
            return (
              <SelectableCard key={it.id} selected={isSel(kind, it.id)}
                onToggle={() => toggleSel(kind, it.id)}
                onDelete={() => hook.deleteNode(kind, it.id)}
                title={it.name}
                image={it.cover_url}
                subtitle={`${children.length} item(s)`}
                onClick={() => setOpenId(it.id)} />
            );
          })}
        </div>
      )}

      {openId && (
        <GroupEditor kind={kind} parent={items.find(i => i.id === openId)!} hook={hook} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
};

const GroupEditor = ({ kind, parent, hook, onClose }: {
  kind: Exclude<NodeType, "image">; parent: GroupNode;
  hook: ReturnType<typeof useOrgMediaGroups>; onClose: () => void;
}) => {
  const { toast } = useToast();
  const allowed = childOptionsFor(kind);
  const [pickType, setPickType] = useState<NodeType>(allowed[0]);
  const children = hook.groupings
    .filter(x => x.parent_type === kind && x.parent_id === parent.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const candidatesFor = (t: NodeType): { id: string; label: string; image?: string | null }[] => {
    const used = new Set(children.filter(c => c.child_type === t).map(c => c.child_id));
    if (t === "image") return hook.images.filter(i => !used.has(i.id)).map(i => ({ id: i.id, label: i.name, image: i.media_url }));
    if (t === "design_set") return hook.sets.filter(i => !used.has(i.id)).map(i => ({ id: i.id, label: i.name, image: i.cover_url }));
    if (t === "collection") return hook.collections.filter(i => !used.has(i.id)).map(i => ({ id: i.id, label: i.name, image: i.cover_url }));
    return [];
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {labelFor(kind)} <ChevronRight size={14} /> {parent.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium mb-2">Contents ({children.length})</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {children.map(c => {
                const node: any =
                  c.child_type === "image" ? hook.images.find(i => i.id === c.child_id)
                  : c.child_type === "design_set" ? hook.sets.find(i => i.id === c.child_id)
                  : c.child_type === "collection" ? hook.collections.find(i => i.id === c.child_id)
                  : hook.albums.find(i => i.id === c.child_id);
                if (!node) return null;
                const img = c.child_type === "image" ? node.media_url : node.cover_url;
                return (
                  <div key={c.id} className="relative rounded border border-border bg-card overflow-hidden">
                    <div className="aspect-square bg-muted">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={20} /></div>}
                    </div>
                    <div className="p-1.5"><p className="text-[10px] truncate">{node.name}</p>
                      <Badge variant="outline" className="text-[9px] mt-0.5">{labelFor(c.child_type)}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-0.5 right-0.5 h-5 w-5 bg-background/80 text-destructive"
                      onClick={() => hook.removeChild(c.id)}><Trash2 size={10} /></Button>
                  </div>
                );
              })}
              {children.length === 0 && <p className="text-xs text-muted-foreground col-span-full text-center py-4">Empty.</p>}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Add to this {labelFor(kind).toLowerCase()}</h4>
            <div className="flex gap-2 mb-2">
              {allowed.map(t => (
                <Button key={t} size="sm" variant={pickType === t ? "default" : "outline"} onClick={() => setPickType(t)}>
                  {labelFor(t)}s
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {candidatesFor(pickType).map(cand => (
                <button key={cand.id} onClick={async () => {
                  const { error } = await hook.addChild(kind, parent.id, pickType, cand.id);
                  if (error) toast({ title: "Add failed", description: error.message, variant: "destructive" });
                }} className="rounded border border-border bg-card overflow-hidden hover:border-primary text-left">
                  <div className="aspect-square bg-muted">
                    {cand.image ? <img src={cand.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={20} /></div>}
                  </div>
                  <p className="text-[10px] p-1 truncate">{cand.label}</p>
                </button>
              ))}
              {candidatesFor(pickType).length === 0 && <p className="text-xs text-muted-foreground col-span-full text-center py-4">Nothing available to add.</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrgMediaGroupingManager;