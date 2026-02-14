import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { DollarSign, Building2, TrendingUp, Receipt, Video, UserPlus, ArrowUpRight } from "lucide-react";

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
};

const feeTypeIcons: Record<string, typeof DollarSign> = {
  customer_surcharge: ArrowUpRight,
  org_admin_fee: Receipt,
  registration_fee: UserPlus,
  ai_measurement_platform_share: Video,
  ai_measurement_org_share: Building2,
};

const PlatformRevenuePanel = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("platform_fee_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const ledger = (data as LedgerEntry[]) || [];
      setEntries(ledger);

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
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Aggregate by fee type
  const byType: Record<string, number> = {};
  entries.forEach((e) => {
    byType[e.fee_type] = (byType[e.fee_type] || 0) + Number(e.amount);
  });

  // Platform-owned revenue (fees that go to FASHION STITCHES AFRICA)
  const platformRevenue =
    (byType["customer_surcharge"] || 0) +
    (byType["org_admin_fee"] || 0) +
    (byType["registration_fee"] || 0) +
    (byType["ai_measurement_platform_share"] || 0);

  const totalMeasurementRevenue =
    (byType["ai_measurement_platform_share"] || 0) +
    (byType["ai_measurement_org_share"] || 0);

  // Aggregate by org
  const byOrg: Record<string, Record<string, number>> = {};
  entries.forEach((e) => {
    if (!byOrg[e.org_id]) byOrg[e.org_id] = {};
    byOrg[e.org_id][e.fee_type] = (byOrg[e.org_id][e.fee_type] || 0) + Number(e.amount);
  });

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
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-primary" />
          </div>
          <p className="font-heading font-bold text-2xl">${platformRevenue.toLocaleString()}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Total Platform Revenue</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
            <UserPlus size={18} className="text-secondary" />
          </div>
          <p className="font-heading font-bold text-2xl">${(byType["registration_fee"] || 0).toLocaleString()}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Registration Fees</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
            <Video size={18} className="text-accent" />
          </div>
          <p className="font-heading font-bold text-2xl">${totalMeasurementRevenue.toLocaleString()}</p>
          <p className="text-muted-foreground text-xs mt-0.5">AI Measurement Revenue</p>
          <p className="text-[10px] text-muted-foreground">
            Platform: ${(byType["ai_measurement_platform_share"] || 0).toLocaleString()} · Orgs: ${(byType["ai_measurement_org_share"] || 0).toLocaleString()}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Receipt size={18} className="text-primary" />
          </div>
          <p className="font-heading font-bold text-2xl">
            ${((byType["customer_surcharge"] || 0) + (byType["org_admin_fee"] || 0)).toLocaleString()}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">Order Platform Fees</p>
          <p className="text-[10px] text-muted-foreground">
            Surcharge: ${(byType["customer_surcharge"] || 0).toLocaleString()} · Admin: ${(byType["org_admin_fee"] || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Revenue by Organization */}
      {Object.keys(byOrg).length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-heading font-semibold text-sm">Revenue by Organization</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Reg Fees</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Order Fees</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">AI Meas (Platform)</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">AI Meas (Org)</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byOrg).map(([orgId, fees]) => {
                  const regFees = fees["registration_fee"] || 0;
                  const orderFees = (fees["customer_surcharge"] || 0) + (fees["org_admin_fee"] || 0);
                  const measPlatform = fees["ai_measurement_platform_share"] || 0;
                  const measOrg = fees["ai_measurement_org_share"] || 0;
                  const total = regFees + orderFees + measPlatform + measOrg;
                  return (
                    <tr key={orgId} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-primary" />
                          <span className="text-sm font-medium">{orgNames[orgId] || orgId.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">${regFees.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">${orderFees.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">${measPlatform.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">${measOrg.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">${total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Ledger Entries */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-heading font-semibold text-sm">Recent Transactions</h3>
        </div>
        {entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No fee entries yet. Revenue will appear here as orders and bookings are processed.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.slice(0, 30).map((entry) => {
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
                        {orgNames[entry.org_id] || "Unknown"} · {new Date(entry.created_at).toLocaleDateString()} · {entry.status}
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
    </motion.div>
  );
};

export default PlatformRevenuePanel;
