import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Key, Plus, Trash2, Eye, EyeOff, Save, X } from "lucide-react";
import PlatformSecretsCard from "./PlatformSecretsCard";
import SecretsManagementCard from "./SecretsManagementCard";
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

interface ApiKey {
  id: string;
  org_id: string;
  provider: string;
  key_name: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
  org_name?: string;
}

interface OrgOption {
  id: string;
  name: string;
}

const PROVIDERS = [
  { value: "stripe", label: "Stripe" },
  { value: "paystack", label: "Paystack" },
  { value: "flutterwave", label: "Flutterwave" },
  { value: "whatchimp", label: "WhatChimp" },
  { value: "termii", label: "Termii" },
  { value: "twilio", label: "Twilio" },
  { value: "other", label: "Other" },
];

const KEY_NAMES: Record<string, string[]> = {
  stripe: ["secret_key", "publishable_key", "webhook_secret"],
  paystack: ["secret_key", "public_key"],
  flutterwave: ["secret_key", "public_key"],
  whatchimp: ["api_key", "whatsapp_number", "webhook_secret"],
  termii: ["api_key", "sender_id", "whatsapp_number"],
  twilio: ["account_sid", "auth_token", "phone_number"],
  other: ["api_key"],
};

const KeysSecretsPanel = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Form state
  const [formOrgId, setFormOrgId] = useState("");
  const [formProvider, setFormProvider] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formKeyValue, setFormKeyValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: keysData }, { data: orgsData }] = await Promise.all([
      supabase.from("org_api_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name").order("name"),
    ]);

    const orgMap = new Map((orgsData || []).map((o: any) => [o.id, o.name]));
    setKeys(
      (keysData || []).map((k: any) => ({ ...k, org_name: orgMap.get(k.org_id) || "Unknown" }))
    );
    setOrgs((orgsData || []).map((o: any) => ({ id: o.id, name: o.name })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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
    if (!formOrgId || !formProvider || !formKeyName || !formKeyValue) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("org_api_keys").upsert(
      { org_id: formOrgId, provider: formProvider, key_name: formKeyName, key_value: formKeyValue },
      { onConflict: "org_id,provider,key_name" }
    );
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save key", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Key saved successfully" });
      setShowForm(false);
      setFormOrgId(""); setFormProvider(""); setFormKeyName(""); setFormKeyValue("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("org_api_keys").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Key deleted" });
      fetchData();
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from("org_api_keys").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* FSA Platform Secrets */}
      <PlatformSecretsCard />

      {/* Secrets Audit / Deployment Readiness */}
      <SecretsManagementCard />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Keys & Secrets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage API keys and payment gateway credentials for organizations.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} className="mr-1" /> Cancel</> : <><Plus size={14} className="mr-1" /> Add Key</>}
        </Button>
      </div>

      {/* Add Key Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl bg-card border border-border p-5 space-y-4"
        >
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <Key size={16} className="text-primary" /> Add API Key
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Organization</Label>
              <Select value={formOrgId} onValueChange={setFormOrgId}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Provider</Label>
              <Select value={formProvider} onValueChange={(v) => { setFormProvider(v); setFormKeyName(""); }}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Key Name</Label>
              <Select value={formKeyName} onValueChange={setFormKeyName} disabled={!formProvider}>
                <SelectTrigger><SelectValue placeholder="Select key type" /></SelectTrigger>
                <SelectContent>
                  {(KEY_NAMES[formProvider] || []).map((k) => (
                    <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Key Value</Label>
              <Input
                type="password"
                placeholder="Enter API key value"
                value={formKeyValue}
                onChange={(e) => setFormKeyValue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1" /> {saving ? "Saving..." : "Save Key"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Keys Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Key size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No API keys configured yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Provider</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Key Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Value</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Active</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{k.org_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                        {k.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{k.key_name.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {visibleKeys.has(k.id) ? k.key_value : maskValue(k.key_value)}
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={k.is_active} onCheckedChange={() => handleToggleActive(k.id, k.is_active)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the <strong>{k.provider}</strong> {k.key_name.replace(/_/g, " ")} for <strong>{k.org_name}</strong>. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(k.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default KeysSecretsPanel;
