import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Globe, Trash2, CheckCircle2, Loader2 } from "lucide-react";

interface Hostname {
  id: string;
  org_id: string;
  hostname: string;
  is_verified: boolean;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

interface Org { id: string; name: string; slug: string }

/**
 * Super Admin panel for managing branded custom hostnames (e.g.
 * gabulkfashionstudio.org.ng → Gabulk Fashion Studio). When an entry is
 * verified, the platform automatically renders that org's site at that host.
 */
const CustomHostnamesPanel = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Hostname[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newHost, setNewHost] = useState("");
  const [newOrgId, setNewOrgId] = useState("");

  const refresh = async () => {
    setLoading(true);
    const [{ data: h }, { data: o }] = await Promise.all([
      supabase.from("org_custom_hostnames" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name, slug").order("name"),
    ]);
    setRows((h as any) || []);
    setOrgs((o as any) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!newHost || !newOrgId) return;
    setAdding(true);
    const { error } = await supabase.from("org_custom_hostnames" as any).insert({
      hostname: newHost.trim().toLowerCase(),
      org_id: newOrgId,
    });
    setAdding(false);
    if (error) {
      toast({ title: "Could not add hostname", description: error.message, variant: "destructive" });
      return;
    }
    setNewHost("");
    setNewOrgId("");
    toast({ title: "Hostname added", description: "Connect the domain in Project Settings → Domains, then mark as verified." });
    refresh();
  };

  const toggleVerified = async (id: string, v: boolean) => {
    await supabase.from("org_custom_hostnames" as any).update({ is_verified: v }).eq("id", id);
    refresh();
  };
  const togglePrimary = async (id: string, orgId: string, v: boolean) => {
    if (v) {
      await supabase.from("org_custom_hostnames" as any).update({ is_primary: false }).eq("org_id", orgId);
    }
    await supabase.from("org_custom_hostnames" as any).update({ is_primary: v }).eq("id", id);
    refresh();
  };
  const remove = async (id: string) => {
    await supabase.from("org_custom_hostnames" as any).delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe size={20} className="text-primary" />
        <h2 className="font-heading font-bold text-2xl">Custom Hostnames</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          After adding a hostname, also connect it in Project Settings → Domains
          (A record <code className="px-1 bg-muted rounded">185.158.133.1</code> plus
          the <code className="px-1 bg-muted rounded">_lovable</code> TXT shown there).
          Mark as verified once the domain is live so visitors land on the org site.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[2fr,2fr,auto] gap-3 items-end">
          <div>
            <Label className="text-xs">Hostname</Label>
            <Input value={newHost} onChange={e => setNewHost(e.target.value)} placeholder="gabulkfashionstudio.org.ng" />
          </div>
          <div>
            <Label className="text-xs">Organization</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
              value={newOrgId} onChange={e => setNewOrgId(e.target.value)}>
              <option value="">Select organization…</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>)}
            </select>
          </div>
          <Button onClick={add} disabled={adding || !newHost || !newOrgId}>
            {adding ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No custom hostnames yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Hostname</th>
                <th className="px-4 py-2">Org</th>
                <th className="px-4 py-2">Verified</th>
                <th className="px-4 py-2">Primary</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const org = orgs.find(o => o.id === r.org_id);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono">{r.hostname}</td>
                    <td className="px-4 py-3">{org?.name || r.org_id}</td>
                    <td className="px-4 py-3"><Switch checked={r.is_verified} onCheckedChange={(v) => toggleVerified(r.id, v)} /></td>
                    <td className="px-4 py-3"><Switch checked={r.is_primary} onCheckedChange={(v) => togglePrimary(r.id, r.org_id, v)} /></td>
                    <td className="px-4 py-3 text-right">
                      {r.is_verified && <CheckCircle2 size={14} className="inline text-emerald-500 mr-2" />}
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CustomHostnamesPanel;
