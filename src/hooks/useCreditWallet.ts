import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreditWallet {
  id: string;
  owner_type: string;
  owner_id: string;
  org_id: string | null;
  balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  currency: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_after: number;
  feature_type: string | null;
  session_id: string | null;
  description: string | null;
  expires_at: string | null;
  expired: boolean;
  metadata: any;
  created_at: string;
}

export const useCreditWallet = (orgId: string | undefined) => {
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("credit_wallets")
      .select("*")
      .eq("owner_id", orgId)
      .eq("owner_type", "org")
      .single();
    setWallet(data as CreditWallet | null);

    if (data) {
      const { data: txns } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("wallet_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions((txns as CreditTransaction[]) || []);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const purchaseCredits = async (amount: number) => {
    if (!orgId || !wallet) return;
    const newBalance = wallet.balance + amount;
    await supabase.from("credit_transactions").insert({
      wallet_id: wallet.id,
      type: "purchase",
      amount,
      balance_after: newBalance,
      description: `Purchased ${amount} credits`,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await supabase.from("credit_wallets").update({
      balance: newBalance,
      lifetime_purchased: wallet.lifetime_purchased + amount,
    }).eq("id", wallet.id);
    await fetchWallet();
  };

  const expiringCredits = transactions
    .filter(t => t.type === "purchase" && !t.expired && t.expires_at)
    .filter(t => {
      const exp = new Date(t.expires_at!);
      const daysLeft = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30 && daysLeft > 0;
    });

  return { wallet, transactions, loading, purchaseCredits, expiringCredits, refetch: fetchWallet };
};
