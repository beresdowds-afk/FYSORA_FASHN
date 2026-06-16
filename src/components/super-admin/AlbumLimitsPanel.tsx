import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Images, Plus, Save, Trash2 } from "lucide-react";

interface Row {
  id: string;
  role: string;
  plan_tier: string;
  max_albums: number;
  max_images_per_album: number;
  allow_sharing: boolean;
  allow_public: boolean;
  allow_collaborative: boolean;
  allow_downloads: boolean;
  is_active: boolean;
  notes: string | null;
}

const ROLES = [
  "customer", "tailor", "designer", "manager", "org_admin",
  "super_assistant", "super_admin",
] as const;

const AlbumLimitsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<Row>>({
    role: "customer", plan_tier: "default", max_albums: 5, max_images_per_album: 25,
    allow_sharing: true, allow_public: false, allow_collaborative: false, allow_downloads: true,
    is_active: true, notes: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("album_role_limits")
      .select("*")
      .order("role").order("plan_tier");
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateField = async (id: string, patch: Partial<Row>) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await (supabase as any).from("album_role_limits").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("album_role_limits").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const create = async () => {
    const { error } = await (supabase as any).from("album_role_limits").insert(draft);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    toast({ title: "Album limit added" });
    setAdding(false);
    load();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Images className="text-primary" /> Album & Media Limits
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Per-role and per-plan caps for album count, images per album, and album features (sharing, public, collaborative, downloads).
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setAdding(!adding)}>
          <Plus size={14} className="mr-1" /> {adding ? "Close" : "Add Rule"}
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Plan tier</Label>
              <Input value={draft.plan_tier || ""} onChange={(e) => setDraft({ ...draft, plan_tier: e.target.value })} placeholder="default | premium | pro" />
            </div>
            <div>
              <Label className="text-xs">Max albums</Label>
              <Input type="number" value={draft.max_albums ?? 0} onChange={(e) => setDraft({ ...draft, max_albums: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Images per album</Label>
              <Input type="number" value={draft.max_images_per_album ?? 0} onChange={(e) => setDraft({ ...draft, max_images_per_album: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-5 items-center">
            {(["allow_sharing","allow_public","allow_collaborative","allow_downloads","is_active"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-xs">
                <Switch checked={!!(draft as any)[k]} onCheckedChange={(v) => setDraft({ ...draft, [k]: v })} />
                {k.replace(/_/g, " ")}
              </label>
            ))}
          </div>
          <Input value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes (optional)" />
          <div className="flex justify-end"><Button size="sm" onClick={create}><Save size={14} className="mr-1"/>Save</Button></div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Plan</th>
                <th className="text-left px-3 py-2">Max Albums</th>
                <th className="text-left px-3 py-2">Imgs/Album</th>
                <th className="text-center px-2 py-2">Share</th>
                <th className="text-center px-2 py-2">Public</th>
                <th className="text-center px-2 py-2">Collab</th>
                <th className="text-center px-2 py-2">Download</th>
                <th className="text-center px-2 py-2">Active</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">No rules defined.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium capitalize">{r.role}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.plan_tier}</td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24" defaultValue={r.max_albums}
                      onBlur={(e) => updateField(r.id, { max_albums: Number(e.target.value) })} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24" defaultValue={r.max_images_per_album}
                      onBlur={(e) => updateField(r.id, { max_images_per_album: Number(e.target.value) })} />
                  </td>
                  <td className="text-center"><Switch checked={r.allow_sharing} onCheckedChange={(v) => updateField(r.id, { allow_sharing: v })} /></td>
                  <td className="text-center"><Switch checked={r.allow_public} onCheckedChange={(v) => updateField(r.id, { allow_public: v })} /></td>
                  <td className="text-center"><Switch checked={r.allow_collaborative} onCheckedChange={(v) => updateField(r.id, { allow_collaborative: v })} /></td>
                  <td className="text-center"><Switch checked={r.allow_downloads} onCheckedChange={(v) => updateField(r.id, { allow_downloads: v })} /></td>
                  <td className="text-center"><Switch checked={r.is_active} onCheckedChange={(v) => updateField(r.id, { is_active: v })} /></td>
                  <td className="px-2 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default AlbumLimitsPanel;