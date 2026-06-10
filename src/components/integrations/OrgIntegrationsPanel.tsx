import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Key, Webhook, Trash2, RefreshCw, ShieldCheck, Send, Plus, Eye, EyeOff, PlayCircle, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props { orgId: string }

const EVENT_OPTIONS = [
  { id: "order.created", desc: "Fires when a new order is submitted from the catalogue/cart." },
  { id: "order.status_changed", desc: "Fires when an order moves between production stages." },
  { id: "order.completed", desc: "Fires when an order is marked completed." },
  { id: "payment.succeeded", desc: "Fires when a payment is verified." },
  { id: "measurement.recorded", desc: "Fires when an AI / video-call measurement is captured." },
];

const SCOPE_OPTIONS = ["catalogue:read", "orders:read", "orders:write", "customers:read", "measurements:read"];

type ApiKey = {
  id: string; name: string; key_prefix: string; scopes: string[]; environment: string;
  revoked_at: string | null; last_used_at: string | null; created_at: string;
};
type Hook = {
  id: string; url: string; description: string | null; events: string[]; is_active: boolean;
  secret: string; last_delivery_at: string | null; last_status: number | null; failure_count: number;
};
type Delivery = {
  id: string; webhook_id: string; event: string; response_status: number | null;
  succeeded: boolean; duration_ms: number | null; attempted_at: string;
  status?: string | null; attempt?: number | null; max_attempts?: number | null;
  next_retry_at?: string | null; error?: string | null; idempotency_key?: string | null;
};

