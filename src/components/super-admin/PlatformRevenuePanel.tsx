import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  DollarSign, Building2, TrendingUp, Receipt, Video, UserPlus,
  ArrowUpRight, Globe, CreditCard, Sparkles, Wallet, Crown, Coins,
  Search, Scissors, Palette, Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

interface MemberInfo {
  user_id: string;
  role: string;
  org_id: string;
  display_name: string;
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
  messaging_sms: "SMS Messaging Fee",
  messaging_whatsapp: "WhatsApp Messaging Fee",
  messaging_email: "Email Messaging Fee",
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
  messaging_sms: Phone,
  messaging_whatsapp: MessageSquare,
  messaging_email: Mail,
};

type RoleFilter = "all" | "tailor" | "designer" | "customer";

const roleFilterConfig: { value: RoleFilter; label: string; icon: typeof Users }[] = [
  { value: "all", label: "All", icon: Users },
  { value: "tailor", label: "Tailors", icon: Scissors },
  { value: "designer", label: "Designers", icon: Palette },
  { value: "customer", label: "Customers", icon: Users },
];

const PlatformRevenuePanel = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
  const [creditPurchaseRevenue, setCreditPurchaseRevenue] = useState(0);
  const [featureAccessRevenue, setFeatureAccessRevenue] = useState(0);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  useEffect(() => {
    const fetchAll = async () => {
      const [ledgerRes, subsRes, creditsRes, featuresRes, membersRes] = await Promise.all([
        supabase
          .from("platform_fee_ledger")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("customer_subscriptions")
          .select("price_amount, price_currency, status")
          .eq("status", "active"),
        supabase
          .from("credit_wallets")
          .select("lifetime_purchased, currency"),
        supabase
          .from("feature_access_requests")
          .select("price_amount, price_currency, status")
          .eq("status", "approved"),
        supabase
          .from("org_members")
          .select("user_id, role, org_id, profiles:user_id(display_name)")
          .in("role", ["tailor", "designer", "customer"])
          .limit(500),
      ]);

      const ledger = (ledgerRes.data as LedgerEntry[]) || [];
      setEntries(ledger);

      const subTotal = (subsRes.data || []).reduce((sum, s) => sum + Number(s.price_amount || 0), 0);
      setSubscriptionRevenue(subTotal);

      const creditTotal = (creditsRes.data || []).reduce((sum, w) => sum + Number(w.lifetime_purchased || 0), 0);
      setCreditPurchaseRevenue(creditTotal);

      const featureTotal = (featuresRes.data || []).reduce((sum, f) => sum + Number(f.price_amount || 0), 0);
      setFeatureAccessRevenue(featureTotal);

      // Process members
      const memberList: MemberInfo[] = (membersRes.data || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        org_id: m.org_id,
        display_name: m.profiles?.display_name || "Unknown",
      }));
      setMembers(memberList);

      // Get unique org IDs and fetch names
      const allOrgIds = [
        ...new Set([...ledger.map((e) => e.org_id), ...memberList.map((m) => m.org_id)]),
      ];
      if (allOrgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", allOrgIds);
        const map: Record<string, string> = {};
        (orgs || []).forEach((o: OrgName) => { map[o.id] = o.name; });
        setOrgNames(map);
      }

      setLoading(false);
    };
    fetchAll();
  }, []);

  // Filter org IDs based on role and search
  const filteredOrgIds = useMemo(() => {
    if (roleFilter === "all" && !searchQuery.trim()) return null; // null = no filter

    let filtered = members;

    if (roleFilter !== "all") {
      filtered = filtered.filter((m) => m.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.display_name.toLowerCase().includes(q) ||
          (orgNames[m.org_id] || "").toLowerCase().includes(q)
      );
    }

    return new Set(filtered.map((m) => m.org_id));
  }, [roleFilter, searchQuery, members, orgNames]);

  const filteredEntries = useMemo(() => {
    if (!filteredOrgIds) return entries;
    return entries.filter((e) => filteredOrgIds.has(e.org_id));
  }, [entries, filteredOrgIds]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Aggregate by fee type from filtered entries
  const byType: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    byType[e.fee_type] = (byType[e.fee_type] || 0) + Number(e.amount);
  });

  const orderFees = (byType["customer_surcharge"] || 0) + (byType["org_admin_fee"] || 0);
  const registrationFees = byType["registration_fee"] || 0;
  const measurementPlatform = byType["ai_measurement_platform_share"] || 0;
  const websiteFees = (byType["website_builder_lite"] || 0) + (byType["website_builder_pro"] || 0);
  const aiServiceFees = (byType["virtual_tryon"] || 0) + (byType["photo_enhancement"] || 0);

  const totalPlatformRevenue =
    orderFees + registrationFees + measurementPlatform +
    websiteFees + (filteredOrgIds ? 0 : subscriptionRevenue) +
    (filteredOrgIds ? 0 : creditPurchaseRevenue) +
    (filteredOrgIds ? 0 : featureAccessRevenue) + aiServiceFees;

  const totalMeasurementRevenue =
    (byType["ai_measurement_platform_share"] || 0) + (byType["ai_measurement_org_share"] || 0);

  // Aggregate by org
  const byOrg: Record<string, Record<string, number>> = {};
  filteredEntries.forEach((e) => {
    if (!byOrg[e.org_id]) byOrg[e.org_id] = {};
    byOrg[e.org_id][e.fee_type] = (byOrg[e.org_id][e.fee_type] || 0) + Number(e.amount);
  });

  // Members matching current filter for the "By Role" tab
  const filteredMembers = members.filter((m) => {
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || m.display_name.toLowerCase().includes(q) || (orgNames[m.org_id] || "").toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const revenueStreams = [
    { label: "Total Platform Revenue", value: totalPlatformRevenue, icon: TrendingUp, color: "bg-primary/10 text-primary" },
    { label: "Order Platform Fees", value: orderFees, icon: Receipt, color: "bg-primary/10 text-primary",
      detail: `Surcharge: $${(byType["customer_surcharge"] || 0).toLocaleString()} · Admin: $${(byType["org_admin_fee"] || 0).toLocaleString()}` },
    { label: "Registration Fees", value: registrationFees, icon: UserPlus, color: "bg-secondary/10 text-secondary" },
    { label: "AI Measurement Revenue", value: totalMeasurementRevenue, icon: Video, color: "bg-accent/10 text-accent",
      detail: `Platform: $${measurementPlatform.toLocaleString()} · Orgs: $${(byType["ai_measurement_org_share"] || 0).toLocaleString()}` },
    { label: "Website Builder Revenue", value: websiteFees, icon: Globe, color: "bg-primary/10 text-primary",
      detail: `Lite: $${(byType["website_builder_lite"] || 0).toLocaleString()} · Pro: $${(byType["website_builder_pro"] || 0).toLocaleString()}` },
    { label: "AI Service Fees", value: aiServiceFees, icon: Sparkles, color: "bg-accent/10 text-accent" },
  ];

  // Only show non-org-filtered revenue streams when no filter is active
  if (!filteredOrgIds) {
    revenueStreams.push(
      { label: "Subscription Revenue", value: subscriptionRevenue, icon: Crown, color: "bg-secondary/10 text-secondary" },
      { label: "Credit Purchases", value: creditPurchaseRevenue, icon: Wallet, color: "bg-accent/10 text-accent" },
      { label: "Feature Access Fees", value: featureAccessRevenue, icon: Sparkles, color: "bg-primary/10 text-primary" },
    );
  }

  const activeFilterLabel = roleFilter !== "all" || searchQuery.trim()
    ? `Showing results for ${roleFilter !== "all" ? roleFilter + "s" : "all roles"}${searchQuery.trim() ? ` matching "${searchQuery}"` : ""}`
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Platform Revenue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All revenue streams for Fashion Stitches Africa across organizations.
        </p>
      </div>

      {/* Search & Role Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {roleFilterConfig.map((rf) => {
            const Icon = rf.icon;
            const isActive = roleFilter === rf.value;
            return (
              <button
                key={rf.value}
                onClick={() => setRoleFilter(rf.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <Icon size={12} />
                {rf.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeFilterLabel && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {activeFilterLabel}
          </Badge>
          <button
            onClick={() => { setRoleFilter("all"); setSearchQuery(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filters
          </button>
        </div>
      )}

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
          <TabsTrigger value="by-role">By Role</TabsTrigger>
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
              {filteredOrgIds ? "No revenue data for the selected filter." : "No organization revenue data yet."}
            </div>
          )}
        </TabsContent>

        {/* Revenue by Role */}
        <TabsContent value="by-role">
          {filteredMembers.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.slice(0, 100).map((m, i) => {
                      const roleIcon = m.role === "tailor" ? Scissors : m.role === "designer" ? Palette : Users;
                      const RoleIcon = roleIcon;
                      return (
                        <tr key={`${m.user_id}-${m.org_id}-${i}`} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-medium">{m.display_name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <RoleIcon size={10} />
                              {m.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {orgNames[m.org_id] || m.org_id.substring(0, 8)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm rounded-xl border border-border">
              No members found for the selected filter.
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
                  const count = filteredEntries.filter((e) => e.fee_type === feeType).length;
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
              {!filteredOrgIds && subscriptionRevenue > 0 && (
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
              {!filteredOrgIds && creditPurchaseRevenue > 0 && (
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
              {!filteredOrgIds && featureAccessRevenue > 0 && (
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
              {Object.keys(byType).length === 0 && (!filteredOrgIds || true) && subscriptionRevenue === 0 && creditPurchaseRevenue === 0 && featureAccessRevenue === 0 && (
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
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {filteredOrgIds ? "No transactions for the selected filter." : "No fee entries yet. Revenue will appear here as orders and bookings are processed."}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEntries.slice(0, 50).map((entry) => {
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
