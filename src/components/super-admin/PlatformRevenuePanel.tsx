import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  DollarSign, Building2, TrendingUp, Receipt, Video, UserPlus,
  ArrowUpRight, Globe, CreditCard, Sparkles, Wallet, Crown, Coins
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LedgerEntry {
  id: string;
  org_id: string;
  fee_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  order_id: string | null;
  payment_id: string | null;
}

interface OrgName {
  id: string;
  name: string;
}

const feeTypeLabels: Record<string, string> = {
  customer_surcharge: "Customer Platform Fee (5%)",
  org_admin_fee: "Org Admin Fee (5%)",
  registration_fee: "Registration Fee ($5)",
  ai_measurement_platform_share: "AI Measurement — Platform (40%)",
  ai_measurement_org_share: "AI Measurement — Org (60%)",
  website_builder_lite: "Website Builder — Lite ($10)",
  website_builder_pro: "Website Builder — Pro ($140)",
  subscription_revenue: "Subscription Revenue",
  credit_purchase: "Credit Wallet Purchase",
  feature_access: "Premium Feature Access",
  virtual_tryon: "Virtual Try-On Fee",
  photo_enhancement: "Photo Enhancement Fee",
};

const feeTypeIcons: Record<string, typeof DollarSign> = {
  customer_surcharge: ArrowUpRight,
  org_admin_fee: Receipt,
  registration_fee: UserPlus,
  ai_measurement_platform_share: Video,
  ai_measurement_org_share: Building2,
  website_builder_lite: Globe,
  website_builder_pro: Globe,
  subscription_revenue: Crown,
  credit_purchase: Wallet,
  feature_access: Sparkles,
  virtual_tryon: Sparkles,
  photo_enhancement: Sparkles,
};

const feeCategory = (feeType: string): string => {
  if (feeType.includes("website_builder")) return "website";
  if (feeType.includes("ai_measurement")) return "measurements";
  if (feeType.includes("registration")) return "registration";
  if (feeType === "customer_surcharge" || feeType === "org_admin_fee") return "orders";
  if (feeType === "subscription_revenue") return "subscriptions";
  if (feeType === "credit_purchase") return "credits";
  if (feeType === "feature_access") return "features";
  if (feeType === "virtual_tryon" || feeType === "photo_enhancement") return "ai_services";
  return "other";
};

