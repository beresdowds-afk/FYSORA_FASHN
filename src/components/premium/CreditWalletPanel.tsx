import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle, CreditCard, RefreshCw } from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useToast } from "@/hooks/use-toast";
import AutoTopupPanel from "./AutoTopupPanel";

interface CreditWalletPanelProps {
  orgId: string;
}

const typeIcons: Record<string, any> = {
  purchase: TrendingUp,
  deduction: TrendingDown,
  refund: RefreshCw,
  expiry: Clock,
  bonus: CreditCard,
};

const typeColors: Record<string, string> = {
  purchase: "text-green-500",
  deduction: "text-red-500",
  refund: "text-blue-500",
  expiry: "text-amber-500",
  bonus: "text-purple-500",
};

const CreditWalletPanel = ({ orgId }: CreditWalletPanelProps) => {
  const { wallet, transactions, loading, purchaseCredits, expiringCredits, refetch } = useCreditWallet(orgId);
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setPurchasing(true);
    await purchaseCredits(val);
    toast({ title: `${val} credits added` });
    setAmount("");
    setPurchasing(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">Balance</span>
          </div>
          <p className="font-heading font-bold text-2xl">${(wallet?.balance || 0).toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Total Purchased</span>
          </div>
          <p className="font-heading font-bold text-2xl">${(wallet?.lifetime_purchased || 0).toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <span className="text-xs text-muted-foreground">Total Used</span>
          </div>
          <p className="font-heading font-bold text-2xl">${(wallet?.lifetime_used || 0).toFixed(2)}</p>
        </Card>
      </div>

      {/* Expiring Credits Warning */}
      {expiringCredits.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm font-medium">Credits Expiring Soon</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {expiringCredits.length} credit purchase(s) expiring within 30 days per FASHN 365-day policy.
          </p>
        </Card>
      )}

      {/* Purchase Credits */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Purchase Credits</h4>
        <div className="flex gap-2">
          <Input type="number" placeholder="Amount (USD)" value={amount} onChange={e => setAmount(e.target.value)} className="max-w-[200px]" />
          <Button onClick={handlePurchase} disabled={purchasing || !amount}>
            <CreditCard size={14} className="mr-1" /> Purchase
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map(v => (
            <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>${v}</Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Credits expire 365 days after purchase per FASHN policy.</p>
      </Card>

      {/* Auto Top-Up */}
      <AutoTopupPanel walletId={wallet?.id} />

      {/* Transaction History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">Transaction History</h3>
          <Button variant="ghost" size="sm" onClick={refetch}><RefreshCw size={14} /></Button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const Icon = typeIcons[tx.type] || CreditCard;
              const color = typeColors[tx.type] || "text-muted-foreground";
              return (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={color} />
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-muted-foreground">Bal: ${tx.balance_after.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CreditWalletPanel;
