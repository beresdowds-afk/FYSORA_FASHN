import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Wand2, Copy, Check, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Kind = "domain" | "external_api" | "companion_pwa" | "webhook_consumer" | "worker";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "external_api", label: "External API" },
  { value: "domain", label: "External Domain / Website" },
  { value: "companion_pwa", label: "FYSORA Companion PWA Backend" },
  { value: "webhook_consumer", label: "Webhook Consumer" },
  { value: "worker", label: "Worker / Background Service" },
];

interface GeneratedCreds {
  integration_id: string;
  api_key: string;
  api_key_prefix: string;
  signing_secret: string;
  hmac_secret_name: string;
  webhook_url: string;
  environment: string;
  notice: string;
}

const CredentialAutoGenerator = ({ onGenerated }: { onGenerated?: () => void }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("external_api");
  const [baseUrl, setBaseUrl] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GeneratedCreds | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", description: "Enter the website or API name", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("auto-generate-integration-credentials", {
      body: { name: name.trim(), kind, base_url: baseUrl.trim() || null, environment },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Generation failed", description: error?.message || data?.error || "Unknown error", variant: "destructive" });
      return;
    }
    setResult(data as GeneratedCreds);
    setName(""); setBaseUrl("");
    onGenerated?.();
    toast({ title: "Credentials generated", description: "Copy them now — they will not be shown again." });
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-primary" />
        <h2 className="font-heading font-semibold text-base">Auto-Generate Shareable Credentials</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter a website or API name. This worker provisions an API key, an HMAC signing secret and a
        webhook receiver URL in one click. Only hashes are stored — plaintext values are shown once.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Website / API name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Partner CRM, FYSORA Companion PWA" maxLength={100} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Environment</Label>
          <Select value={environment} onValueChange={(v) => setEnvironment(v as "live" | "test")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Base URL (optional)</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="hero" onClick={generate} disabled={busy}>
          {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Wand2 size={14} className="mr-1" />}
          {busy ? "Generating…" : "Generate Credentials"}
        </Button>
      </div>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-500" />
              One-Time Credential Display
            </DialogTitle>
            <DialogDescription>{result?.notice}</DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-3">
              {[
                { label: "API Key", value: result.api_key, key: "api_key" },
                { label: "Signing Secret (HMAC)", value: result.signing_secret, key: "signing_secret" },
                { label: "Webhook URL", value: result.webhook_url, key: "webhook_url" },
                { label: "Stored Secret Name", value: result.hmac_secret_name, key: "secret_name" },
              ].map((row) => (
                <div key={row.key} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{row.label}</Label>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => copy(row.key, row.value)}>
                      {copied === row.key ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                      {copied === row.key ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="font-mono text-xs break-all">{row.value}</p>
                </div>
              ))}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
                Share the API Key and Signing Secret with the external system. The Webhook URL is where they
                must POST events, signing the body with HMAC-SHA256 using the signing secret in the
                <code className="font-mono mx-1">x-fysora-signature</code> header.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CredentialAutoGenerator;