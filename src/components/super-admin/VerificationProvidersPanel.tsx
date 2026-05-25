import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Fingerprint, Shield, Globe, TrendingUp, RefreshCw, Settings, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import IdentityProviderTester from "./IdentityProviderTester";

interface ProviderConfig {
  id: string;
  provider: string;
  display_name: string;
  is_active: boolean;
  priority: number;
  supported_countries: string[];
  supported_id_types: string[];
  supported_entity_types: string[];
  cost_per_verification: number;
  monthly_limit: number;
  monthly_used: number;
  created_at: string;
}

interface VerificationAttempt {
  id: string;
  entity_type: string;
  provider: string;
  verification_type: string;
  id_type: string;
  id_number_masked: string;
  country: string;
  status: string;
  confidence_score: number | null;
  cost_usd: number;
  biometrics_used: string[];
  error_message: string | null;
  created_at: string;
}

const PROVIDER_META: Record<string, { icon: string; color: string; tier: string }> = {
  smile_id: { icon: "😊", color: "text-emerald-600", tier: "Primary" },
  youverify: { icon: "✅", color: "text-blue-600", tier: "Secondary" },
  identitypass: { icon: "🪪", color: "text-amber-600", tier: "Budget" },
  persona: { icon: "🌐", color: "text-purple-600", tier: "Global" },
};

const VerificationProvidersPanel = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [attempts, setAttempts] = useState<VerificationAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("providers");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pData }, { data: aData }] = await Promise.all([
      supabase.from("verification_provider_config").select("*").order("priority"),
      supabase.from("identity_verification_attempts").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProviders((pData as ProviderConfig[]) || []);
    setAttempts((aData as VerificationAttempt[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleProvider = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("verification_provider_config")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Provider ${!currentActive ? "enabled" : "disabled"}` });
      fetchData();
    }
  };

  // Stats
  const totalAttempts = attempts.length;
  const verified = attempts.filter(a => a.status === "verified").length;
  const totalCost = attempts.reduce((s, a) => s + (a.cost_usd || 0), 0);
  const successRate = totalAttempts > 0 ? Math.round((verified / totalAttempts) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Fingerprint size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">Identity Verification</h2>
            <p className="text-muted-foreground text-xs">Multi-provider KYC with tiered routing</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData}>
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 size={18} className="mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Total Attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield size={18} className="mx-auto text-secondary mb-1" />
            <p className="text-2xl font-bold">{successRate}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign size={18} className="mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Spend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Globe size={18} className="mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{providers.filter(p => p.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active Providers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers"><Settings size={14} className="mr-1" /> Providers</TabsTrigger>
          <TabsTrigger value="routing"><TrendingUp size={14} className="mr-1" /> Routing</TabsTrigger>
          <TabsTrigger value="history"><BarChart3 size={14} className="mr-1" /> History</TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-3 mt-4">
          {providers.map((p) => {
            const meta = PROVIDER_META[p.provider] || { icon: "🔑", color: "text-foreground", tier: "Custom" };
            const usagePercent = p.monthly_limit > 0 ? Math.round((p.monthly_used / p.monthly_limit) * 100) : 0;
            return (
              <Card key={p.id} className={`transition-all ${p.is_active ? "border-primary/30" : "opacity-60"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold">{p.display_name}</h3>
                          <Badge variant={p.is_active ? "default" : "outline"} className="text-[10px]">
                            {meta.tier}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            Priority: {p.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${p.cost_per_verification.toFixed(2)}/verification • {p.supported_countries.length} countries
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.supported_countries.map(c => (
                            <Badge key={c} variant="outline" className="text-[9px] px-1.5 py-0">
                              {c}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.supported_id_types.slice(0, 5).map(t => (
                            <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">
                              {t.replace(/_/g, " ")}
                            </Badge>
                          ))}
                          {p.supported_id_types.length > 5 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              +{p.supported_id_types.length - 5} more
                            </Badge>
                          )}
                        </div>
                        {/* Usage bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Monthly: {p.monthly_used}/{p.monthly_limit}</span>
                            <span>{usagePercent}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-destructive" : "bg-primary"}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Switch checked={p.is_active} onCheckedChange={() => toggleProvider(p.id, p.is_active)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="rounded-lg bg-muted/40 border border-border p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">⚡ How routing works</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Providers are selected by priority (lowest number first)</li>
              <li>Must support the user's country and ID type</li>
              <li>If no external provider matches, local format validation is used as fallback</li>
              <li>Add API keys via <span className="font-medium">Keys & Secrets</span> panel to activate providers</li>
            </ul>
          </div>

          {/* Per-provider credential inputs + Run identity test */}
          <IdentityProviderTester />
        </TabsContent>

        {/* Routing Matrix Tab */}
        <TabsContent value="routing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Verification Routing Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">User Type</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Phase</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Provider</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Verification Level</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">Customers</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-[9px]">Phase 1</Badge></td>
                      <td className="py-2 px-3">IdentityPass</td>
                      <td className="py-2 px-3">Phone/Email OTP</td>
                      <td className="py-2 px-3">$0.05–$0.10</td>
                    </tr>
                    <tr className="border-b border-border hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">Tailors</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-[9px]">Phase 2</Badge></td>
                      <td className="py-2 px-3">Smile ID</td>
                      <td className="py-2 px-3">Identity + Face Match</td>
                      <td className="py-2 px-3">$0.75–$1.50</td>
                    </tr>
                    <tr className="border-b border-border hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">Organizations</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-[9px]">Phase 3</Badge></td>
                      <td className="py-2 px-3">Smile ID + YouVerify</td>
                      <td className="py-2 px-3">Business + Director KYC</td>
                      <td className="py-2 px-3">$1.50–$3.00</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">Diaspora</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-[9px]">Phase 4</Badge></td>
                      <td className="py-2 px-3">Persona</td>
                      <td className="py-2 px-3">Full KYC</td>
                      <td className="py-2 px-3">$1.00–$3.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cost projection */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Monthly Cost Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">User Type</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Est. Monthly Vol</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Unit Cost</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Monthly Cost</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Annual Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3">Customers</td>
                      <td className="py-2 px-3">5,000</td>
                      <td className="py-2 px-3">$0.10</td>
                      <td className="py-2 px-3">$500</td>
                      <td className="py-2 px-3">$6,000</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3">Tailors</td>
                      <td className="py-2 px-3">500</td>
                      <td className="py-2 px-3">$1.00</td>
                      <td className="py-2 px-3">$500</td>
                      <td className="py-2 px-3">$6,000</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3">Organizations</td>
                      <td className="py-2 px-3">100</td>
                      <td className="py-2 px-3">$2.00</td>
                      <td className="py-2 px-3">$200</td>
                      <td className="py-2 px-3">$2,400</td>
                    </tr>
                    <tr className="font-semibold bg-muted/30">
                      <td className="py-2 px-3">Total</td>
                      <td className="py-2 px-3">5,600</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">$1,200</td>
                      <td className="py-2 px-3">$14,400</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {attempts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Fingerprint size={28} className="mx-auto mb-2 opacity-50" />
                  No verification attempts yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">ID</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Provider</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Country</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                          <td className="py-2 px-3 text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 capitalize">{a.entity_type}</td>
                          <td className="py-2 px-3 font-mono">{a.id_number_masked}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-[9px] capitalize">
                              {a.provider.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">{a.country}</td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={a.status === "verified" ? "default" : "destructive"}
                              className="text-[9px]"
                            >
                              {a.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">${a.cost_usd.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default VerificationProvidersPanel;
