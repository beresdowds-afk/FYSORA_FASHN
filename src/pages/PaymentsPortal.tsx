import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import {
  CreditCard, Wallet, Clock, CheckCircle2, AlertCircle, ArrowLeft,
  Coins, Receipt, Crown, Download, Banknote, Building2, Copy,
  ExternalLink, Loader2, ShoppingBag, Sparkles
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────
interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  order_id: string;
  org_id: string;
  org_name?: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  price_amount: number;
  price_currency: string;
  billing_cycle: string;
  current_period_end: string;
}

interface TokenPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price_amount: number;
  price_currency: string;
  bonus_credits: number;
}

interface TokenPurchase {
  id: string;
  credits_purchased: number;
  amount_paid: number;
  currency: string;
  payment_gateway: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface WalletData {
  id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  currency: string;
}

// Bank details are now fetched dynamically from platform_bank_accounts

// ── Main Page ────────────────────────────────────────────────────────────
const PaymentsPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [purchases, setPurchases] = useState<TokenPurchase[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [featureRequests, setFeatureRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [
      { data: paymentsData },
      { data: subData },
      { data: walletData },
      { data: pkgData },
      { data: purchData },
      { data: regData },
      { data: featData },
    ] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("customer_subscriptions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("credit_wallets").select("*").eq("owner_id", user.id).eq("owner_type", "user").maybeSingle(),
      supabase.from("token_packages" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("token_purchases" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("customer_registrations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("feature_access_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    // Enrich payments with org names
    const orgIds = [...new Set((paymentsData || []).map((p: any) => p.org_id).filter(Boolean))];
    let orgMap: Record<string, string> = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await (supabase.from("organizations_public" as any).select("id, name").in("id", orgIds) as any);
      orgMap = Object.fromEntries((orgs || []).map((o: any) => [o.id, o.name]));
    }

    setPayments((paymentsData || []).map((p: any) => ({ ...p, org_name: orgMap[p.org_id] || "Unknown" })));
    setSubscription(subData as Subscription | null);
    setWallet(walletData as WalletData | null);
    setPackages((pkgData as unknown as TokenPackage[]) || []);
    setPurchases((purchData as unknown as TokenPurchase[]) || []);
    setRegistrations(regData || []);
    setFeatureRequests(featData || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSpent = payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const completedPayments = payments.filter(p => p.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
            </Button>
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              <span className="font-heading font-bold text-lg">Payments & Billing</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/portal")}>
              <ShoppingBag size={14} className="mr-1" /> Portal
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <Building2 size={14} className="mr-1" /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-6 max-w-6xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet size={16} className="text-primary" />
              </div>
            </div>
            <p className="font-heading font-bold text-xl">{wallet?.balance ?? 0}</p>
            <p className="text-xs text-muted-foreground">Token Balance</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Receipt size={16} className="text-secondary" />
              </div>
            </div>
            <p className="font-heading font-bold text-xl">{completedPayments}</p>
            <p className="text-xs text-muted-foreground">Completed Payments</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Crown size={16} className="text-accent-foreground" />
              </div>
            </div>
            <p className="font-heading font-bold text-xl capitalize">{subscription?.plan_name || "Free"}</p>
            <p className="text-xs text-muted-foreground">Subscription</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Coins size={16} className="text-chart-4" />
              </div>
            </div>
            <p className="font-heading font-bold text-xl">{wallet?.lifetime_purchased ?? 0}</p>
            <p className="text-xs text-muted-foreground">Lifetime Tokens</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Buy Tokens</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="dva">Pay via Transfer</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <OverviewTab
              payments={payments}
              subscription={subscription}
              wallet={wallet}
              registrations={registrations}
              featureRequests={featureRequests}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          {/* Buy Tokens */}
          <TabsContent value="tokens">
            <TokenShopTab packages={packages} purchases={purchases} userId={user?.id || ""} onRefresh={fetchAll} />
          </TabsContent>

          {/* Payment History */}
          <TabsContent value="history">
            <PaymentHistoryTab payments={payments} />
          </TabsContent>

          {/* Subscriptions */}
          <TabsContent value="subscriptions">
            <SubscriptionsTab
              subscription={subscription}
              featureRequests={featureRequests}
              registrations={registrations}
            />
          </TabsContent>

          {/* DVA Pay via Transfer */}
          <TabsContent value="dva">
            <DVATransferTab userId={user?.id || ""} onRefresh={fetchAll} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ── Overview Tab ─────────────────────────────────────────────────────────
const OverviewTab = ({
  payments, subscription, wallet, registrations, featureRequests, onNavigate
}: {
  payments: PaymentRecord[];
  subscription: Subscription | null;
  wallet: WalletData | null;
  registrations: any[];
  featureRequests: any[];
  onNavigate: (tab: string) => void;
}) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    {/* Active Subscription */}
    {subscription && (
      <Card className="p-5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-primary" />
            <div>
              <p className="font-heading font-bold capitalize">{subscription.plan_name} Plan</p>
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

    {/* Token Balance */}
    {wallet && (
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coins size={20} className="text-chart-4" />
            <div>
              <p className="font-heading font-bold">{wallet.balance} Tokens</p>
              <p className="text-xs text-muted-foreground">
                Used: {wallet.lifetime_used} · Purchased: {wallet.lifetime_purchased}
              </p>
            </div>
          </div>
          <Button variant="hero" size="sm" onClick={() => onNavigate("tokens")}>
            <Coins size={14} className="mr-1" /> Buy More
          </Button>
        </div>
      </Card>
    )}

    {/* Recent Payments */}
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold">Recent Payments</h3>
        <Button variant="link" size="sm" onClick={() => onNavigate("history")}>View All</Button>
      </div>
      {payments.length === 0 ? (
        <Card className="p-6 text-center">
          <Receipt size={28} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No payment history yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.slice(0, 5).map(p => (
            <Card key={p.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p.status === "completed" ? (
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                ) : (
                  <Clock size={16} className="text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.org_name} · {p.payment_type} · {new Date(p.paid_at || p.created_at).toLocaleDateString()}
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
    </div>

    {/* Feature Access Requests */}
    {featureRequests.length > 0 && (
      <div>
        <h3 className="font-heading font-semibold mb-3">Feature Access</h3>
        <div className="space-y-2">
          {featureRequests.slice(0, 3).map((f: any) => (
            <Card key={f.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-chart-4" />
                <span className="text-sm">{f.feature_name}</span>
              </div>
              <Badge variant={f.status === "approved" ? "default" : "outline"} className="capitalize text-xs">
                {f.status}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

// ── Token Shop Tab ───────────────────────────────────────────────────────
const TokenShopTab = ({
  packages, purchases, userId, onRefresh,
}: {
  packages: TokenPackage[];
  purchases: TokenPurchase[];
  userId: string;
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [gateway, setGateway] = useState("paystack");

  const handlePurchase = async (pkg: TokenPackage) => {
    setPurchasing(pkg.id);
    const totalCredits = pkg.credits + pkg.bonus_credits;

    // Create purchase record
    const { data: purchase, error } = await supabase
      .from("token_purchases" as any)
      .insert({
        user_id: userId,
        package_id: pkg.id,
        credits_purchased: totalCredits,
        amount_paid: pkg.price_amount,
        currency: pkg.price_currency,
        payment_gateway: gateway,
        status: "pending",
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setPurchasing(null);
      return;
    }

    toast({
      title: "Purchase initiated",
      description: `${totalCredits} tokens for ${pkg.price_currency} ${pkg.price_amount}. Complete payment via ${gateway}.`,
    });
    setPurchasing(null);
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl mb-1">Buy Tokens</h2>
        <p className="text-sm text-muted-foreground">
          Tokens power AI features like measurements, virtual try-on, and image enhancement.
        </p>
      </div>

      {/* Gateway Selection */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Pay via:</span>
        <Select value={gateway} onValueChange={setGateway}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paystack">Paystack</SelectItem>
            <SelectItem value="flutterwave">Flutterwave</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer (₦)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg, i) => {
          const isPopular = i === 2;
          return (
            <Card
              key={pkg.id}
              className={`p-5 relative ${isPopular ? "border-primary ring-1 ring-primary/20" : ""}`}
            >
              {isPopular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                  Best Value
                </Badge>
              )}
              <h3 className="font-heading font-bold text-lg">{pkg.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>

              <div className="mt-4">
                <span className="font-heading font-bold text-2xl">
                  ${pkg.price_amount}
                </span>
                <span className="text-sm text-muted-foreground"> {pkg.price_currency}</span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Coins size={14} className="text-primary" />
                  <span>{pkg.credits} tokens</span>
                </div>
                {pkg.bonus_credits > 0 && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles size={14} />
                    <span>+{pkg.bonus_credits} bonus!</span>
                  </div>
                )}
              </div>

              <Button
                variant={isPopular ? "hero" : "outline"}
                className="w-full mt-4"
                onClick={() => handlePurchase(pkg)}
                disabled={purchasing === pkg.id}
              >
                {purchasing === pkg.id ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : (
                  <CreditCard size={14} className="mr-1" />
                )}
                Buy Now
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Purchase History */}
      {purchases.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold mb-3">Purchase History</h3>
          <div className="space-y-2">
            {purchases.map((p: any) => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.credits_purchased} tokens</p>
                  <p className="text-xs text-muted-foreground">
                    {p.currency} {Number(p.amount_paid).toLocaleString()} via {p.payment_gateway} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize text-xs">
                  {p.status}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── Payment History Tab ──────────────────────────────────────────────────
const PaymentHistoryTab = ({ payments }: { payments: PaymentRecord[] }) => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Payment History</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Receipt size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No payments found.</p>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Organization</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-right px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.paid_at || p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{p.org_name}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_type}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}
                      className="capitalize text-xs"
                    >
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

// ── Subscriptions Tab ────────────────────────────────────────────────────
const SubscriptionsTab = ({
  subscription, featureRequests, registrations,
}: {
  subscription: Subscription | null;
  featureRequests: any[];
  registrations: any[];
}) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <h2 className="font-heading font-bold text-xl">Subscriptions & Access</h2>

    {/* Active Subscription */}
    <Card className="p-6">
      <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
        <Crown size={18} className="text-primary" /> Current Plan
      </h3>
      {subscription ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold capitalize text-lg">{subscription.plan_name}</p>
              <p className="text-sm text-muted-foreground">
                {subscription.price_currency} {subscription.price_amount} / {subscription.billing_cycle}
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary">Active</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Current period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Crown size={28} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active subscription.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Subscribe to Premium for $10/year to unlock AI features.
          </p>
        </div>
      )}
    </Card>

    {/* Registration Payments */}
    {registrations.length > 0 && (
      <Card className="p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-secondary" /> Organization Registrations
        </h3>
        <div className="space-y-2">
          {registrations.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">
                  {r.fee_currency} {Number(r.fee_amount).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()} · {r.payment_gateway || "N/A"}
                </p>
              </div>
              <Badge variant={r.status === "paid" ? "default" : "secondary"} className="capitalize text-xs">
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    )}

    {/* Feature Access */}
    {featureRequests.length > 0 && (
      <Card className="p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-chart-4" /> Feature Access Requests
        </h3>
        <div className="space-y-2">
          {featureRequests.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{f.feature_name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.price_currency} {Number(f.price_amount).toLocaleString()} · {f.billing_type}
                </p>
              </div>
              <Badge variant={f.status === "approved" ? "default" : f.status === "rejected" ? "destructive" : "secondary"} className="capitalize text-xs">
                {f.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    )}
  </motion.div>
);

// ── DVA Transfer Tab ─────────────────────────────────────────────────────
const DVATransferTab = ({ userId, onRefresh }: { userId: string; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [vaRes, txRes] = await Promise.all([
        supabase
          .from("paystack_virtual_accounts")
          .select("*")
          .eq("user_id", userId)
          .eq("account_type", "dedicated")
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("paystack_dva_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setVirtualAccount(vaRes.data);
      setTransactions((txRes.data as any[]) || []);
      setLoading(false);
    };
    fetchData();

    // Realtime subscription for new transactions
    const channel = supabase
      .channel("dva-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "paystack_dva_transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          setTransactions(prev => [payload.new as any, ...prev]);
          toast({ title: "Payment received!", description: `₦${Number(payload.new.amount).toLocaleString()} credited to your account.` });
          onRefresh();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, onRefresh, toast]);

  const createDVA = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-dva", {
        body: { account_type: "dedicated", purpose: "general" },
      });
      if (error) throw error;
      if (data?.virtual_account) {
        setVirtualAccount(data.virtual_account);
        toast({ title: "Virtual account created!", description: "You can now receive payments via bank transfer." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl mb-1">Pay via Bank Transfer</h2>
        <p className="text-sm text-muted-foreground">
          Get a dedicated virtual account number. Transfer any amount and it's automatically credited — no manual confirmation needed.
        </p>
      </div>

      {virtualAccount ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Virtual Account Details */}
          <Card className="p-6 border-primary/20">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <Banknote size={18} className="text-primary" /> Your Virtual Account
            </h3>
            <div className="space-y-3">
              {[
                { label: "Bank", value: virtualAccount.bank_name },
                { label: "Account Number", value: virtualAccount.account_number },
                { label: "Account Name", value: virtualAccount.account_name },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-mono text-sm font-medium">{item.value}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(item.value)}>
                    <Copy size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <CheckCircle2 size={14} className="inline mr-1 text-primary" />
              Transfer any amount to this account. Credits are added automatically within seconds.
              <br />
              <span className="font-medium">Rate: ₦100 = 1 Token</span>
            </div>
          </Card>

          {/* How it works */}
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-chart-4" /> How It Works
            </h3>
            <div className="space-y-4">
              {[
                { step: "1", title: "Transfer", desc: "Send any amount from your bank app to the account number above" },
                { step: "2", title: "Auto-Detect", desc: "Paystack instantly detects your payment and notifies us" },
                { step: "3", title: "Auto-Credit", desc: "Tokens are automatically added to your wallet (₦100 = 1 token)" },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed">
          <Banknote size={36} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-heading font-semibold text-lg">Get Your Virtual Account</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create a dedicated bank account number linked to your wallet. Any transfer to this account auto-credits your tokens.
          </p>
          <Button variant="hero" onClick={createDVA} disabled={creating}>
            {creating ? <Loader2 size={14} className="animate-spin mr-1" /> : <Banknote size={14} className="mr-1" />}
            {creating ? "Creating..." : "Create Virtual Account"}
          </Button>
        </Card>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold mb-3">Transfer History</h3>
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <Card key={t.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">₦{Number(t.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Ref: {t.paystack_reference} · {new Date(t.created_at).toLocaleDateString()}
                    {t.sender_name && ` · From: ${t.sender_name}`}
                  </p>
                  {t.credited_wallet && (
                    <p className="text-xs text-primary mt-0.5">
                      ✓ {Math.floor(Number(t.amount) / 100)} tokens credited
                    </p>
                  )}
                </div>
                <Badge variant="default" className="capitalize text-xs">
                  {t.status}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PaymentsPortal;
