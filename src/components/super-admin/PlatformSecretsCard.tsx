import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, Eye, EyeOff, Save, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface PlatformKey {
  id: string;
  provider: string;
  key_name: string;
  key_value: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const FSA_PROVIDERS = [
  { value: "paystack", label: "Paystack", icon: "💳" },
  { value: "stripe", label: "Stripe", icon: "💳" },
  { value: "flutterwave", label: "Flutterwave", icon: "💳" },
  { value: "resend", label: "Resend (Email)", icon: "✉️" },
  { value: "termii", label: "Termii (SMS/WhatsApp)", icon: "📱" },
  { value: "twilio", label: "Twilio (VoIP)", icon: "📞" },
  { value: "terminal_africa", label: "Terminal Africa (Logistics)", icon: "🚚" },
  { value: "exchange_rate", label: "Exchange Rate API", icon: "💱" },
  { value: "fashn", label: "FASHN (Virtual Try-On)", icon: "👗" },
  { value: "photoroom", label: "PhotoRoom (Image Enhancement)", icon: "🖼️" },
  { value: "smile_id", label: "Smile ID (KYC Primary)", icon: "🪪" },
  { value: "youverify", label: "YouVerify (KYC Secondary)", icon: "✅" },
  { value: "identitypass", label: "IdentityPass (KYC Budget)", icon: "🆔" },
  { value: "persona", label: "Persona (KYC Global)", icon: "🌐" },
  { value: "sentinel_mcp", label: "Sentinel MCP", icon: "🛡️" },
  { value: "other", label: "Other", icon: "🔑" },
];

const FSA_KEY_NAMES: Record<string, { value: string; label: string }[]> = {
  paystack: [
    { value: "secret_key", label: "Secret Key" },
    { value: "public_key", label: "Public Key" },
    { value: "webhook_secret", label: "Webhook Secret" },
  ],
  stripe: [
    { value: "secret_key", label: "Secret Key" },
    { value: "publishable_key", label: "Publishable Key" },
    { value: "webhook_secret", label: "Webhook Secret" },
  ],
  flutterwave: [
    { value: "secret_key", label: "Secret Key" },
    { value: "public_key", label: "Public Key" },
    { value: "encryption_key", label: "Encryption Key" },
  ],
  resend: [{ value: "api_key", label: "API Key" }],
  termii: [{ value: "api_key", label: "API Key" }],
  twilio: [
    { value: "account_sid", label: "Account SID" },
    { value: "auth_token", label: "Auth Token" },
    { value: "phone_number", label: "Phone Number" },
  ],
  terminal_africa: [{ value: "secret_key", label: "Secret Key" }],
  exchange_rate: [{ value: "api_key", label: "API Key" }],
  fashn: [{ value: "api_key", label: "API Key" }],
  photoroom: [{ value: "api_key", label: "API Key" }],
  smile_id: [
    { value: "partner_id", label: "Partner ID" },
    { value: "api_key", label: "API Key" },
  ],
  youverify: [{ value: "api_key", label: "API Key" }],
  identitypass: [{ value: "api_key", label: "API Key" }],
  persona: [{ value: "api_key", label: "API Key" }],
  sentinel_mcp: [
    { value: "tenant_key", label: "Tenant Key" },
    { value: "api_key", label: "API Key" },
    { value: "server_url", label: "Server URL" },
  ],
  other: [{ value: "api_key", label: "API Key" }],
};

const PlatformSecretsCard = () => {
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const [formProvider, setFormProvider] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formKeyValue, setFormKeyValue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_api_keys")
      .select("*")
      .order("provider")
      .order("key_name");

    if (!error) setKeys((data as PlatformKey[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const maskValue = (val: string) => {
    if (val.length <= 8) return "••••••••";
    return val.slice(0, 4) + "••••••••" + val.slice(-4);
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!formProvider || !formKeyName || !formKeyValue) {
      toast({ title: "Provider, key name and value are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("platform_api_keys").upsert(
      {
        provider: formProvider,
        key_name: formKeyName,
        key_value: formKeyValue,
        description: formDescription || null,
      },
      { onConflict: "provider,key_name" }
    );
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Platform secret saved" });
      setShowForm(false);
      setFormProvider("");
      setFormKeyName("");
      setFormKeyValue("");
      setFormDescription("");
      fetchKeys();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("platform_api_keys").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Secret deleted" });
      fetchKeys();
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from("platform_api_keys").update({ is_active: !current }).eq("id", id);
    fetchKeys();
  };

  const providerLabel = (provider: string) =>
    FSA_PROVIDERS.find((p) => p.value === provider)?.label || provider;

  const providerIcon = (provider: string) =>
    FSA_PROVIDERS.find((p) => p.value === provider)?.icon || "🔑";

  const grouped = keys.reduce<Record<string, PlatformKey[]>>((acc, k) => {
    (acc[k.provider] = acc[k.provider] || []).push(k);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg">FSA Platform Secrets</h2>
            <p className="text-muted-foreground text-xs">
              Global API keys powering payments, messaging, logistics & AI across the platform.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchKeys}>
            <RefreshCw size={14} />
          </Button>
          <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={14} className="mr-1" /> Cancel</> : <><Plus size={14} className="mr-1" /> Add Secret</>}
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-5 border-b border-border bg-muted/30 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Service Provider</Label>
              <Select value={formProvider} onValueChange={(v) => { setFormProvider(v); setFormKeyName(""); }}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {FSA_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Key Type</Label>
              <Select value={formKeyName} onValueChange={setFormKeyName} disabled={!formProvider}>
                <SelectTrigger><SelectValue placeholder="Select key type" /></SelectTrigger>
                <SelectContent>
                  {(FSA_KEY_NAMES[formProvider] || []).map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secret Value</Label>
              <Input
                type="password"
                placeholder="Paste your secret key here"
                value={formKeyValue}
                onChange={(e) => setFormKeyValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                placeholder="e.g. Production key"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1" /> {saving ? "Saving..." : "Save Secret"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Shield size={36} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No platform secrets configured yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Add secrets for payment gateways, messaging, logistics, and AI services.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([provider, providerKeys]) => (
              <div key={provider} className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2 flex items-center gap-2">
                  <span className="text-base">{providerIcon(provider)}</span>
                  <span className="font-heading font-semibold text-sm">{providerLabel(provider)}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {providerKeys.length} key{providerKeys.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="divide-y divide-border">
                  {providerKeys.map((k) => (
                    <div key={k.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">
                            {(FSA_KEY_NAMES[k.provider]?.find((n) => n.value === k.key_name)?.label) || k.key_name.replace(/_/g, " ")}
                          </span>
                          {!k.is_active && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          {visibleKeys.has(k.id) ? k.key_value : maskValue(k.key_value)}
                        </p>
                        {k.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{k.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={k.is_active}
                          onCheckedChange={() => handleToggleActive(k.id, k.is_active)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(k.id)}>
                          {visibleKeys.has(k.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Platform Secret?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the <strong>{providerLabel(k.provider)}</strong> {k.key_name.replace(/_/g, " ")}. Services depending on this key will stop working.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(k.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PlatformSecretsCard;
