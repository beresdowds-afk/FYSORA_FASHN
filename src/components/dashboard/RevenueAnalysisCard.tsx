import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ShoppingBag, Video, UserPlus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

interface RevenueSource {
  label: string;
  icon: typeof ShoppingBag;
  amount: number;
  previousAmount: number;
  color: string;
  bgColor: string;
}

interface RevenueAnalysisCardProps {
  orgId: string;
  currency: string;
}

const RevenueAnalysisCard = ({ orgId, currency }: RevenueAnalysisCardProps) => {
  const [sources, setSources] = useState<RevenueSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const fetchRevenue = async () => {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [ordersThis, ordersPrev, bookingsThis, bookingsPrev, regsThis, regsPrev] = await Promise.all([
        supabase.from("payments").select("amount").eq("org_id", orgId).eq("status", "completed").gte("created_at", startOfMonth),
        supabase.from("payments").select("amount").eq("org_id", orgId).eq("status", "completed").gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
        supabase.from("ai_measurement_bookings").select("org_share_amount").eq("org_id", orgId).eq("payment_status", "paid").gte("created_at", startOfMonth),
        supabase.from("ai_measurement_bookings").select("org_share_amount").eq("org_id", orgId).eq("payment_status", "paid").gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
        supabase.from("customer_registrations").select("fee_amount").eq("org_id", orgId).eq("status", "paid").gte("created_at", startOfMonth),
        supabase.from("customer_registrations").select("fee_amount").eq("org_id", orgId).eq("status", "paid").gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
      ]);

      const sumField = (data: any[] | null, field: string) =>
        data?.reduce((sum, row) => sum + (Number(row[field]) || 0), 0) || 0;

      setSources([
        {
          label: "Order Payments",
          icon: ShoppingBag,
          amount: sumField(ordersThis.data, "amount"),
          previousAmount: sumField(ordersPrev.data, "amount"),
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          label: "AI Measurements",
          icon: Video,
          amount: sumField(bookingsThis.data, "org_share_amount"),
          previousAmount: sumField(bookingsPrev.data, "org_share_amount"),
          color: "text-secondary",
          bgColor: "bg-secondary/10",
        },
        {
          label: "Registration Fees",
          icon: UserPlus,
          amount: sumField(regsThis.data, "fee_amount"),
          previousAmount: sumField(regsPrev.data, "fee_amount"),
          color: "text-accent",
          bgColor: "bg-accent/10",
        },
      ]);
      setLoading(false);
    };

    fetchRevenue();
  }, [orgId]);

  const totalRevenue = sources.reduce((s, r) => s + r.amount, 0);
  const totalPrevious = sources.reduce((s, r) => s + r.previousAmount, 0);
  const growthPct = totalPrevious > 0 ? ((totalRevenue - totalPrevious) / totalPrevious) * 100 : totalRevenue > 0 ? 100 : 0;
  const isPositive = growthPct >= 0;

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-card border border-border p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg">Revenue Analysis</h3>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isPositive ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(growthPct).toFixed(1)}% vs last month
        </div>
      </div>

      {/* Total */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1">Total Revenue This Month</p>
        <p className="font-heading font-bold text-3xl">
          {totalRevenue.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{currency}</span>
        </p>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-4">
        {sources.map((source) => {
          const pct = totalRevenue > 0 ? (source.amount / totalRevenue) * 100 : 0;
          const sourceGrowth = source.previousAmount > 0
            ? ((source.amount - source.previousAmount) / source.previousAmount) * 100
            : source.amount > 0 ? 100 : 0;
          const sourcePositive = sourceGrowth >= 0;

          return (
            <div key={source.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${source.bgColor} flex items-center justify-center`}>
                    <source.icon size={14} className={source.color} />
                  </div>
                  <span className="text-sm font-medium">{source.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] flex items-center gap-0.5 ${sourcePositive ? "text-green-600" : "text-destructive"}`}>
                    {sourcePositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(sourceGrowth).toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {source.amount.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 1)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${source.color.replace("text-", "bg-")}/70`}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {pct.toFixed(1)}% of total · Previous: {source.previousAmount.toLocaleString()} {currency}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RevenueAnalysisCard;