const OrgIntegrationsPanel = ({ orgId }: Props) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["catalogue:read", "orders:write"]);
  const [newKeyEnv, setNewKeyEnv] = useState<"live" | "test">("live");
  const [createdKey, setCreatedKey] = useState<{ prefix: string; plaintext: string } | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  const [newHookUrl, setNewHookUrl] = useState("");
  const [newHookDesc, setNewHookDesc] = useState("");
  const [newHookEvents, setNewHookEvents] = useState<string[]>(["order.created"]);
  const [creatingHook, setCreatingHook] = useState(false);
  const [revealSecret, setRevealSecret] = useState<Record<string, boolean>>({});

  // Verify panel state
  const [verifyKey, setVerifyKey] = useState("");
  const [verifyHookId, setVerifyHookId] = useState<string>("");
  const [verifyEvent, setVerifyEvent] = useState<string>("integration.verify");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Inline editing of webhook event subscriptions
  const [editingEventsFor, setEditingEventsFor] = useState<string | null>(null);
  const [draftEvents, setDraftEvents] = useState<string[]>([]);
  const [savingEvents, setSavingEvents] = useState(false);

  // Delivery filters / replay
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hookFilter, setHookFilter] = useState<string>("all");
  const [replaying, setReplaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [k, h, d] = await Promise.all([
      supabase.from("org_integration_api_keys").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("org_outbound_webhooks").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("org_webhook_deliveries")
        .select("id, webhook_id, event, response_status, succeeded, duration_ms, attempted_at, status, attempt, max_attempts, next_retry_at, error")
        .eq("org_id", orgId).order("attempted_at", { ascending: false }).limit(100),
    ]);
    setKeys((k.data as ApiKey[]) ?? []);
    setHooks((h.data as Hook[]) ?? []);
    setDeliveries((d.data as Delivery[]) ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-org-integrations", {
      body: { org_id: orgId, ...body },
    });
    if (error || !data?.ok) {
      const msg = (data as any)?.error || error?.message || "Request failed";
      toast.error(msg);
      return null;
    }
    return data as any;
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return toast.error("Name required");
    setCreatingKey(true);
    const res = await call({ action: "create_api_key", name: newKeyName.trim(), scopes: newKeyScopes, environment: newKeyEnv });
    setCreatingKey(false);
    if (res) {
      setCreatedKey({ prefix: res.key.key_prefix, plaintext: res.plaintext });
      setNewKeyName("");
      await load();
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this key? Calls using it will be rejected.")) return;
    if (await call({ action: "revoke_api_key", key_id: id })) { toast.success("Key revoked"); load(); }
  };
  const deleteKey = async (id: string) => {
    if (!confirm("Permanently delete this key?")) return;
    if (await call({ action: "delete_api_key", key_id: id })) { toast.success("Key deleted"); load(); }
  };

  const createHook = async () => {
    if (!/^https?:\/\/.+/.test(newHookUrl)) return toast.error("Valid HTTPS URL required");
    if (newHookEvents.length === 0) return toast.error("Pick at least one event");
    setCreatingHook(true);
    const res = await call({ action: "create_webhook", url: newHookUrl, description: newHookDesc, events: newHookEvents });
    setCreatingHook(false);
    if (res) {
      toast.success("Webhook created");
      setNewHookUrl(""); setNewHookDesc(""); setNewHookEvents(["order.created"]);
      load();
    }
  };
  const toggleHook = async (h: Hook) => {
    if (await call({ action: "update_webhook", webhook_id: h.id, is_active: !h.is_active })) load();
  };
  const rotateHook = async (id: string) => {
    const res = await call({ action: "rotate_webhook_secret", webhook_id: id });
    if (res) { toast.success("Secret rotated"); load(); }
  };
  const rotateKey = async (id: string) => {
    if (!confirm("Rotate this API key? A new secret will be issued, linked webhooks will be re-pointed, and the old key will be revoked atomically.")) return;
    const res = await call({ action: "rotate_api_key", key_id: id });
    if (res) {
      setCreatedKey({ prefix: res.prefix, plaintext: res.plaintext });
      toast.success(`Rotated. ${res.rotation?.webhooks_relinked ?? 0} webhook(s) re-linked.`);
      load();
    }
  };
  const replayDelivery = async (id: string) => {
    setReplaying(id);
    const res = await call({ action: "replay_delivery", delivery_id: id });
    setReplaying(null);
    if (res) {
      const r = res.dispatch?.results?.[0];
      if (r?.ok) toast.success(`Replayed (HTTP ${r.status})`);
      else toast.error(`Replay failed${r?.status ? ` (HTTP ${r.status})` : ""}`);
      load();
    }
  };
  const processRetries = async () => {
    const res = await call({ action: "process_retries" });
    if (res) { toast.success(`Processed ${res.result?.processed ?? 0} pending retries`); load(); }
  };
  const runVerify = async () => {
    if (verifyKey.trim().length < 16) return toast.error("Paste a full API key");
    setVerifying(true);
    setVerifyResult(null);
    const { data, error } = await supabase.functions.invoke("verify-org-integration", {
      body: {
        org_id: orgId,
        api_key: verifyKey.trim(),
        webhook_id: verifyHookId || undefined,
        event: verifyHookId ? verifyEvent : undefined,
      },
    });
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    setVerifyResult(data);
    if ((data as any)?.ok) toast.success("Integration verified end-to-end");
    else toast.error("Verification failed — see details below");
  };

  const startEditEvents = (h: Hook) => {
    setEditingEventsFor(h.id);
    setDraftEvents([...h.events]);
  };
  const saveEventEdits = async () => {
    if (!editingEventsFor) return;
    if (draftEvents.length === 0) return toast.error("Select at least one event");
    setSavingEvents(true);
    const res = await call({ action: "update_webhook", webhook_id: editingEventsFor, events: draftEvents });
    setSavingEvents(false);
    if (res) {
      toast.success("Event subscriptions updated");
      setEditingEventsFor(null);
      load();
    }
  };
  const deleteHook = async (id: string) => {
    if (!confirm("Delete this webhook endpoint?")) return;
    if (await call({ action: "delete_webhook", webhook_id: id })) { toast.success("Deleted"); load(); }
  };
  const testHook = async (id: string) => {
    const res = await call({ action: "test_webhook", webhook_id: id });
    if (res) {
      const d = res.dispatch?.results?.[0];
      if (d?.ok) toast.success(`Delivered (${d.status})`);
      else toast.error(`Delivery failed${d?.status ? ` (HTTP ${d.status})` : ""}`);
      load();
    }
  };

  const copy = (s: string, label = "Copied") => { navigator.clipboard.writeText(s); toast.success(label); };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Issue API keys and register webhooks so your native site, non-native website, or any external system can talk to Fashion Stitches Africa.
        </p>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><Key className="w-4 h-4 mr-1" />API Keys</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="w-4 h-4 mr-1" />Webhooks</TabsTrigger>
          <TabsTrigger value="verify"><ShieldCheck className="w-4 h-4 mr-1" />Verify</TabsTrigger>
          <TabsTrigger value="logs"><Send className="w-4 h-4 mr-1" />Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issue a new API key</CardTitle>
              <CardDescription>The full key is shown once. Store it securely — we only keep the hash.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Key name</Label>
                <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Production website" />
              </div>
              <div>
                <Label>Environment</Label>
                <div className="flex gap-2 mt-2">
                  {(["live","test"] as const).map((e) => (
                    <Button key={e} type="button" size="sm" variant={newKeyEnv === e ? "default" : "outline"} onClick={() => setNewKeyEnv(e)}>{e}</Button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Scopes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SCOPE_OPTIONS.map((s) => {
                    const active = newKeyScopes.includes(s);
                    return (
                      <button key={s} type="button"
                        onClick={() => setNewKeyScopes((prev) => active ? prev.filter((x) => x !== s) : [...prev, s])}
                        className={`text-xs px-2.5 py-1 rounded-full border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <Button onClick={createKey} disabled={creatingKey}><Plus className="w-4 h-4 mr-1" />Create key</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Existing keys</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
                keys.length === 0 ? <p className="text-sm text-muted-foreground">No keys yet.</p> : (
                <div className="space-y-2">
                  {keys.map((k) => (
                    <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-medium text-sm">{k.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{k.key_prefix}…</code>
                          <Badge variant="outline" className="text-[10px]">{k.environment}</Badge>
                          {k.revoked_at && <Badge variant="destructive" className="text-[10px]">revoked</Badge>}
                          {k.scopes.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Created {new Date(k.created_at).toLocaleDateString()} · Last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!k.revoked_at && <Button size="sm" variant="outline" onClick={() => rotateKey(k.id)}><RefreshCw className="w-3.5 h-3.5 mr-1" />Rotate</Button>}
                        {!k.revoked_at && <Button size="sm" variant="outline" onClick={() => revokeKey(k.id)}><ShieldCheck className="w-3.5 h-3.5 mr-1" />Revoke</Button>}
                        <Button size="sm" variant="ghost" onClick={() => deleteKey(k.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add webhook endpoint</CardTitle>
              <CardDescription>FSA will POST signed JSON events to your URL. Verify the <code>X-FSA-Signature</code> header (HMAC-SHA256 of the body using the endpoint secret).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Endpoint URL</Label>
                <Input value={newHookUrl} onChange={(e) => setNewHookUrl(e.target.value)} placeholder="https://api.yoursite.com/webhooks/fsa" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={newHookDesc} onChange={(e) => setNewHookDesc(e.target.value)} placeholder="e.g. Sync new orders into our ERP" />
              </div>
              <div className="md:col-span-2">
                <Label>Events</Label>
                <div className="grid gap-2 mt-2">
                  {EVENT_OPTIONS.map((ev) => {
                    const active = newHookEvents.includes(ev.id);
                    return (
                      <label key={ev.id} className="flex items-start gap-2 cursor-pointer">
                        <Checkbox checked={active} onCheckedChange={(v) => setNewHookEvents((prev) => v ? [...prev, ev.id] : prev.filter((x) => x !== ev.id))} />
                        <div>
                          <p className="text-sm font-medium"><code>{ev.id}</code></p>
                          <p className="text-xs text-muted-foreground">{ev.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <Button onClick={createHook} disabled={creatingHook}><Plus className="w-4 h-4 mr-1" />Create webhook</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Configured endpoints</CardTitle></CardHeader>
            <CardContent>
              {hooks.length === 0 ? <p className="text-sm text-muted-foreground">No webhooks yet.</p> : (
                <div className="space-y-3">
                  {hooks.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-xs flex-1 break-all">{h.url}</p>
                        <Switch checked={h.is_active} onCheckedChange={() => toggleHook(h)} />
                        <Button size="sm" variant="outline" onClick={() => testHook(h.id)}><Send className="w-3.5 h-3.5 mr-1" />Test</Button>
                        <Button size="sm" variant="outline" onClick={() => rotateHook(h.id)}><RefreshCw className="w-3.5 h-3.5 mr-1" />Rotate</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteHook(h.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        {h.events.map((e) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Signing secret:</span>
                        <code className="bg-muted px-2 py-0.5 rounded">{revealSecret[h.id] ? h.secret : `${h.secret.slice(0, 10)}…`}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRevealSecret((p) => ({ ...p, [h.id]: !p[h.id] }))}>
                          {revealSecret[h.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(h.secret, "Secret copied")}><Copy className="w-3 h-3" /></Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Last delivery {h.last_delivery_at ? `${new Date(h.last_delivery_at).toLocaleString()} (HTTP ${h.last_status ?? "—"})` : "never"} · Failures: {h.failure_count}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Webhook deliveries</span>
                <Button size="sm" variant="outline" onClick={processRetries}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />Run retry queue
                </Button>
              </CardTitle>
              <CardDescription>
                Last 100 attempts. Failed deliveries retry with exponential backoff (1m, 5m, 15m, 1h, 6h, 24h) before moving to the dead-letter queue. Use Replay to re-send any past event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                {["all","success","pending_retry","retrying","dead_letter","failed"].map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 rounded-full border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                    {s}
                  </button>
                ))}
                <select value={hookFilter} onChange={(e) => setHookFilter(e.target.value)}
                  className="ml-auto text-xs px-2 py-1 rounded border border-border bg-background">
                  <option value="all">All endpoints</option>
                  {hooks.map((h) => <option key={h.id} value={h.id}>{h.url.slice(0, 48)}</option>)}
                </select>
              </div>
              {deliveries.length === 0 ? <p className="text-sm text-muted-foreground">No deliveries yet.</p> : (
                <div className="space-y-1 text-xs">
                  {deliveries
                    .filter((d) => statusFilter === "all" ? true : (d.status ?? (d.succeeded ? "success" : "failed")) === statusFilter)
                    .filter((d) => hookFilter === "all" ? true : d.webhook_id === hookFilter)
                    .map((d) => {
                      const st = d.status ?? (d.succeeded ? "success" : "failed");
                      const icon = st === "success" ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                        : st === "pending_retry" || st === "retrying" ? <Clock className="w-3 h-3 text-amber-600" />
                        : st === "dead_letter" ? <AlertTriangle className="w-3 h-3 text-destructive" />
                        : <XCircle className="w-3 h-3 text-destructive" />;
                      return (
                        <div key={d.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 py-1.5">
                          {icon}
                          <Badge variant={st === "success" ? "default" : st === "dead_letter" ? "destructive" : "secondary"} className="text-[10px]">{st}</Badge>
                          <Badge variant="outline" className="text-[10px]">HTTP {d.response_status ?? "—"}</Badge>
                          <code className="text-[11px]">{d.event}</code>
                          <span className="text-[10px] text-muted-foreground">try {d.attempt ?? 1}/{d.max_attempts ?? 1}</span>
                          <span className="text-muted-foreground flex-1">{new Date(d.attempted_at).toLocaleString()}</span>
                          <span className="text-muted-foreground">{d.duration_ms ?? 0}ms</span>
                          {d.next_retry_at && (st === "pending_retry" || st === "retrying") && (
                            <span className="text-[10px] text-amber-600">next {new Date(d.next_retry_at).toLocaleTimeString()}</span>
                          )}
                          <Button size="sm" variant="ghost" disabled={replaying === d.id} onClick={() => replayDelivery(d.id)}>
                            <PlayCircle className="w-3.5 h-3.5 mr-1" />Replay
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">End-to-end integration test</CardTitle>
              <CardDescription>
                Paste an API key and (optionally) pick a webhook. We verify the key against the stored hash and POST a signed <code>integration.verify</code> envelope so you can confirm your endpoint accepts it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>API key</Label>
                <Input type="password" value={verifyKey} onChange={(e) => setVerifyKey(e.target.value)} placeholder="fsa_live_…" />
              </div>
              <div>
                <Label>Webhook (optional)</Label>
                <select value={verifyHookId} onChange={(e) => setVerifyHookId(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded border border-border bg-background">
                  <option value="">— key check only —</option>
                  {hooks.map((h) => <option key={h.id} value={h.id}>{h.url}</option>)}
                </select>
              </div>
              <Button onClick={runVerify} disabled={verifying}>
                <ShieldCheck className="w-4 h-4 mr-1" />{verifying ? "Verifying…" : "Run verification"}
              </Button>

              {verifyResult && (
                <div className="rounded-lg border border-border p-3 space-y-2 text-xs">
                  <p className="font-medium text-sm flex items-center gap-2">
                    {verifyResult.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    Overall: {verifyResult.ok ? "passed" : "failed"}
                  </p>
                  <div>
                    <p className="font-medium">API key</p>
                    <pre className="bg-muted p-2 rounded overflow-auto">{JSON.stringify(verifyResult.checks?.api_key, null, 2)}</pre>
                  </div>
                  {verifyResult.checks?.webhook && (
                    <div>
                      <p className="font-medium">Webhook signature round-trip</p>
                      <pre className="bg-muted p-2 rounded overflow-auto">{JSON.stringify(verifyResult.checks.webhook, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your API key</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Store it somewhere safe — we keep only a hash.
            </DialogDescription>
          </DialogHeader>
          {createdKey && (
            <div className="space-y-2">
              <code className="block bg-muted p-3 rounded text-xs break-all">{createdKey.plaintext}</code>
              <Button size="sm" variant="outline" onClick={() => copy(createdKey.plaintext, "Key copied")}><Copy className="w-3.5 h-3.5 mr-1" />Copy key</Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>I've saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgIntegrationsPanel;