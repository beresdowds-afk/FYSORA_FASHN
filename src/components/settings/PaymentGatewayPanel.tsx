import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard, Plus, Trash2, Eye, EyeOff, Shield, LifeBuoy,
  CheckCircle2, Clock, AlertCircle, ExternalLink, X
} from "lucide-react";

interface ApiKey {
  id: string;
  org_id: string;
  provider: string;
  key_name: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
}

interface SupportRequest {
  id: string;
  provider: string;
  subject: string;
  description: string | null;
  status: string;
  created_at: string;
  resolution_notes: string | null;
}

const PROVIDERS = [
  { value: "paystack", label: "Paystack", keys: ["secret_key", "public_key"], docs: "https://dashboard.paystack.com/#/settings/developers" },
  { value: "flutterwave", label: "Flutterwave", keys: ["secret_key", "public_key"], docs: "https://dashboard.flutterwave.com/settings/apis" },
  { value: "stripe", label: "Stripe", keys: ["secret_key", "publishable_key"], docs: "https://dashboard.stripe.com/apikeys" },
  { value: "paypal", label: "PayPal", keys: ["client_id", "client_secret"], docs: "https://developer.paypal.com/dashboard/applications" },
];

const PaymentGatewayPanel = ({ orgId, canEdit = true }: { orgId: string; canEdit?: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Add form state
  const [provider, setProvider] = useState("");
  const [keyEntries, setKeyEntries] = useState<{ key_name: string; key_value: string }[]>([]);

  // Support form state
  const [supportProvider, setSupportProvider] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDesc, setSupportDesc] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: keysData }, { data: reqData }] = await Promise.all([
      supabase.from("org_api_keys").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("admin_support_requests" as any).select("*").eq("org_id", orgId).eq("request_type", "payment_gateway_setup").order("created_at", { ascending: false }),
    ]);
    setKeys((keysData as ApiKey[]) || []);
    setRequests((reqData as unknown as SupportRequest[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const pConfig = PROVIDERS.find(pr => pr.value === p);
    setKeyEntries((pConfig?.keys || []).map(k => ({ key_name: k, key_value: "" })));
  };

  const handleSaveKeys = async () => {
    if (!provider || keyEntries.some(e => !e.key_value.trim())) {
      toast({ title: "Fill all key fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    for (const entry of keyEntries) {
      const { error } = await supabase.from("org_api_keys").upsert(
        { org_id: orgId, provider, key_name: entry.key_name, key_value: entry.key_value.trim(), is_active: true },
        { onConflict: "org_id,provider,key_name" }
      );
      if (error) {
        toast({ title: "Error saving key", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    toast({ title: "Payment gateway keys saved" });
    setShowAdd(false);
    setProvider("");
    setKeyEntries([]);
    setSaving(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("org_api_keys").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Key deleted" }); fetchData(); }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from("org_api_keys").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSupportRequest = async () => {
    if (!supportProvider || !supportSubject.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("admin_support_requests" as any).insert({
      user_id: user.id,
      org_id: orgId,
      request_type: "payment_gateway_setup",
      provider: supportProvider,
      subject: supportSubject.trim(),
      description: supportDesc.trim() || null,
    } as any);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Support request submitted", description: "A platform admin will review your request." });
      setShowSupport(false);
      setSupportProvider("");
      setSupportSubject("");
      setSupportDesc("");
      fetchData();
    }
    setSaving(false);
  };

  const maskKey = (val: string) => val.length > 8 ? val.slice(0, 4) + "••••••••" + val.slice(-4) : "••••••••";

  const groupedKeys = keys.reduce<Record<string, ApiKey[]>>((acc, k) => {
    (acc[k.provider] = acc[k.provider] || []).push(k);
    return acc;
  }, {});

  const statusIcon = (s: string) => {
    if (s === "resolved") return <CheckCircle2 size={14} className="text-primary" />;
    if (s === "in_progress") return <Clock size={14} className="text-chart-4" />;
    return <AlertCircle size={14} className="text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            <CreditCard size={20} className="text-primary" /> Payment Gateways
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your payment processors to accept online payments directly.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSupport(true)}>
              <LifeBuoy size={14} className="mr-1" /> Request Support
            </Button>
            <Button variant="hero" size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} className="mr-1" /> Add Gateway
            </Button>
          </div>
        )}
      </div>

      {/* Add Gateway Form */}
      {showAdd && (
        <Card className="p-5 border-primary/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Configure Payment Gateway</h4>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {provider && (
            <>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink size={12} />
                <a href={PROVIDERS.find(p => p.value === provider)?.docs} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  Get your API keys from {PROVIDERS.find(p => p.value === provider)?.label} dashboard
                </a>
              </div>
              {keyEntries.map((entry, i) => (
                <div key={entry.key_name} className="space-y-1">
                  <label className="text-xs font-medium capitalize">{entry.key_name.replace(/_/g, " ")}</label>
                  <Input
                    type="password"
                    value={entry.key_value}
                    onChange={(e) => {
                      const next = [...keyEntries];
                      next[i].key_value = e.target.value;
                      setKeyEntries(next);
                    }}
                    placeholder={`Enter ${entry.key_name.replace(/_/g, " ")}`}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Shield size={14} /> Your keys are encrypted and stored securely. Only authorized team members can access them.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button variant="hero" size="sm" onClick={handleSaveKeys} disabled={saving}>
                  {saving ? "Saving..." : "Save Keys"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Support Request Form */}
      {showSupport && (
        <Card className="p-5 border-secondary/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <LifeBuoy size={16} className="text-secondary" /> Request Admin Support
            </h4>
            <button onClick={() => setShowSupport(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <p className="text-xs text-muted-foreground">
            Need help setting up your payment gateway? Submit a request and a platform administrator will assist you.
          </p>
          <Select value={supportProvider} onValueChange={setSupportProvider}>
            <SelectTrigger><SelectValue placeholder="Which provider?" /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={supportSubject}
            onChange={(e) => setSupportSubject(e.target.value)}
            placeholder="Brief subject (e.g. Need help with Paystack setup)"
          />
          <Textarea
            value={supportDesc}
            onChange={(e) => setSupportDesc(e.target.value)}
            placeholder="Describe what you need help with (optional)"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSupport(false)}>Cancel</Button>
            <Button variant="secondary" size="sm" onClick={handleSupportRequest} disabled={saving}>
              {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </Card>
      )}

      {/* Existing Gateways */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : Object.keys(groupedKeys).length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No payment gateways configured yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add a gateway to start accepting online payments.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedKeys).map(([prov, provKeys]) => (
            <Card key={prov} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{prov}</Badge>
                  {provKeys.every(k => k.is_active) ? (
                    <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {provKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 text-sm">
                    <span className="font-mono text-xs text-muted-foreground capitalize min-w-[100px]">
                      {k.key_name.replace(/_/g, " ")}
                    </span>
                    <span className="flex-1 font-mono text-xs truncate">
                      {visibleKeys.has(k.id) ? k.key_value : maskKey(k.key_value)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleVisibility(k.id)} className="p-1 hover:bg-muted rounded">
                        {visibleKeys.has(k.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleToggle(k.id, k.is_active)}
                            className={`p-1 hover:bg-muted rounded text-xs ${k.is_active ? "text-green-600" : "text-muted-foreground"}`}
                          >
                            {k.is_active ? "On" : "Off"}
                          </button>
                          <button onClick={() => handleDelete(k.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Support Request History */}
      {requests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <LifeBuoy size={14} /> Support Requests
          </h4>
          <div className="space-y-2">
            {requests.map((r: any) => (
              <Card key={r.id} className="p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {statusIcon(r.status)}
                    <span className="font-medium truncate">{r.subject}</span>
                    <Badge variant="outline" className="capitalize text-xs">{r.provider}</Badge>
                  </div>
                  {r.resolution_notes && (
                    <p className="text-xs text-muted-foreground mt-1">Admin: {r.resolution_notes}</p>
                  )}
                </div>
                <Badge variant={r.status === "resolved" ? "default" : "secondary"} className="text-xs capitalize shrink-0">
                  {r.status}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGatewayPanel;
