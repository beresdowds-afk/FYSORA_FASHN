import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Receipt, ArrowUpRight, ArrowDownLeft, MessageSquare } from "lucide-react";

interface FeeEntry {
  id: string;
  order_id: string | null;
  fee_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const BillingHistory = ({ orgId }: { orgId: string }) => {
  const [fees, setFees] = useState<FeeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      const { data } = await supabase
        .from("platform_fee_ledger")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      setFees((data as FeeEntry[]) || []);
      setLoading(false);
    };
    fetchFees();
  }, [orgId]);

  const totalCustomerFees = fees
    .filter(f => f.fee_type === "customer_surcharge")
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const totalAdminFees = fees
    .filter(f => f.fee_type === "org_admin_fee")
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const totalMessagingFees = fees
    .filter(f => f.fee_type.startsWith("messaging_"))
    .reduce((sum, f) => sum + Number(f.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={16} className="text-secondary" />
            <span className="text-xs text-muted-foreground">Customer Platform Fees (5%)</span>
          </div>
          <p className="font-heading font-bold text-xl">₦{totalCustomerFees.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Collected from customers</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft size={16} className="text-accent" />
            <span className="text-xs text-muted-foreground">Organization Admin Fees (5%)</span>
          </div>
          <p className="font-heading font-bold text-xl">₦{totalAdminFees.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Deducted from revenue</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-emerald-500" />
            <span className="text-xs text-muted-foreground">Messaging Fees</span>
          </div>
          <p className="font-heading font-bold text-xl">${totalMessagingFees.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">SMS, WhatsApp & Email</p>
        </div>
      </div>

      {/* Fee ledger */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Receipt size={16} /> Fee History
          </h3>
        </div>
        {fees.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No billing history yet. Fees will appear here when orders are created.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {fees.map((fee) => (
              <div key={fee.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {fee.fee_type === "customer_surcharge" ? "Customer Platform Fee" :
                     fee.fee_type === "org_admin_fee" ? "Organization Admin Fee" :
                     fee.fee_type === "messaging_sms" ? "SMS Messaging Fee" :
                     fee.fee_type === "messaging_whatsapp" ? "WhatsApp Messaging Fee" :
                     fee.fee_type === "messaging_email" ? "Email Messaging Fee" :
                     fee.fee_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(fee.created_at).toLocaleDateString()} · {fee.status}
                    {fee.fee_type.startsWith("messaging_") && " · Provider cost"}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    fee.fee_type === "customer_surcharge" ? "text-secondary" :
                    fee.fee_type.startsWith("messaging_") ? "text-emerald-500" :
                    "text-accent"
                  }`}>
                    ₦{Number(fee.amount).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fee.currency}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BillingHistory;
