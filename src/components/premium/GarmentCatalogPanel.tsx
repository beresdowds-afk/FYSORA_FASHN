import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, ShirtIcon, Globe, Camera, Trash2, RefreshCw, Download, Sparkles, Wand2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useGarmentCatalog, GarmentItem } from "@/hooks/useGarmentCatalog";
import { useGarmentAI } from "@/hooks/useGarmentAI";
import { useToast } from "@/hooks/use-toast";
import MediaDropzone from "@/components/shared/MediaDropzone";
import { supabase } from "@/integrations/supabase/client";

interface GarmentCatalogPanelProps {
  orgId: string;
  role: string | null;
}

const CATEGORIES = ["Suits", "Shirts", "Trousers", "Dresses", "Traditional", "Accessories", "Outerwear", "General"];

const GarmentCatalogPanel = ({ orgId, role }: GarmentCatalogPanelProps) => {
  const { garments, loading, addGarment, updateGarment, deleteGarment, uploadGarmentImage, syncToCatalog, refetch } = useGarmentCatalog(orgId);
  const { tryonLoading, enhanceLoading, tryonResult, startTryon, enhancePhoto, clearTryonResult } = useGarmentAI(orgId);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === "org_admin" || role === "manager" || role === "super_admin";

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "General", price: "", tags: "" });
  const [uploading, setUploading] = useState(false);
  const [tryonTarget, setTryonTarget] = useState<GarmentItem | null>(null);
  const [showEnhanceMenu, setShowEnhanceMenu] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const { data, error } = await addGarment({
      name: form.name,
      description: form.description,
      category: form.category,
      price: form.price ? parseFloat(form.price) : undefined,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    if (error) {
      toast({ title: "Failed to add garment", variant: "destructive" });
    } else {
      toast({ title: "Garment added" });
      setShowAdd(false);
      setForm({ name: "", description: "", category: "General", price: "", tags: "" });
    }
  };

  const handleImageUpload = async (garmentId: string, file: File) => {
    setUploading(true);
    const { error } = await uploadGarmentImage(file, garmentId);
    if (error) toast({ title: "Upload failed", variant: "destructive" });
    else toast({ title: "Image uploaded" });
    setUploading(false);
  };

  const handleMediaUpload = async (garmentId: string, file: File, type: "image" | "video") => {
    if (type === "image") {
      const { error, url } = await uploadGarmentImage(file, garmentId);
      if (error) {
        toast({ title: "Upload failed", variant: "destructive" });
        return null;
      }
      await updateGarment(garmentId, { media_url: url || undefined, media_type: "image" } as any);
      toast({ title: "Image uploaded" });
      return url;
    }
    const path = `${orgId}/${garmentId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("garment-images").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Video upload failed", variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("garment-images").getPublicUrl(path);
    await updateGarment(garmentId, { media_url: data.publicUrl, media_type: "video" } as any);
    toast({ title: "Video uploaded" });
    return data.publicUrl;
  };

  const handleSync = async (garment: GarmentItem) => {
    await updateGarment(garment.id, { sync_to_catalogue: true, is_published: true });
    await syncToCatalog(garment.id);
    toast({ title: "Synced to catalog & website" });
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    await updateGarment(id, { is_published: published });
  };

  const handleToggleTryon = async (id: string, enabled: boolean) => {
    await updateGarment(id, { tryon_enabled: enabled });
  };

  const handleModelUploadForTryon = async (file: File) => {
    if (!tryonTarget?.image_url) return;
    // Upload model image temporarily
    const path = `${orgId}/tryon-models/${Date.now()}_${file.name}`;
    const { error: uploadError } = await (await import("@/integrations/supabase/client")).supabase.storage
      .from("garment-images")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Failed to upload model photo", variant: "destructive" });
      return;
    }
    const { data } = (await import("@/integrations/supabase/client")).supabase.storage
      .from("garment-images")
      .getPublicUrl(path);

    startTryon(tryonTarget.id, tryonTarget.image_url, data.publicUrl);
    setTryonTarget(null);
  };

  const handleEnhance = async (garment: GarmentItem, action: "remove_background" | "enhance" | "stage") => {
    if (!garment.image_url) {
      toast({ title: "Upload an image first", variant: "destructive" });
      return;
    }
    setShowEnhanceMenu(null);
    const url = await enhancePhoto(garment.id, garment.image_url, action);
    if (url) refetch();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Try-on result dialog */}
      {tryonResult && (
        <Dialog open={!!tryonResult} onOpenChange={() => clearTryonResult()}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Virtual Try-On Result</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <img src={tryonResult.url} alt="Try-on result" className="w-full rounded-lg" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(tryonResult.url, "_blank")}>
                  <Download size={14} className="mr-1" /> Download
                </Button>
                <Button variant="outline" size="sm" onClick={clearTryonResult}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShirtIcon size={18} className="text-primary" />
            <h3 className="font-heading font-semibold text-lg">Garment Catalog</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{garments.length} garments</Badge>
            {isAdmin && (
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus size={14} className="mr-1" /> Add Garment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Garment</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Input placeholder="Garment name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Price (optional)" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                    <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                    <Button onClick={handleAdd} className="w-full">Add Garment</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {garments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No garments uploaded yet. Add your first garment to enable virtual try-on.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {garments.map((g: any) => {
              const isVideoMedia = g.media_type === "video" && g.media_url;
              return (
              <div key={g.id} className="rounded-lg border border-border overflow-hidden">
                {isVideoMedia ? (
                  <video
                    src={g.media_url}
                    className="w-full h-40 object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : g.image_url ? (
                  <div className="relative group">
                    <img src={g.image_url} alt={g.name} className="w-full h-40 object-cover" />
                    {/* AI overlay buttons */}
                    {isAdmin && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {g.tryon_enabled && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            disabled={tryonLoading === g.id}
                            onClick={() => setTryonTarget(g)}
                          >
                            {tryonLoading === g.id ? (
                              <Loader2 size={12} className="mr-1 animate-spin" />
                            ) : (
                              <Sparkles size={12} className="mr-1" />
                            )}
                            Try-On
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          disabled={enhanceLoading === g.id}
                          onClick={() => setShowEnhanceMenu(showEnhanceMenu === g.id ? null : g.id)}
                        >
                          {enhanceLoading === g.id ? (
                            <Loader2 size={12} className="mr-1 animate-spin" />
                          ) : (
                            <Wand2 size={12} className="mr-1" />
                          )}
                          Enhance
                        </Button>
                      </div>
                    )}
                    {/* Enhance submenu */}
                    {showEnhanceMenu === g.id && (
                      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-2 space-y-1">
                        <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7" onClick={() => handleEnhance(g, "remove_background")}>
                          <ImageIcon size={10} className="mr-1.5" /> Remove Background
                        </Button>
                        <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7" onClick={() => handleEnhance(g, "enhance")}>
                          <Wand2 size={10} className="mr-1.5" /> Studio Lighting
                        </Button>
                        <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7" onClick={() => handleEnhance(g, "stage")}>
                          <Sparkles size={10} className="mr-1.5" /> AI Product Staging
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2">
                    <MediaDropzone
                      aspect="video"
                      label="Drop image or short video"
                      onUpload={(file, type) => handleMediaUpload(g.id, file, type)}
                    />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm truncate">{g.name}</h4>
                    {g.price && <span className="text-xs font-medium text-primary">{g.currency} {g.price}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{g.description || "No description"}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{g.category}</Badge>
                    {g.is_published && <Badge variant="secondary" className="text-[10px]"><Globe size={8} className="mr-0.5" /> Published</Badge>}
                    {g.tryon_enabled && <Badge variant="secondary" className="text-[10px]"><Camera size={8} className="mr-0.5" /> Try-On</Badge>}
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span><Camera size={10} className="inline mr-0.5" />{g.tryon_count} try-ons</span>
                    <span><Download size={10} className="inline mr-0.5" />{g.download_count} downloads</span>
                  </div>
                  {/* Controls */}
                  {isAdmin && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-[10px]">
                          <Switch checked={g.is_published} onCheckedChange={v => handleTogglePublish(g.id, v)} className="scale-75" />
                          Publish
                        </label>
                        <label className="flex items-center gap-1 text-[10px]">
                          <Switch checked={g.tryon_enabled} onCheckedChange={v => handleToggleTryon(g.id, v)} className="scale-75" />
                          Try-On
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSync(g)}>
                          <RefreshCw size={10} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteGarment(g.id)}>
                          <Trash2 size={10} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
          const file = e.target.files?.[0];
          const gId = fileRef.current?.getAttribute("data-garment-id");
          if (file && gId) handleImageUpload(gId, file);
        }} />

        {/* Model photo upload for try-on */}
        <input ref={modelFileRef} type="file" accept="image/*" className="hidden" onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleModelUploadForTryon(file);
        }} />
      </Card>

      {/* Try-on model upload dialog */}
      {tryonTarget && (
        <Dialog open={!!tryonTarget} onOpenChange={() => setTryonTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Virtual Try-On</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a model photo to see how <strong>{tryonTarget.name}</strong> looks when worn. 
                The AI will transfer the garment onto the model photo.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <img src={tryonTarget.image_url!} alt={tryonTarget.name} className="w-24 h-24 object-cover rounded-lg mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">Garment</span>
                </div>
                <Sparkles size={20} className="text-primary" />
                <div className="flex-1 text-center">
                  <div
                    className="w-24 h-24 rounded-lg bg-muted/30 border-2 border-dashed border-border flex items-center justify-center mx-auto mb-1 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => modelFileRef.current?.click()}
                  >
                    <Upload size={20} className="text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Model photo</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Cost: 5 credits per try-on • Best results with full-body front-facing photos
              </p>
              <Button variant="outline" className="w-full" onClick={() => modelFileRef.current?.click()}>
                <Upload size={14} className="mr-1" /> Select Model Photo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default GarmentCatalogPanel;
