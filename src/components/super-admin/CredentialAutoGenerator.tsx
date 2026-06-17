import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Wand2, Copy, Check, ShieldAlert, Loader2, RefreshCw, History, AlertCircle, Clock } from "lucide-react";
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

// Mirrors server-side validator
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _\-.\/]{2,59}$/;
const REVEAL_SECONDS = 90;

interface GeneratedCreds {
  integration_id: string;
  action: "generated" | "rotated";
  superseded_integration_id: string | null;
  api_key: string;
  api_key_prefix: string;
  signing_secret: string;
  hmac_secret_name: string;
  webhook_url: string;
  environment: string;
  notice: string;
}

interface CredentialEvent {
  id: string;
  integration_name: string;
  slug: string;
  environment: string;
  action: string;
  api_key_prefix: string | null;
  hmac_secret_name: string | null;
  actor_email: string | null;
  created_at: string;
}

const CredentialAutoGenerator = ({ onGenerated }: { onGenerated?: () => void }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("external_api");
  const [baseUrl, setBaseUrl] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GeneratedCreds | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [dupCheck, setDupCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [events, setEvents] = useState<CredentialEvent[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS);

  // Live name validation
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(null); setDupCheck("idle"); return; }
    if (!NAME_RE.test(trimmed)) {
      setNameError("3–60 chars. Letters, digits, spaces, dot, dash, underscore, slash. Must start with letter/digit.");
      setDupCheck("idle");
      return;
    }
    setNameError(null);
    setDupCheck("checking");
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("external_integrations")
        .select("id, name, metadata, is_active")
        .eq("is_active", true)
        .filter("metadata->>slug", "eq", slug)
        .filter("metadata->>environment", "eq", environment);
      setDupCheck((data ?? []).length > 0 ? "taken" : "available");
    }, 350);
    return () => clearTimeout(t);
  }, [name, environment]);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("integration_credential_events")
      .select("id, integration_name, slug, environment, action, api_key_prefix, hmac_secret_name, actor_email, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setEvents((data as CredentialEvent[]) ?? []);
  };
  useEffect(() => { loadEvents(); }, []);

  // Reveal countdown
  useEffect(() => {
    if (!result) return;
    setSecondsLeft(REVEAL_SECONDS);
    const i = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(i);
          setResult(null);
          toast({ title: "Credentials cleared", description: "The reveal window expired. Rotate if you need new values." });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [result]);

  const submit = async (action: "generate" | "rotate") => {
    if (nameError) {
      toast({ title: "Fix the name first", description: nameError, variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (action === "generate" && dupCheck === "taken") {
      toast({ title: "Name already in use", description: "Use Rotate to regenerate credentials for this name.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("auto-generate-integration-credentials", {
      body: { action, name: name.trim(), kind, base_url: baseUrl.trim() || null, environment },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: action === "rotate" ? "Rotation failed" : "Generation failed", description: error?.message || data?.error || "Unknown error", variant: "destructive" });
      return;
    }
    setResult(data as GeneratedCreds);
    if (action === "generate") { setName(""); setBaseUrl(""); }
    onGenerated?.();
    loadEvents();
    toast({
      title: action === "rotate" ? "Credentials rotated" : "Credentials generated",
      description: `Reveal expires in ${REVEAL_SECONDS}s — old keys invalidated.`,
    });
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const dupStatus = useMemo(() => {
    if (!name.trim() || nameError) return null;
    if (dupCheck === "checking") return <span className="text-muted-foreground">Checking…</span>;
    if (dupCheck === "available") return <span className="text-emerald-600">Name is available ✓</span>;
    if (dupCheck === "taken") return <span className="text-amber-600">In use — Rotate to regenerate</span>;
    return null;
  }, [dupCheck, name, nameError]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-primary" />
        <h2 className="font-heading font-semibold text-base">Auto-Generate / Rotate Integration Credentials</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter a website or API name. The worker provisions an API key, HMAC signing secret and a
        webhook receiver URL in one click. Only SHA-256 hashes are stored; plaintext is shown once
        for {REVEAL_SECONDS}s, then cleared. Rotating invalidates the previous key, secret and webhook.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Website / API name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Partner CRM, FYSORA Companion PWA" maxLength={60} />
          <div className="text-[11px] min-h-[16px]">
            {nameError ? (
              <span className="text-destructive flex items-center gap-1"><AlertCircle size={11} />{nameError}</span>
            ) : dupStatus}
          </div>
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

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => submit("rotate")} disabled={busy || !!nameError || !name.trim()}>
          {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
          Rotate
        </Button>
        <Button size="sm" variant="hero" onClick={() => submit("generate")} disabled={busy || !!nameError || dupCheck === "taken"}>
          {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Wand2 size={14} className="mr-1" />}
          {busy ? "Working…" : "Generate"}
        </Button>
      </div>

      {/* Audit/event log */}
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <History size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium">Recent credential events</span>
        </div>
        {events.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No events yet.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-[11px] gap-2 px-1 py-1 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${e.action === "rotated" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>{e.action}</span>
                  <span className="font-medium truncate">{e.integration_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{e.environment}</span>
                  {e.api_key_prefix && <span className="font-mono text-muted-foreground">{e.api_key_prefix}…</span>}
                </div>
                <div className="text-muted-foreground whitespace-nowrap">
                  {e.actor_email ?? "—"} · {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-500" />
              One-Time Credential Display
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Clock size={12} /> {result?.notice} Reveal closes in <b>{secondsLeft}s</b>.
            </DialogDescription>
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
                {result.action === "rotated" && (
                  <div className="mt-2 text-amber-700">Previous credentials for this name have been invalidated.</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CredentialAutoGenerator;
