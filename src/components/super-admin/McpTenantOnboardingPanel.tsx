import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Key, RefreshCw, Copy, AlertTriangle, Plus, Settings2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DOMAINS = [
  { id: "fashion", label: "Fashion", desc: "FYSORA FASHN (Fashion Stitches Africa)" },
  { id: "rental", label: "Rental", desc: "RentMaikar" },
  { id: "realestate", label: "Real Estate", desc: "Property listings & sales" },
  { id: "hospitality", label: "Hospitality", desc: "Hotels & reservations" },
];

interface Tenant {
  id: string;
  tenant_key: string;
  display_name: string;
  mode: string;
  domains: string[];
  base_url: string | null;
  rate_limit_per_min: number;
  api_key_prefix: string | null;
  is_active: boolean;
  created_at: string;
}

export default function McpTenantOnboardingPanel() {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    tenant_key: "",
    display_name: "",
    mode: "single" as "single" | "multi",
    domains: [] as string[],
    base_url: "",
    rate_limit_per_min: 60,
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["mcp-tenants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcp_tenants" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as unknown as Tenant[];
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: {
          action: "register-tenant",
          ...form,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setNewApiKey(data.api_key);
      setWizardStep(4);
      queryClient.invalidateQueries({ queryKey: ["mcp-tenants"] });
      toast.success(`Tenant "${form.display_name}" registered`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rotateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: { action: "rotate-api-key", tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setNewApiKey(data.api_key);
      setRotatingId(null);
      queryClient.invalidateQueries({ queryKey: ["mcp-tenants"] });
      toast.success("API key rotated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleDomain = (domain: string) => {
    setForm((prev) => ({
      ...prev,
      domains: prev.domains.includes(domain)
        ? prev.domains.filter((d) => d !== domain)
        : [...prev.domains, domain],
    }));
  };

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setNewApiKey(null);
    setForm({
      tenant_key: "",
      display_name: "",
      mode: "single",
      domains: [],
      base_url: "",
      rate_limit_per_min: 60,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              MCP Tenant Management
            </CardTitle>
            <CardDescription>
              Register and manage external clients connecting to Sentinel MCP
            </CardDescription>
          </div>
          <Button onClick={() => setShowWizard(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Register Tenant
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tenants…</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Domains</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.display_name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 rounded">{t.tenant_key}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.mode === "multi" ? "default" : "secondary"}>
                        {t.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {t.domains.map((d) => (
                          <Badge key={d} variant="outline" className="text-xs">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{t.rate_limit_per_min}/min</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "destructive"}>
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRotatingId(t.id);
                            rotateMutation.mutate(t.id);
                          }}
                          disabled={rotateMutation.isPending && rotatingId === t.id}
                          title="Rotate API Key"
                        >
                          <RefreshCw className={`h-4 w-4 ${rotateMutation.isPending && rotatingId === t.id ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API Key reveal dialog */}
      <Dialog open={!!newApiKey && !showWizard} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> New API Key
            </DialogTitle>
            <DialogDescription>
              Copy this key now — it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-3 rounded font-mono text-sm break-all select-all">
            {newApiKey}
          </div>
          <DialogFooter>
            <Button onClick={() => copyToClipboard(newApiKey || "")} variant="outline">
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button onClick={() => setNewApiKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboarding Wizard */}
      <Dialog open={showWizard} onOpenChange={resetWizard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Register New Tenant — Step {wizardStep}/4
            </DialogTitle>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Basic identity for the new MCP client.
              </p>
              <div className="space-y-2">
                <Label>Tenant Key (unique slug)</Label>
                <Input
                  placeholder="e.g. rentmaikar-prod"
                  value={form.tenant_key}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tenant_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="e.g. RentMaikar Production"
                  value={form.display_name}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  placeholder="https://rentmaikar.com"
                  value={form.base_url}
                  onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setWizardStep(2)}
                  disabled={!form.tenant_key || !form.display_name}
                >
                  Next
                </Button>
              </DialogFooter>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose tenancy mode and MCP domains this client can access.
              </p>
              <div className="space-y-2">
                <Label>Tenancy Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => setForm((p) => ({ ...p, mode: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Tenant</SelectItem>
                    <SelectItem value="multi">Multi Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allowed Domains</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={form.domains.includes(d.id)}
                        onCheckedChange={() => toggleDomain(d.id)}
                      />
                      <div>
                        <span className="text-sm font-medium">{d.label}</span>
                        <p className="text-xs text-muted-foreground">{d.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setWizardStep(3)} disabled={form.domains.length === 0}>
                  Next
                </Button>
              </DialogFooter>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review and confirm the tenant registration.
              </p>
              <div className="space-y-2 bg-muted/50 p-4 rounded text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant Key</span>
                  <code>{form.tenant_key}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Display Name</span>
                  <span>{form.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <Badge variant="secondary">{form.mode}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domains</span>
                  <div className="flex gap-1">
                    {form.domains.map((d) => (
                      <Badge key={d} variant="outline">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base URL</span>
                  <span>{form.base_url || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate Limit</span>
                  <span>{form.rate_limit_per_min}/min</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-700 dark:text-amber-400">
                  A unique API key will be generated. Store it securely — it cannot be retrieved after this step.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setWizardStep(2)}>
                  Back
                </Button>
                <Button onClick={() => registerMutation.mutate()} disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Registering…" : "Register Tenant"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {wizardStep === 4 && newApiKey && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                  <Key className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold">Tenant Registered!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Copy the API key below. It will not be shown again.
                </p>
              </div>
              <div className="bg-muted p-3 rounded font-mono text-xs break-all select-all border">
                {newApiKey}
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium">Integration example:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`curl -X POST https://sentinel-mcp.eastforte.org.ng \\
  -H "X-Tenant-Key: ${newApiKey.substring(0, 12)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"event_type":"order.created","org_id":"...","data":{}}'`}
                </pre>
              </div>
              <DialogFooter>
                <Button onClick={() => copyToClipboard(newApiKey)} variant="outline">
                  <Copy className="h-4 w-4 mr-1" /> Copy Key
                </Button>
                <Button onClick={resetWizard}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
