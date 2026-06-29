import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Globe, Trash2, CheckCircle2, Loader2, RefreshCw, Cloud, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Hostname {
  id: string;
  org_id: string;
  hostname: string;
  is_verified: boolean;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  cf_hostname_id?: string | null;
  cf_status?: string | null;
  cf_ssl_status?: string | null;
  cf_ownership_verification?: any;
  cf_validation_records?: any;
  cf_verification_errors?: any;
  cf_last_checked_at?: string | null;
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dnsDialog, setDnsDialog] = useState<Hostname | null>(null);

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
    const { data: inserted, error } = await supabase.from("org_custom_hostnames" as any).insert({
      hostname: newHost.trim().toLowerCase(),
      org_id: newOrgId,
    }).select("*").maybeSingle();
    setAdding(false);
    if (error) {
      toast({ title: "Could not add hostname", description: error.message, variant: "destructive" });
      return;
    }
    setNewHost("");
    setNewOrgId("");
    toast({ title: "Hostname added", description: "Provisioning on Cloudflare…" });
    if (inserted) {
      await provisionCf((inserted as any).id);
    }
    refresh();
  };

  const provisionCf = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.functions.invoke("cloudflare-hostname", {
      body: { action: "create", hostname_id: id },
    });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast({
        title: "Cloudflare provisioning failed",
        description: (data as any)?.error ?? error?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Cloudflare custom hostname created", description: "Share DNS records with the customer to validate." });
    const { data: row } = await supabase.from("org_custom_hostnames" as any).select("*").eq("id", id).maybeSingle();
    if (row) setDnsDialog(row as any);
    refresh();
  };

  const checkStatus = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.functions.invoke("cloudflare-hostname", {
      body: { action: "status", hostname_id: id },
    });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast({ title: "Status check failed", description: (data as any)?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({
      title: (data as any)?.verified ? "Hostname is active" : "Still validating",
      description: (data as any)?.verified ? "SSL is live; visitors will reach the org site." : "Customer DNS not yet propagated.",
    });
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
  const remove = async (row: Hostname) => {
    if (row.cf_hostname_id) {
      await supabase.functions.invoke("cloudflare-hostname", {
        body: { action: "delete", hostname_id: row.id },
      });
    }
    await supabase.from("org_custom_hostnames" as any).delete().eq("id", row.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe size={20} className="text-primary" />
        <h2 className="font-heading font-bold text-2xl">Custom Hostnames</h2>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={async () => {
            const { data, error } = await supabase.functions.invoke("cloudflare-hostname", {
              body: { action: "set_fallback_origin", origin: "fs-africa.org.ng" },
            });
            if (error || (data as any)?.error) {
              toast({ title: "Fallback origin failed", description: (data as any)?.error ?? error?.message, variant: "destructive" });
            } else {
              toast({ title: "Fallback origin set", description: "fs-africa.org.ng" });
            }
          }}
        >
          <Cloud size={14} className="mr-1" /> Set fallback origin
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Adding a hostname automatically creates a Cloudflare custom hostname and
          returns the DNS validation records to share with the customer. Status
          polls Cloudflare until <strong>active</strong>, then visitors land on the
          org site. The local <em>Verified</em> switch flips on automatically once
          Cloudflare confirms SSL is live.
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

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No custom hostnames yet.</div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Hostname</th>
                <th className="px-4 py-2">Org</th>
                <th className="px-4 py-2">CF Status</th>
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
                    <td className="px-4 py-3">
                      {r.cf_hostname_id ? (
                        <button onClick={() => setDnsDialog(r)} className="text-xs underline decoration-dotted">
                          {r.cf_status ?? "pending"} • ssl: {r.cf_ssl_status ?? "—"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">not provisioned</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Switch checked={r.is_verified} onCheckedChange={(v) => toggleVerified(r.id, v)} /></td>
                    <td className="px-4 py-3"><Switch checked={r.is_primary} onCheckedChange={(v) => togglePrimary(r.id, r.org_id, v)} /></td>
                    <td className="px-4 py-3 text-right">
                      {r.is_verified && <CheckCircle2 size={14} className="inline text-emerald-500 mr-2" />}
                      {!r.cf_hostname_id && (
                        <Button variant="ghost" size="sm" onClick={() => provisionCf(r.id)} disabled={busyId === r.id} title="Provision on Cloudflare">
                          {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-1 h-7 px-2 text-xs"
                        onClick={() => (r.cf_hostname_id ? checkStatus(r.id) : provisionCf(r.id))}
                        disabled={busyId === r.id}
                        title={r.cf_hostname_id ? "Refresh Cloudflare status" : "Provision then refresh"}
                      >
                        {busyId === r.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin mr-1" /> Refreshing…
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} className="mr-1" /> Refresh
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(r)}>
                        <Trash2 size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Provision Cloudflare Worker route for edge URL rewriting"
                        onClick={async () => {
                          setBusyId(r.id);
                          const { data, error } = await supabase.functions.invoke(
                            "cloudflare-worker-routes",
                            {
                              body: {
                                action: "provision_route",
                                hostname: r.hostname,
                                slug: orgs.find((o) => o.id === r.org_id)?.slug,
                              },
                            }
                          );
                          setBusyId(null);
                          if (error || (data as any)?.error) {
                            toast({
                              title: "Worker route failed",
                              description: (data as any)?.error?.toString?.() ?? error?.message,
                              variant: "destructive",
                            });
                          } else {
                            toast({
                              title: (data as any)?.duplicate
                                ? "Worker route already exists"
                                : "Worker route provisioned",
                              description: `${r.hostname}/* → ${(data as any)?.worker}`,
                            });
                          }
                        }}
                      >
                        {busyId === r.id ? (
                          <Loader2 size={12} className="animate-spin mr-1" />
                        ) : null}
                        WR route
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!dnsDialog} onOpenChange={(o) => !o && setDnsDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud size={18} className="text-primary" /> DNS records for {dnsDialog?.hostname}
            </DialogTitle>
            <DialogDescription>
              Send these to the customer. They add them at their registrar; Cloudflare
              validates and provisions SSL automatically. Use "Check status" to refresh.
            </DialogDescription>
          </DialogHeader>
          {dnsDialog && (
            <div className="space-y-3 text-sm">
              {dnsDialog.cf_ownership_verification && (
                <RecordBlock title="Ownership (TXT)" record={dnsDialog.cf_ownership_verification} />
              )}
              {dnsDialog.cf_validation_records && (
                <RecordBlock title="SSL Validation" record={dnsDialog.cf_validation_records} />
              )}
              <div className="rounded-md border border-border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">Then point the hostname at our origin</div>
                <CopyableRow label="CNAME" name={dnsDialog.hostname} value="fs-africa.org.ng" />
              </div>
              {dnsDialog.cf_verification_errors && (
                <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded overflow-auto">
                  {JSON.stringify(dnsDialog.cf_verification_errors, null, 2)}
                </pre>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="default" size="sm" onClick={async () => {
                  if (!dnsDialog) return;
                  setBusyId(dnsDialog.id);
                  const { data, error } = await supabase.functions.invoke("cloudflare-hostname", {
                    body: { action: "create_validation_records", hostname_id: dnsDialog.id },
                  });
                  setBusyId(null);
                  const d: any = data;
                  if (error || d?.error) {
                    toast({ title: "Auto-create failed", description: d?.error ?? error?.message, variant: "destructive" });
                  } else if (d?.manual_required) {
                    toast({
                      title: "Manual DNS required",
                      description: `${d.message} Records shown above must be added at the customer's DNS provider.`,
                    });
                  } else {
                    toast({ title: "TXT records created on Cloudflare", description: JSON.stringify((data as any)?.records?.map((r: any) => r.status)) });
                    checkStatus(dnsDialog.id);
                  }
                }}>
                  <Cloud size={14} className="mr-1" /> Auto-create TXT on Cloudflare
                </Button>
                <Button variant="secondary" size="sm" onClick={async () => {
                  if (!dnsDialog) return;
                  if (!confirm(
                    `Flatten ${dnsDialog.hostname} apex and www to a PROXIED CNAME → fs-africa.org.ng?\n\n` +
                    `This will DELETE existing A / AAAA records on @ and www in the customer's Cloudflare zone, ` +
                    `then create proxied CNAMEs pointing to the SaaS zone.`
                  )) return;
                  setBusyId(dnsDialog.id);
                  const { data, error } = await supabase.functions.invoke("cloudflare-hostname", {
                    body: { action: "flatten_to_saas", hostname_id: dnsDialog.id, target: "fs-africa.org.ng" },
                  });
                  setBusyId(null);
                  const d: any = data;
                  if (error || d?.error) {
                    toast({
                      title: "Flatten failed",
                      description: d?.message ?? d?.error ?? error?.message,
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Apex flattened to SaaS CNAME",
                      description: `${d.apex} + www → ${d.target} (${d.results?.length ?? 0} DNS ops)`,
                    });
                    checkStatus(dnsDialog.id);
                  }
                }}>
                  <Cloud size={14} className="mr-1" /> Flatten apex → SaaS CNAME
                </Button>
                <Button variant="outline" size="sm" onClick={() => dnsDialog && checkStatus(dnsDialog.id)}>
                  <RefreshCw size={14} className="mr-1" /> Check status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CopyableRow = ({ label, name, value }: { label: string; name: string; value: string }) => {
  const { toast } = useToast();
  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: "Copied" });
  };
  return (
    <div className="grid grid-cols-[80px,1fr,auto] gap-2 items-center text-xs font-mono">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate">{name} → {value}</span>
      <Button size="sm" variant="ghost" onClick={() => copy(`${name}\t${label}\t${value}`)}>
        <Copy size={12} />
      </Button>
    </div>
  );
};

const RecordBlock = ({ title, record }: { title: string; record: any }) => {
  const r = record || {};
  const name = r.name ?? r.txt_name;
  const value = r.value ?? r.txt_value;
  return (
    <div className="rounded-md border border-border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      {name && value ? (
        <CopyableRow label={r.type ?? "TXT"} name={name} value={value} />
      ) : (
        <pre className="text-xs overflow-auto">{JSON.stringify(record, null, 2)}</pre>
      )}
    </div>
  );
};

export default CustomHostnamesPanel;
