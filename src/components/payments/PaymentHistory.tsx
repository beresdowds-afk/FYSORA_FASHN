import { usePayments } from "@/hooks/usePayments";
import { Clock, CreditCard, Banknote, Smartphone, Wallet } from "lucide-react";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import { motion } from "framer-motion";

const methodIcons: Record<string, any> = {
  bank_transfer: Banknote,
  cash: Wallet,
  card: CreditCard,
  mobile_money: Smartphone,
  other: CreditCard,
};

const methodLabels: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
  other: "Other",
};

const typeLabels: Record<string, string> = {
  deposit: "Deposit",
  partial: "Partial",
  full: "Full Payment",
};

interface PaymentHistoryProps {
  orgId: string;
  orderId: string;
  currency: string;
}

const PaymentHistory = ({ orgId, orderId, currency }: PaymentHistoryProps) => {
  const { payments, loading } = usePayments(orgId, orderId);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {payments.map((payment, i) => {
        const Icon = methodIcons[payment.payment_method || "other"] || CreditCard;
        return (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <Icon size={14} className="text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  <CurrencyDisplay amount={Number(payment.amount)} currency={currency} />
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  payment.status === "completed"
                    ? "bg-secondary/15 text-secondary"
                    : payment.status === "pending"
                    ? "bg-primary/15 text-primary"
                    : "bg-destructive/15 text-destructive"
                }`}>
                  {payment.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{typeLabels[payment.payment_type] || payment.payment_type}</span>
                <span>·</span>
                <span>{methodLabels[payment.payment_method || "other"] || payment.payment_method}</span>
              </div>
              {payment.notes && (
                <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Clock size={10} />
                {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : new Date(payment.created_at).toLocaleString()}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PaymentHistory;
