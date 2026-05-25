import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Beaker, Loader2, Save, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Provider = "smile_id" | "youverify" | "identitypass";

const PROVIDERS: { value: Provider; label: string; keys: string[]; help: string }[] = [
  { value: "smile_id",    label: "Smile ID",     keys: ["partner_id", "api_key"], help: "Pan-African KYC (NG, KE, ZA, GH, EG…)" },
  { value: "youverify",   label: "YouVerify",    keys: ["api_key"],               help: "Secondary KYC for business + director checks" },
  { value: "identitypass",label: "IdentityPass", keys: ["app_id", "api_key"],     help: "Budget tier (Prembly) for OTP + ID lookups" },
];

interface TestLog {
  id: string;
  provider: string;
  environment: string | null;
  success: boolean;
  status_code: number | null;
  latency_ms: number | null;
  message: string | null;
  created_at: string;
}

const IdentityProviderTester = () => {
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [env, setEnv] = useState<Record<Provider, string>>({
    smile_id: "sandbox", youverify: "sandbox", identitypass: "sandbox",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [logs, setLogs] = useState<TestLog[]>([]);

  const fieldKey = (p: Provider, k: string) => `${p}.${k}`;

  const loadKeys = async () => {
    const { data } = await supabase
      .from("platform_api_keys")
      .select("provider, key_name, key_value")
      .in("provider", ["smile_id", "youverify", "identitypass"]);
    const next: Record<string, string> = {};
    (data || []).forEach((r: any) => { next[fieldKey(r.provider, r.key_name)] = r.key_value; });
    setCreds(next);
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from("verification_provider_test_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setLogs((data as TestLog[]) || []);
  };

  useEffect(() => { loadKeys(); loadLogs(); }, []);

  const saveKey = async (provider: Provider, keyName: string) => {
    const value = creds[fieldKey(provider, keyName)];
    if (!value) { toast({ title: "Enter a value first", variant: "destructive" }); return; }
    setSaving(fieldKey(provider, keyName));
    const { error } = await supabase.from("platform_api_keys").upsert(
      { provider, key_name: keyName, key_value: value, is_active: true },
      { onConflict: "provider,key_name" },
    );
    setSaving(null);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: `${provider} ${keyName} saved` });
  };

  const runTest = async (provider: Provider) => {
    setTesting(provider);
    const { data, error } = await supabase.functions.invoke("test-identity-provider", {
      body: { provider, environment: env[provider] },
    });
    setTesting(null);
    if (error) {
      toast({ title: `${provider} test errored`, description: error.message, variant: "destructive" });
    } else if (data?.success) {
      toast({ title: `${provider} OK`, description: `${data.latency_ms}ms · ${data.message}` });
    } else {
      toast({ title: `${provider} failed`, description: data?.message || "Unknown error", variant: "destructive" });
    }
    loadLogs();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Beaker size={18} className="text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Identity provider credentials &amp; tests</CardTitle>
            <CardDescription className="text-xs">
              Store per-provider keys in <span className="font-mono">platform_api_keys</span> and ping each sandbox/live endpoint.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {PROVIDERS.map((p) => (
          <div key={p.value} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-heading font-semibold text-sm">{p.label}</h4>
                <p className="text-[11px] text-muted-foreground">{p.help}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={env[p.value]} onValueChange={(v) => setEnv({ ...env, [p.value]: v })}>
                  <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="hero"
                  disabled={testing === p.value}
                  onClick={() => runTest(p.value)}
                >
                  {testing === p.value
                    ? <Loader2 size={14} className="mr-1 animate-spin" />
                    : <Beaker size={14} className="mr-1" />}
                  Run identity test
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {p.keys.map((k) => {
                const id = fieldKey(p.value, k);
                return (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs capitalize">{k.replace(/_/g, " ")}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type={visible[id] ? "text" : "password"}
                        placeholder={`Enter ${k}`}
                        value={creds[id] || ""}
                        onChange={(e) => setCreds({ ...creds, [id]: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => setVisible({ ...visible, [id]: !visible[id] })}
                      >
                        {visible[id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        disabled={saving === id}
                        onClick={() => saveKey(p.value, k)}
                      >
                        {saving === id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 text-xs font-semibold">Recent test results</div>
          {logs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              No tests run yet. Use "Run identity test" above.
            </p>
          ) : (
            <div className="divide-y divide-border text-[11px]">
              {logs.map((l) => (
                <div key={l.id} className="px-3 py-2 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 font-mono capitalize">{l.provider.replace(/_/g, " ")}</div>
                  <div className="col-span-1">
                    <Badge variant="outline" className="text-[9px] capitalize">{l.environment}</Badge>
                  </div>
                  <div className="col-span-1">
                    {l.success
                      ? <Badge variant="default" className="text-[9px] gap-1"><CheckCircle2 size={9} /> OK</Badge>
                      : <Badge variant="destructive" className="text-[9px] gap-1"><XCircle size={9} /> Fail</Badge>}
                  </div>
                  <div className="col-span-1 text-muted-foreground">{l.status_code ?? "—"}</div>
                  <div className="col-span-1 text-muted-foreground">{l.latency_ms ?? "—"}ms</div>
                  <div className="col-span-4 text-muted-foreground truncate">{l.message || "—"}</div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IdentityProviderTester;