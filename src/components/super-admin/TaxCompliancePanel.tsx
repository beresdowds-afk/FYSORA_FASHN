import { useState } from "react";
import { motion } from "framer-motion";
import {
  useTaxConfig,
  useTaxJurisdictions,
  useNexusTracking,
  useTaxLedger,
  type TaxJurisdiction,
} from "@/hooks/useTaxSystem";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt, Globe, AlertTriangle, CheckCircle,
  BarChart3, Shield, MapPin, FileText, Search,
} from "lucide-react";

/* ─── Helpers ───────────────────────────────────────────────── */

const COUNTRY_FLAGS: Record<string, string> = {
  NG: "🇳🇬", US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪",
  FR: "🇫🇷", KE: "🇰🇪", ZA: "🇿🇦", GH: "🇬🇭", IN: "🇮🇳", AE: "🇦🇪",
  SG: "🇸🇬", JP: "🇯🇵", BR: "🇧🇷", MX: "🇲🇽", IE: "🇮🇪", NL: "🇳🇱",
  SE: "🇸🇪", IT: "🇮🇹", ES: "🇪🇸",
};
const flag = (code: string) => COUNTRY_FLAGS[code] || "🌍";

/* ─── Main Component ────────────────────────────────────────── */

const TaxCompliancePanel = () => {
  const { toast } = useToast();
  const { isLoading: configLoading, regions } = useTaxConfig();
  const { jurisdictions, byCountry, countryCodes, saasApplicable, isLoading: jurLoading, updateJurisdiction } = useTaxJurisdictions();
  const { tracking } = useNexusTracking();
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  });
  const { entries, totalTaxCollected, exemptTotal, byType, isLoading: ledgerLoading } = useTaxLedger(selectedPeriod);
  const [searchJurisdiction, setSearchJurisdiction] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  const isLoading = configLoading || jurLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* Filtered jurisdictions */
  const displayCountries = selectedCountry === "all" ? countryCodes : [selectedCountry];
  const filteredByCountry: Record<string, TaxJurisdiction[]> = {};
  for (const cc of displayCountries) {
    const list = (byCountry[cc] || []).filter(j =>
      !searchJurisdiction ||
      j.jurisdiction_name.toLowerCase().includes(searchJurisdiction.toLowerCase()) ||
      j.jurisdiction_code.toLowerCase().includes(searchJurisdiction.toLowerCase())
    );
    if (list.length) filteredByCountry[cc] = list;
  }

  const handleToggleSaaS = async (j: TaxJurisdiction) => {
    await updateJurisdiction.mutateAsync({ id: j.id, updates: { applies_to_saas: !j.applies_to_saas } });
    toast({ title: `${j.jurisdiction_name} SaaS tax ${!j.applies_to_saas ? "enabled" : "disabled"}` });
  };

  const handleToggleActive = async (j: TaxJurisdiction) => {
    await updateJurisdiction.mutateAsync({ id: j.id, updates: { is_active: !j.is_active } });
  };


  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Receipt size={24} className="text-primary" /> Tax & Compliance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Multi-region tax management — {countryCodes.length} countries, {jurisdictions.length} jurisdictions
        </p>
      </div>

      {/* ── Entity Structure Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.length > 0 ? regions.map(region => (
          <Card key={region.country_code} className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                  {region.flag || flag(region.country_code)}
                </div>
                <div>
                  <CardTitle className="text-sm">{region.country_name} Entity</CardTitle>
                  <CardDescription className="text-xs">{region.entity_name}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Entity Type</span>
                <Badge variant="outline">{region.entity_type}</Badge>
              </div>
              {region.income_tax_rates?.map((r, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{r.label}</span>
                  <Badge variant="outline">{r.rate}</Badge>
                </div>
              ))}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{region.domestic_vat_name} (domestic)</span>
                <Badge variant="outline">{(region.domestic_vat_rate * 100).toFixed(1)}%</Badge>
              </div>
              {region.has_subnational_tax && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sub-national tax</span>
                  <Badge variant="secondary">{(byCountry[region.country_code] || []).length} jurisdictions</Badge>
                </div>
              )}
              {region.export_exempt && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-2">
                  <CheckCircle size={12} />
                  {region.export_exempt_label}
                </div>
              )}
              {region.notes && (
                <div className="mt-2 p-2 rounded-lg bg-primary/5 text-xs text-muted-foreground">
                  💡 {region.notes}
                </div>
              )}
            </CardContent>
          </Card>
        )) : (
          /* Fallback when no regions configured */
          <Card className="col-span-full p-6 text-center">
            <Globe size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No regions configured yet. Add regions via tax configuration.</p>
          </Card>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="jurisdictions" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="jurisdictions" className="text-xs"><MapPin size={12} className="mr-1" /> Jurisdictions</TabsTrigger>
          <TabsTrigger value="nexus" className="text-xs"><AlertTriangle size={12} className="mr-1" /> Nexus Monitor</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs"><FileText size={12} className="mr-1" /> Tax Ledger</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs"><BarChart3 size={12} className="mr-1" /> Reports</TabsTrigger>
        </TabsList>

        {/* ── Jurisdictions Tab ── */}
        <TabsContent value="jurisdictions" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search jurisdictions..."
                value={searchJurisdiction}
                onChange={e => setSearchJurisdiction(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries ({countryCodes.length})</SelectItem>
                {countryCodes.map(cc => (
                  <SelectItem key={cc} value={cc}>
                    {flag(cc)} {cc} ({(byCountry[cc] || []).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">
              {saasApplicable.length} SaaS-applicable
            </Badge>
          </div>

          {Object.entries(filteredByCountry).map(([cc, list]) => (
            <Card key={cc}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{flag(cc)} {cc} Tax Jurisdictions ({list.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Jurisdiction</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Tax Name</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Rate</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">SaaS Taxable</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Threshold</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(j => (
                        <tr key={j.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-3 font-medium">{j.jurisdiction_name}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{j.tax_name}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs capitalize">{j.jurisdiction_type}</Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={j.applies_to_saas ? "default" : "outline"} className="text-xs">
                              {(Number(j.tax_rate) * 100).toFixed(2)}%
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Switch checked={j.applies_to_saas} onCheckedChange={() => handleToggleSaaS(j)} />
                          </td>
                          <td className="py-2 px-3 text-center text-xs text-muted-foreground">
                            {Number(j.nexus_revenue_threshold) > 0
                              ? `$${Number(j.nexus_revenue_threshold).toLocaleString()} / ${j.nexus_transaction_threshold} txns`
                              : "—"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Switch checked={j.is_active} onCheckedChange={() => handleToggleActive(j)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(filteredByCountry).length === 0 && (
            <Card className="p-8 text-center">
              <MapPin size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No jurisdictions match your filter.</p>
            </Card>
          )}
        </TabsContent>

        {/* ── Nexus Monitor Tab ── */}
        <TabsContent value="nexus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-chart-4" /> Economic Nexus Threshold Monitor
              </CardTitle>
              <CardDescription className="text-xs">
                Track revenue and transactions per jurisdiction to identify when nexus thresholds are approaching or exceeded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tracking.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No nexus tracking data yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nexus data will be populated as platform transactions are processed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tracking.map(t => {
                    const jurisdiction = jurisdictions.find(j => j.id === t.jurisdiction_id);
                    const revPct = Number(t.threshold_revenue_pct);
                    const txnPct = Number(t.threshold_transaction_pct);
                    const isWarning = revPct >= 70 || txnPct >= 70;
                    const isDanger = revPct >= 90 || txnPct >= 90;
                    return (
                      <div key={t.id} className={`p-3 rounded-lg border ${isDanger ? "border-destructive/50 bg-destructive/5" : isWarning ? "border-chart-4/50 bg-chart-4/5" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {jurisdiction ? `${flag(jurisdiction.country_code)} ${jurisdiction.jurisdiction_name}` : "Unknown"}
                          </span>
                          <div className="flex items-center gap-2">
                            {t.nexus_triggered ? (
                              <Badge variant="destructive" className="text-xs">Nexus Triggered</Badge>
                            ) : isDanger ? (
                              <Badge variant="destructive" className="text-xs">Near Threshold</Badge>
                            ) : isWarning ? (
                              <Badge className="text-xs bg-chart-4 text-chart-4-foreground">Approaching</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Safe</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Revenue ({revPct.toFixed(0)}%)</p>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isDanger ? "bg-destructive" : isWarning ? "bg-chart-4" : "bg-primary"}`}
                                style={{ width: `${Math.min(revPct, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs mt-1">${Number(t.total_revenue).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Transactions ({txnPct.toFixed(0)}%)</p>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isDanger ? "bg-destructive" : isWarning ? "bg-chart-4" : "bg-primary"}`}
                                style={{ width: `${Math.min(txnPct, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs mt-1">{t.total_transactions} txns</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SaaS-applicable summary grouped by country */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SaaS-Taxable Jurisdictions by Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {countryCodes.map(cc => {
                const applicable = (byCountry[cc] || []).filter(j => j.applies_to_saas && j.is_active);
                if (!applicable.length) return null;
                return (
                  <div key={cc}>
                    <p className="text-xs font-medium mb-1">{flag(cc)} {cc}</p>
                    <div className="flex flex-wrap gap-1">
                      {applicable.map(j => (
                        <Badge key={j.id} variant="secondary" className="text-xs">
                          {j.jurisdiction_name} ({(Number(j.tax_rate) * 100).toFixed(1)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tax Ledger Tab ── */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["2026-Q1", "2026-Q2", "2025-Q4", "2025-Q3"].map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Badge variant="default" className="text-xs">Collected: ${totalTaxCollected.toFixed(2)}</Badge>
              <Badge variant="outline" className="text-xs">Exempt: ${exemptTotal.toFixed(2)}</Badge>
            </div>
          </div>

          {ledgerLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tax entries for {selectedPeriod}.</p>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Taxable</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Rate</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Tax</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Location</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 50).map(e => (
                      <tr key={e.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {e.tax_type.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs">
                          ${Number(e.taxable_amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {e.is_exempt ? "Exempt" : `${(Number(e.tax_rate) * 100).toFixed(1)}%`}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-medium">
                          ${Number(e.tax_amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center text-xs text-muted-foreground">
                          {e.customer_state ? `${e.customer_country}-${e.customer_state}` : e.customer_country || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={e.status === "collected" ? "default" : "outline"} className="text-xs capitalize">
                            {e.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Reports Tab ── */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Per-region report cards */}
            {regions.map(region => {
              const regionJurisdictions = byCountry[region.country_code] || [];
              const saasCount = regionJurisdictions.filter(j => j.applies_to_saas && j.is_active).length;
              return (
                <Card key={region.country_code}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {region.flag || flag(region.country_code)} {region.country_name} Obligations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {region.income_tax_rates?.map((r, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="font-mono font-medium">{r.rate}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{region.domestic_vat_name} (domestic)</span>
                      <span className="font-mono font-medium">{(region.domestic_vat_rate * 100).toFixed(1)}%</span>
                    </div>
                    {region.export_exempt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Export</span>
                        <Badge variant="outline" className="text-xs">Exempt</Badge>
                      </div>
                    )}
                    {region.has_subnational_tax && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SaaS-taxable jurisdictions</span>
                        <span className="font-mono font-medium">{saasCount}</span>
                      </div>
                    )}
                    {region.notes && (
                      <div className="mt-2 p-2 rounded-lg bg-primary/5 text-xs text-muted-foreground">
                        💡 {region.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Period Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  📊 Period Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-mono font-medium">{selectedPeriod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total tax collected</span>
                  <span className="font-mono font-medium text-primary">${totalTaxCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exempt transactions</span>
                  <span className="font-mono font-medium">${exemptTotal.toFixed(2)}</span>
                </div>
                {Object.entries(byType).map(([type, amount]) => (
                  <div key={type} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{type.replace(/_/g, " ")}</span>
                    <span className="font-mono">${amount.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Shield size={16} className="text-primary" />
              <span className="font-medium">Global SaaS Tax Rule:</span>
              <span className="text-muted-foreground">
                Income tax follows where the company is resident. Sales/VAT/GST follows where the customer is located.
              </span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default TaxCompliancePanel;
