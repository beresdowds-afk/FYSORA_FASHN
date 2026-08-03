import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Download, FileCode2, Loader2, PackageCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props { orgId: string }

interface InstalledFileMeta { path: string; bytes: number }

interface InstallRow {
  id: string;
  key_prefix: string;
  environment: string;
  target: string;
  status: string;
  error: string | null;
  installed_at: string;
  files: InstalledFileMeta[] | null;
}

interface InstallResult {
  ok: boolean;
  org_name?: string;
  api_key?: string;
  api_secret?: string;
  target?: string;
  files?: InstalledFileMeta[];
  error?: string;
}

const TARGET_LABEL: Record<string, string> = {
  native_website: "Native website",
  github_pages: "Externally hosted site",
  external: "External system",
};

const IntegrationAutoInstaller = ({ orgId }: Props) => {
  const [history, setHistory] = useState<InstallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<InstallResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("org_website_integration_installs")
      .select("id, key_prefix, environment, target, status, error, installed_at, files")
      .eq("org_id", orgId)
      .order("installed_at", { ascending: false })
      .limit(10);
    setHistory((data as unknown as InstallRow[]) ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  const runInstaller = async (environment: "live" | "test") => {
    setInstalling(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("install-org-integration-keys", {
        body: { action: "install", org_id: orgId, environment },
      });
      if (error) throw error;
      const first = (data?.results ?? [])[0] as InstallResult | undefined;
      if (!first?.ok) throw new Error(first?.error ?? "Installation failed");
      setResult(first);
      toast.success("Integration keys generated and installed into your website files.");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInstalling(false);
    }
  };

  const copy = (value: string, label = "Copied") => {
    navigator.clipboard.writeText(value);
    toast.success(label);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PackageCheck className="w-5 h-5" /> Auto installer
        </CardTitle>
        <CardDescription>
          Generates a fresh API key and signing secret, saves them to your organization record, and writes the
          integration config files into your website so it can talk to the platform without manual setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runInstaller("live")} disabled={installing}>
            {installing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Generate &amp; install (live)
          </Button>
          <Button variant="outline" onClick={() => runInstaller("test")} disabled={installing}>
            <RefreshCw className="w-4 h-4 mr-2" /> Install test credentials
          </Button>
        </div>

        {result?.ok && (
          <Alert>
            <AlertTitle>Installed — copy your credentials now</AlertTitle>
            <AlertDescription className="space-y-3 mt-2">
              <div className="space-y-2">
                {[
                  { label: "API key", value: result.api_key ?? "" },
                  { label: "Signing secret", value: result.api_secret ?? "" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-1">{row.value}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(row.value, `${row.label} copied`)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <ul className="text-xs space-y-1">
                {(result.files ?? []).map((f) => (
                  <li key={f.path} className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5" /> {f.path}
                    <span className="text-muted-foreground">({f.bytes} bytes)</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent installations</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No installations yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                  <code className="text-xs">{h.key_prefix}</code>
                  <Badge variant="outline">{h.environment}</Badge>
                  <Badge variant="secondary">{TARGET_LABEL[h.target] ?? h.target}</Badge>
                  <Badge variant={h.status === "installed" ? "default" : h.status === "failed" ? "destructive" : "outline"}>
                    {h.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(h.installed_at).toLocaleString()} · {(h.files ?? []).length} files
                  </span>
                  {h.error && <span className="text-xs text-destructive w-full">{h.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationAutoInstaller;
