import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import {
  Wallet, Receipt, Crown, Coins, CreditCard, CheckCircle2, Clock,
  Banknote, Copy, Loader2, ExternalLink, AlertCircle, Sparkles
} from "lucide-react";

interface DashboardBillingPanelProps {
  roleLabel: string; // "Tailor" or "Designer"
}

const DashboardBillingPanel = ({ roleLabel }: DashboardBillingPanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // DVA state
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [dvaTransactions, setDvaTransactions] = useState<any[]>([]);
  const [creatingDVA, setCreatingDVA] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [
      { data: walletData },
      { data: subData },
      { data: paymentsData },
      { data: banksData },
      { data: transfersData },
    ] = await Promise.all([
      supabase.from("credit_wallets").select("*").eq("owner_id", user.id).eq("owner_type", "user").maybeSingle(),
      supabase.from("customer_subscriptions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("platform_bank_accounts").select("*").eq("is_active", true).order("is_primary", { ascending: false }),
      supabase.from("bank_transfer_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    setWallet(walletData);
    setSubscription(subData);
    setPayments(paymentsData || []);
    const banks = (banksData as any[]) || [];
    setBankAccounts(banks);
    if (banks.length > 0 && !selectedBank) setSelectedBank(banks[0].id);
    setTransfers((transfersData as any[]) || []);
    setLoading(false);
  }, [user, selectedBank]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectedBankDetails = bankAccounts.find((b: any) => b.id === selectedBank);

  const handleTransferSubmit = async () => {
    if (!amount || !transferRef.trim() || !selectedBank || !user) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bank_transfer_payments").insert({
      user_id: user.id,
      amount: parseFloat(amount),
      currency: "NGN",
      purpose,
      transfer_reference: transferRef.trim(),
      bank_name: selectedBankDetails?.bank_name || "",
      account_name: selectedBankDetails?.account_name || "",
      bank_account_id: selectedBank,
      status: "pending",
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Transfer submitted", description: "Your payment will be verified automatically or by an admin." });
      setAmount("");
      setTransferRef("");
      fetchAll();
    }
    setSubmitting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl">Billing & Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your {roleLabel.toLowerCase()} subscription, tokens, and payment history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/payments")}>
          <ExternalLink size={14} className="mr-1" /> Full Portal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Crown size={16} className="text-primary" />
          </div>
          <p className="font-heading font-bold text-lg capitalize">{subscription?.plan_name || "Free"}</p>
          <p className="text-xs text-muted-foreground">Subscription</p>
        </Card>
        <Card className="p-4">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
            <Coins size={16} className="text-secondary" />
          </div>
          <p className="font-heading font-bold text-lg">{wallet?.balance ?? 0}</p>
          <p className="text-xs text-muted-foreground">Token Balance</p>
        </Card>
        <Card className="p-4">
          <div className="w-8 h-8 rounded-lg bg-chart-4/10 flex items-center justify-center mb-2">
            <Receipt size={16} className="text-chart-4" />
          </div>
          <p className="font-heading font-bold text-lg">{payments.filter(p => p.status === "completed").length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
        <Card className="p-4">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
            <Banknote size={16} className="text-accent-foreground" />
          </div>
          <p className="font-heading font-bold text-lg">{transfers.filter(t => t.status === "pending").length}</p>
          <p className="text-xs text-muted-foreground">Pending Transfers</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {subscription && (
            <Card className="p-4 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown size={18} className="text-primary" />
                  <div>
                    <p className="font-heading font-semibold capitalize">{subscription.plan_name} Plan</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.price_currency} {subscription.price_amount}/{subscription.billing_cycle} ·
                      Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary">Active</Badge>
              </div>
            </Card>
          )}

          {!subscription && (
            <Card className="p-5 text-center border-dashed">
              <Crown size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="font-heading font-semibold">No Active Subscription</p>
              <p className="text-xs text-muted-foreground mb-3">
                {roleLabel === "Designer" ? "Subscribe for $15/month" : "Subscribe to access premium features"}
              </p>
              <Button variant="hero" size="sm" onClick={() => navigate("/payments?tab=subscriptions")}>
                View Plans
              </Button>
            </Card>
          )}

          {wallet && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coins size={18} className="text-chart-4" />
                  <div>
                    <p className="font-heading font-semibold">{wallet.balance} Tokens</p>
                    <p className="text-xs text-muted-foreground">
                      Used: {wallet.lifetime_used} · Purchased: {wallet.lifetime_purchased}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/payments?tab=tokens")}>
                  Buy Tokens
                </Button>
              </div>
            </Card>
          )}

          {/* Recent activity */}
          <div>
            <h3 className="font-heading font-semibold text-sm mb-2">Recent Payments</h3>
            {payments.length === 0 && transfers.length === 0 ? (
              <Card className="p-6 text-center">
                <Receipt size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No payment activity yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {[...payments.slice(0, 3).map(p => ({
                  id: p.id, type: "payment" as const,
                  amount: `${p.currency} ${Number(p.amount).toLocaleString()}`,
                  label: p.payment_type?.replace(/_/g, " ") || "Payment",
                  status: p.status, date: p.paid_at || p.created_at,
                })), ...transfers.slice(0, 2).map(t => ({
                  id: t.id, type: "transfer" as const,
                  amount: `NGN ${Number(t.amount).toLocaleString()}`,
                  label: `Bank transfer · ${t.purpose.replace(/_/g, " ")}`,
                  status: t.status, date: t.created_at,
                }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(item => (
                  <Card key={item.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.status === "completed" || item.status === "verified" ? (
                        <CheckCircle2 size={14} className="text-primary shrink-0" />
                      ) : (
                        <Clock size={14} className="text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.amount}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.label} · {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.status === "completed" || item.status === "verified" ? "default" : "secondary"} className="capitalize text-xs">
                      {item.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Bank Transfer */}
        <TabsContent value="bank" className="space-y-4">
          {bankAccounts.length > 1 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Receiving Bank</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {bankAccounts.map((bank: any) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedBank === bank.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-medium">{bank.bank_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{bank.bank_type}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bank Details */}
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <Banknote size={16} className="text-primary" /> Account Details
              </h3>
              {selectedBankDetails ? (
                <div className="space-y-2">
                  {[
                    { label: "Bank", value: selectedBankDetails.bank_name },
                    { label: "Account Number", value: selectedBankDetails.account_number || "Contact admin" },
                    { label: "Account Name", value: selectedBankDetails.account_name },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="font-mono text-sm font-medium">{item.value}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(item.value)}>
                        <Copy size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bank accounts available.</p>
              )}
              <div className="mt-3 p-2.5 rounded-lg bg-chart-4/5 border border-chart-4/20 text-[11px] text-muted-foreground">
                <AlertCircle size={12} className="inline mr-1 text-chart-4" />
                Payments are auto-verified within minutes after submission.
              </div>
            </Card>

            {/* Submit Form */}
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3">Confirm Transfer</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Amount (₦)</label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Purpose</label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscription">Subscription Payment</SelectItem>
                      <SelectItem value="token_purchase">Token Purchase</SelectItem>
                      <SelectItem value="feature_access">Feature Access</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Transfer Reference</label>
                  <Input value={transferRef} onChange={e => setTransferRef(e.target.value)} placeholder="Bank reference / session ID" />
                </div>
                <Button variant="hero" className="w-full" onClick={handleTransferSubmit} disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
                  {submitting ? "Submitting..." : "Submit Confirmation"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Transfer History */}
          {transfers.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-sm mb-2">Transfer History</h3>
              <div className="space-y-2">
                {transfers.slice(0, 5).map((t: any) => (
                  <Card key={t.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">₦{Number(t.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.purpose.replace(/_/g, " ")} · Ref: {t.transfer_reference}
                        {t.auto_verified && <span className="ml-1 text-primary">(Auto)</span>}
                      </p>
                    </div>
                    <Badge
                      variant={t.status === "verified" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}
                      className="capitalize text-xs"
                    >
                      {t.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-semibold">Payment History</h3>
            <Button variant="link" size="sm" onClick={() => navigate("/payments?tab=history")}>
              View All <ExternalLink size={12} className="ml-1" />
            </Button>
          </div>
          {payments.length === 0 ? (
            <Card className="p-8 text-center">
              <Receipt size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 10).map(p => (
                <Card key={p.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {p.status === "completed" ? (
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                    ) : (
                      <Clock size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{p.currency} {Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.payment_type?.replace(/_/g, " ")} · {new Date(p.paid_at || p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize text-xs">
                    {p.status}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default DashboardBillingPanel;
