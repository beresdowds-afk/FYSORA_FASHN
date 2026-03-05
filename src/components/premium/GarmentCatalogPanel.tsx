import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, ShirtIcon, Globe, Camera, Trash2, RefreshCw, Download } from "lucide-react";
import { useGarmentCatalog, GarmentItem } from "@/hooks/useGarmentCatalog";
import { useToast } from "@/hooks/use-toast";

interface GarmentCatalogPanelProps {
  orgId: string;
  role: string | null;
}

const CATEGORIES = ["Suits", "Shirts", "Trousers", "Dresses", "Traditional", "Accessories", "Outerwear", "General"];

const GarmentCatalogPanel = ({ orgId, role }: GarmentCatalogPanelProps) => {
  const { garments, loading, addGarment, updateGarment, deleteGarment, uploadGarmentImage, syncToCatalog } = useGarmentCatalog(orgId);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === "org_admin" || role === "super_admin";

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "General", price: "", tags: "" });
  const [uploading, setUploading] = useState(false);

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

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
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
            {garments.map(g => (
              <div key={g.id} className="rounded-lg border border-border overflow-hidden">
                {g.image_url ? (
                  <img src={g.image_url} alt={g.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-muted/30 flex flex-col items-center justify-center cursor-pointer"
                    onClick={() => { fileRef.current?.setAttribute("data-garment-id", g.id); fileRef.current?.click(); }}>
                    <Upload size={24} className="text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload image</span>
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
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
          const file = e.target.files?.[0];
          const gId = fileRef.current?.getAttribute("data-garment-id");
          if (file && gId) handleImageUpload(gId, file);
        }} />
      </Card>
    </div>
  );
};

export default GarmentCatalogPanel;
