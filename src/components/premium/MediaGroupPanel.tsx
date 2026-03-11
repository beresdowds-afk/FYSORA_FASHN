import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Layers, Plus, Trash2, Image, Video, GripVertical, Eye, EyeOff,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MediaGroupPanelProps {
  orgId: string;
}

interface MediaGroup {
  id: string;
  name: string;
  description: string | null;
  catalogue_item_id: string | null;
  is_published: boolean;
  created_at: string;
}

interface MediaGroupItem {
  id: string;
  group_id: string;
  media_type: string;
  media_url: string;
  sort_order: number;
  caption: string | null;
}

const MediaGroupPanel = ({ orgId }: MediaGroupPanelProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ["media-groups", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("media_groups")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      return (data || []) as MediaGroup[];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["media-group-items", selectedGroup],
    enabled: !!selectedGroup,
    queryFn: async () => {
      const { data } = await supabase
        .from("media_group_items")
        .select("*")
        .eq("group_id", selectedGroup!)
        .order("sort_order");
      return (data || []) as MediaGroupItem[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("media_groups").insert({
        user_id: user.id,
        org_id: orgId,
        name: form.name,
        description: form.description || null,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-groups"] });
      setForm({ name: "", description: "" });
      setAddOpen(false);
      toast({ title: "Media group created" });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("media_groups").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-groups"] });
      setSelectedGroup(null);
      toast({ title: "Group deleted" });
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      await supabase.from("media_groups").update({ is_published: published } as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-groups"] }),
  });

  const addItem = useMutation({
    mutationFn: async ({ groupId, type, url }: { groupId: string; type: string; url: string }) => {
      const maxOrder = (items || []).reduce((m, i) => Math.max(m, i.sort_order), -1);
      await supabase.from("media_group_items").insert({
        group_id: groupId,
        media_type: type,
        media_url: url,
        sort_order: maxOrder + 1,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-group-items"] });
      toast({ title: "Media added to group" });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("media_group_items").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-group-items"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <Layers size={20} /> Media Groups
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Bind videos and images together to promote a single product.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus size={14} className="mr-1" /> New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Media Group</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Group Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Spring Collection Promo" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <Button className="w-full" onClick={() => createGroup.mutate()} disabled={!form.name}>
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (groups || []).length === 0 ? (
        <Card className="p-8 text-center">
          <Layers size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No media groups yet. Create one to start bundling product media.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Groups list */}
          <div className="space-y-3">
            {(groups || []).map(g => (
              <Card
                key={g.id}
                className={`p-4 cursor-pointer transition-colors ${selectedGroup === g.id ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => setSelectedGroup(g.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{g.name}</h4>
                    {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(g.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); togglePublish.mutate({ id: g.id, published: !g.is_published }); }}
                    >
                      {g.is_published ? <Eye size={14} className="text-green-600" /> : <EyeOff size={14} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteGroup.mutate(g.id); }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Items panel */}
          <Card className="p-4">
            {selectedGroup ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Group Media</h4>
                  <div className="flex gap-1">
                    <AddMediaButton groupId={selectedGroup} type="image" onAdd={(url) => addItem.mutate({ groupId: selectedGroup, type: "image", url })} />
                    <AddMediaButton groupId={selectedGroup} type="video" onAdd={(url) => addItem.mutate({ groupId: selectedGroup, type: "video", url })} />
                  </div>
                </div>
                {(items || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No media items. Add images or videos above.</p>
                ) : (
                  <div className="space-y-2">
                    {(items || []).map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          {item.media_type === "video" ? <Video size={14} /> : <Image size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{item.media_url}</p>
                          <Badge variant="outline" className="text-[10px]">{item.media_type}</Badge>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem.mutate(item.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Select a media group to view its contents
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

// Small add-media button with URL input dialog
const AddMediaButton = ({ groupId, type, onAdd }: { groupId: string; type: string; onAdd: (url: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const Icon = type === "video" ? Video : Image;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
          <Icon size={12} /> Add {type}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add {type}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <Input placeholder={`${type} URL`} value={url} onChange={e => setUrl(e.target.value)} />
          <Button className="w-full" onClick={() => { onAdd(url); setUrl(""); setOpen(false); }} disabled={!url}>
            Add to Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaGroupPanel;
