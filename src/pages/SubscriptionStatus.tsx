import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, CheckCircle2, CreditCard, XCircle, Crown, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgSubscription, useSubscriptionPlans } from "@/hooks/useSubscription";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

type CustomerSub = {
  id: string;
  plan_name: string;
  price_amount: number;
  price_currency: string;
  billing_cycle: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const statusVariant = (s: string) =>
  s === "active" ? "default" : s === "pending" ? "secondary" : "destructive";

const SubscriptionStatus = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrganization();
  const { subscription: orgSub, loading: orgLoading, refetch: refetchOrg } = useOrgSubscription(currentOrg?.id);
  const { plans } = useSubscriptionPlans();

  const [subs, setSubs] = useState<CustomerSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadCustomer = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("customer_subscriptions")
      .select("id, plan_name, price_amount, price_currency, billing_cycle, status, current_period_start, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSubs((data || []) as CustomerSub[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) loadCustomer();
  }, [authLoading, user?.id]);

  const designerSub = useMemo(
    () => subs.find((s) => s.plan_name === "designer_monthly") || null,
    [subs],
  );
  const customerSub = useMemo(
    () => subs.find((s) => s.plan_name !== "designer_monthly") || null,
    [subs],
  );

  const cancel = async (scope: "designer" | "customer" | "organization", planName?: string, orgId?: string) => {
    setBusy(`${scope}:${planName || orgId}`);
    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { scope, action: "cancel", plan_name: planName, org_id: orgId },
    });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Cancellation failed");
      return;
    }
    toast.success("Subscription cancelled. Access remains until the current period ends.");
    await Promise.all([loadCustomer(), refetchOrg()]);
  };

  const upgradeDesigner = async () => {
    setBusy("designer:upgrade");
    const { data, error } = await supabase.functions.invoke("initialize-designer-subscription", { body: {} });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not start checkout");
      return;
    }
    if ((data as any)?.checkout_url) window.location.href = (data as any).checkout_url;
    else { toast.success("Subscription activated"); loadCustomer(); }
  };

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) {
    navigate(`/auth?next=/subscription`);
    return null;
  }

  const SubCard = ({
    title, badge, plan, cycle, amount, currency, periodStart, periodEnd, status,
    actions,
  }: {
    title: string;
    badge?: string;
    plan: string;
    cycle: string;
    amount: number | string;
    currency: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    status: string;
    actions: React.ReactNode;
  }) => (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown size={16} className="text-primary" /> {title}
          </CardTitle>
          {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
        </div>
        <CardDescription>Manage your billing interval, plan and cancellation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan</div>
            <div className="font-semibold">{plan}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</div>
            <Badge variant={statusVariant(status) as any}>{status}</Badge>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><CreditCard size={11}/>Billing</div>
            <div className="font-semibold">
              {currency} {Number(amount).toLocaleString()} <span className="text-muted-foreground font-normal">/ {cycle}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><CalendarClock size={11}/>Renews / Ends</div>
            <div className="font-semibold">{fmtDate(periodEnd)}</div>
            <div className="text-[11px] text-muted-foreground">Started {fmtDate(periodStart)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">{actions}</div>
      </CardContent>
    </Card>
  );

  const cancelDialog = (
    scope: "designer" | "customer" | "organization",
    planName?: string,
    orgId?: string,
  ) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy?.startsWith(scope)}>
          {busy === `${scope}:${planName || orgId}` ? <Loader2 size={14} className="animate-spin mr-1"/> : <XCircle size={14} className="mr-1" />}
          Cancel plan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            Your access stays active until the end of the current billing period. You can reactivate any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep plan</AlertDialogCancel>
          <AlertDialogAction onClick={() => cancel(scope, planName, orgId)}>
            Yes, cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Subscription & Billing | FYSORA FASHN</title>
        <meta name="description" content="View and manage your subscription plan, billing interval, upgrades and cancellations across designer, customer and organization accounts." />
        <link rel="canonical" href="https://fs-africa.org.ng/subscription" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading font-bold text-3xl mb-2">Subscription &amp; Billing</h1>
          <p className="text-muted-foreground mb-6">
            Review your current plan, switch billing interval, upgrade or cancel — all changes settle through Stripe or Paystack depending on your region.
          </p>

          <Tabs defaultValue={currentOrg ? "organization" : designerSub ? "designer" : "customer"}>
            <TabsList className="mb-4">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="designer">Designer</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
            </TabsList>

            <TabsContent value="customer">
              {loading ? (
                <div className="grid place-items-center py-10"><Loader2 className="animate-spin"/></div>
              ) : customerSub ? (
                <SubCard
                  title="Customer Premium"
                  badge={customerSub.status === "active" ? "Active" : customerSub.status}
                  plan={customerSub.plan_name}
                  cycle={customerSub.billing_cycle}
                  amount={customerSub.price_amount}
                  currency={customerSub.price_currency}
                  periodStart={customerSub.current_period_start}
                  periodEnd={customerSub.current_period_end}
                  status={customerSub.status}
                  actions={
                    <>
                      <Button size="sm" variant="hero" onClick={() => navigate("/portal?subscribe=premium")}>
                        <ArrowUpRight size={14} className="mr-1" /> Upgrade / Renew
                      </Button>
                      {customerSub.status === "active" && cancelDialog("customer", customerSub.plan_name)}
                    </>
                  }
                />
              ) : (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No customer subscription yet.&nbsp;
                  <button className="text-primary underline" onClick={() => navigate("/portal?subscribe=premium")}>Get Premium</button>
                </CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="designer">
              {loading ? (
                <div className="grid place-items-center py-10"><Loader2 className="animate-spin"/></div>
              ) : designerSub ? (
                <SubCard
                  title="Designer Studio"
                  badge={designerSub.status === "active" ? "Active" : designerSub.status}
                  plan="$15 / month Designer plan"
                  cycle={designerSub.billing_cycle}
                  amount={designerSub.price_amount}
                  currency={designerSub.price_currency}
                  periodStart={designerSub.current_period_start}
                  periodEnd={designerSub.current_period_end}
                  status={designerSub.status}
                  actions={
                    <>
                      <Button size="sm" variant="hero" onClick={upgradeDesigner} disabled={busy === "designer:upgrade"}>
                        {busy === "designer:upgrade" ? <Loader2 size={14} className="animate-spin mr-1"/> : <CheckCircle2 size={14} className="mr-1" />}
                        Renew / Reactivate
                      </Button>
                      {designerSub.status === "active" && cancelDialog("designer", "designer_monthly")}
                    </>
                  }
                />
              ) : (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  You don't have a Designer plan.&nbsp;
                  <button className="text-primary underline" onClick={upgradeDesigner}>Start your $15/mo subscription</button>
                </CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="organization">
              {!currentOrg ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Select or create an organization to manage org-level billing.
                </CardContent></Card>
              ) : orgLoading ? (
                <div className="grid place-items-center py-10"><Loader2 className="animate-spin"/></div>
              ) : orgSub ? (
                <SubCard
                  title={`${currentOrg.name} – ${orgSub.plan?.name || "Plan"}`}
                  badge={orgSub.status === "active" ? "Active" : orgSub.status}
                  plan={orgSub.plan?.name || "—"}
                  cycle={orgSub.billing_cycle}
                  amount={orgSub.billing_cycle === "yearly" ? (orgSub.plan?.price_yearly ?? 0) : (orgSub.plan?.price_monthly ?? 0)}
                  currency={orgSub.plan?.currency || "NGN"}
                  periodStart={orgSub.current_period_start}
                  periodEnd={orgSub.current_period_end}
                  status={orgSub.status}
                  actions={
                    <>
                      <Button size="sm" variant="hero" onClick={() => navigate(`/dashboard?subscribe=upgrade`)}>
                        <ArrowUpRight size={14} className="mr-1" /> Change plan
                      </Button>
                      {orgSub.status === "active" && cancelDialog("organization", undefined, currentOrg.id)}
                    </>
                  }
                />
              ) : (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No active organization plan.&nbsp;
                  <button className="text-primary underline" onClick={() => navigate("/dashboard?subscribe=upgrade")}>Choose a plan</button>
                </CardContent></Card>
              )}

              {plans.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-heading font-semibold text-sm mb-3">Available organization plans</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {plans.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-muted-foreground text-xs mb-1">{p.description}</div>
                        <div className="font-mono text-xs">
                          {p.currency} {Number(p.price_monthly).toLocaleString()} / mo
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default SubscriptionStatus;