const PlatformRevenuePanel = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
  const [creditPurchaseRevenue, setCreditPurchaseRevenue] = useState(0);
  const [featureAccessRevenue, setFeatureAccessRevenue] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch all data sources in parallel
      const [ledgerRes, subsRes, creditsRes, featuresRes] = await Promise.all([
        supabase
          .from("platform_fee_ledger")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        // Customer subscriptions (platform revenue)
        supabase
          .from("customer_subscriptions")
          .select("price_amount, price_currency, status")
          .eq("status", "active"),
        // Credit wallet purchases (lifetime_purchased represents total bought)
        supabase
          .from("credit_wallets")
          .select("lifetime_purchased, currency"),
        // Feature access payments
        supabase
          .from("feature_access_requests")
          .select("price_amount, price_currency, status")
          .eq("status", "approved"),
      ]);

      const ledger = (ledgerRes.data as LedgerEntry[]) || [];
      setEntries(ledger);

      // Calculate supplementary revenue
      const subTotal = (subsRes.data || []).reduce((sum, s) => sum + Number(s.price_amount || 0), 0);
      setSubscriptionRevenue(subTotal);

      const creditTotal = (creditsRes.data || []).reduce((sum, w) => sum + Number(w.lifetime_purchased || 0), 0);
      setCreditPurchaseRevenue(creditTotal);

      const featureTotal = (featuresRes.data || []).reduce((sum, f) => sum + Number(f.price_amount || 0), 0);
      setFeatureAccessRevenue(featureTotal);

      // Get unique org IDs and fetch names
      const orgIds = [...new Set(ledger.map((e) => e.org_id))];
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        const map: Record<string, string> = {};
        (orgs || []).forEach((o: OrgName) => { map[o.id] = o.name; });
        setOrgNames(map);
      }

      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Aggregate by fee type from ledger
  const byType: Record<string, number> = {};
  entries.forEach((e) => {
    byType[e.fee_type] = (byType[e.fee_type] || 0) + Number(e.amount);
  });

  // Platform-owned revenue (fees that go to FASHION STITCHES AFRICA)
  const orderFees = (byType["customer_surcharge"] || 0) + (byType["org_admin_fee"] || 0);
  const registrationFees = byType["registration_fee"] || 0;
  const measurementPlatform = byType["ai_measurement_platform_share"] || 0;
  const websiteFees = (byType["website_builder_lite"] || 0) + (byType["website_builder_pro"] || 0);
  const aiServiceFees = (byType["virtual_tryon"] || 0) + (byType["photo_enhancement"] || 0);

  const totalPlatformRevenue =
    orderFees + registrationFees + measurementPlatform +
    websiteFees + subscriptionRevenue + creditPurchaseRevenue +
    featureAccessRevenue + aiServiceFees;

  const totalMeasurementRevenue =
    (byType["ai_measurement_platform_share"] || 0) + (byType["ai_measurement_org_share"] || 0);

  // Aggregate by org
  const byOrg: Record<string, Record<string, number>> = {};
  entries.forEach((e) => {
    if (!byOrg[e.org_id]) byOrg[e.org_id] = {};
    byOrg[e.org_id][e.fee_type] = (byOrg[e.org_id][e.fee_type] || 0) + Number(e.amount);
  });

  // Revenue breakdown for cards
  const revenueStreams = [
    { label: "Total Platform Revenue", value: totalPlatformRevenue, icon: TrendingUp, color: "bg-primary/10 text-primary" },
    { label: "Order Platform Fees", value: orderFees, icon: Receipt, color: "bg-primary/10 text-primary",
      detail: `Surcharge: $${(byType["customer_surcharge"] || 0).toLocaleString()} · Admin: $${(byType["org_admin_fee"] || 0).toLocaleString()}` },
    { label: "Registration Fees", value: registrationFees, icon: UserPlus, color: "bg-secondary/10 text-secondary" },
    { label: "AI Measurement Revenue", value: totalMeasurementRevenue, icon: Video, color: "bg-accent/10 text-accent",
      detail: `Platform: $${measurementPlatform.toLocaleString()} · Orgs: $${(byType["ai_measurement_org_share"] || 0).toLocaleString()}` },
    { label: "Website Builder Revenue", value: websiteFees, icon: Globe, color: "bg-primary/10 text-primary",
      detail: `Lite: $${(byType["website_builder_lite"] || 0).toLocaleString()} · Pro: $${(byType["website_builder_pro"] || 0).toLocaleString()}` },
    { label: "Subscription Revenue", value: subscriptionRevenue, icon: Crown, color: "bg-secondary/10 text-secondary" },
    { label: "Credit Purchases", value: creditPurchaseRevenue, icon: Wallet, color: "bg-accent/10 text-accent" },
    { label: "Feature Access Fees", value: featureAccessRevenue, icon: Sparkles, color: "bg-primary/10 text-primary" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Platform Revenue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All revenue streams for Fashion Stitches Africa across organizations.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueStreams.map((stream) => {
          const Icon = stream.icon;
          return (
            <div key={stream.label} className="p-5 rounded-xl bg-card border border-border">
              <div className={`w-9 h-9 rounded-lg ${stream.color.split(" ")[0]} flex items-center justify-center mb-3`}>
                <Icon size={18} className={stream.color.split(" ")[1]} />
              </div>
              <p className="font-heading font-bold text-2xl">${stream.value.toLocaleString()}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{stream.label}</p>
              {stream.detail && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{stream.detail}</p>
              )}
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="by-org" className="w-full">
        <TabsList>
          <TabsTrigger value="by-org">By Organization</TabsTrigger>
          <TabsTrigger value="by-type">By Revenue Type</TabsTrigger>
          <TabsTrigger value="recent">Recent Transactions</TabsTrigger>
        </TabsList>

        {/* Revenue by Organization */}
        <TabsContent value="by-org">
          {Object.keys(byOrg).length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Reg Fees</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Order Fees</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">AI Meas</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Website</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">AI Services</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byOrg).map(([orgId, fees]) => {
                      const regFees = fees["registration_fee"] || 0;
                      const orgOrderFees = (fees["customer_surcharge"] || 0) + (fees["org_admin_fee"] || 0);
                      const measTotal = (fees["ai_measurement_platform_share"] || 0) + (fees["ai_measurement_org_share"] || 0);
                      const webFees = (fees["website_builder_lite"] || 0) + (fees["website_builder_pro"] || 0);
                      const aiSvc = (fees["virtual_tryon"] || 0) + (fees["photo_enhancement"] || 0);
                      const total = regFees + orgOrderFees + measTotal + webFees + aiSvc;
                      return (
                        <tr key={orgId} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-primary" />
                              <span className="text-sm font-medium">{orgNames[orgId] || orgId.substring(0, 8)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">${regFees.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">${orgOrderFees.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">${measTotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">${webFees.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">${aiSvc.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">${total.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm rounded-xl border border-border">
              No organization revenue data yet.
            </div>
          )}
        </TabsContent>

        {/* Revenue by Type */}
        <TabsContent value="by-type">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {Object.entries(byType)
                .sort(([, a], [, b]) => b - a)
                .map(([feeType, amount]) => {
                  const Icon = feeTypeIcons[feeType] || DollarSign;
                  const count = entries.filter((e) => e.fee_type === feeType).length;
                  return (
                    <div key={feeType} className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                          <Icon size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{feeTypeLabels[feeType] || feeType}</p>
                          <p className="text-xs text-muted-foreground">{count} transactions</p>
                        </div>
                      </div>
                      <p className="font-heading font-bold text-sm">${amount.toLocaleString()}</p>
                    </div>
                  );
                })}
              {/* Non-ledger revenue sources */}
              {subscriptionRevenue > 0 && (
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <Crown size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Customer Subscriptions</p>
                      <p className="text-xs text-muted-foreground">Active subscriptions</p>
                    </div>
                  </div>
                  <p className="font-heading font-bold text-sm">${subscriptionRevenue.toLocaleString()}</p>
                </div>
              )}
              {creditPurchaseRevenue > 0 && (
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <Wallet size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Credit Wallet Purchases</p>
                      <p className="text-xs text-muted-foreground">Lifetime credits purchased</p>
                    </div>
                  </div>
                  <p className="font-heading font-bold text-sm">${creditPurchaseRevenue.toLocaleString()}</p>
                </div>
              )}
              {featureAccessRevenue > 0 && (
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <Sparkles size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Premium Feature Access</p>
                      <p className="text-xs text-muted-foreground">Approved feature requests</p>
                    </div>
                  </div>
                  <p className="font-heading font-bold text-sm">${featureAccessRevenue.toLocaleString()}</p>
                </div>
              )}
              {Object.keys(byType).length === 0 && subscriptionRevenue === 0 && creditPurchaseRevenue === 0 && featureAccessRevenue === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No revenue data yet.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Recent Transactions */}
        <TabsContent value="recent">
          <div className="rounded-xl border border-border overflow-hidden">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No fee entries yet. Revenue will appear here as orders and bookings are processed.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {entries.slice(0, 50).map((entry) => {
                  const Icon = feeTypeIcons[entry.fee_type] || DollarSign;
                  return (
                    <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                          <Icon size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {feeTypeLabels[entry.fee_type] || entry.fee_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {orgNames[entry.org_id] || "Unknown"} · {new Date(entry.created_at).toLocaleDateString()} · {entry.currency} · {entry.status}
                          </p>
                        </div>
                      </div>
                      <p className="font-heading font-bold text-sm">${Number(entry.amount).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default PlatformRevenuePanel;
