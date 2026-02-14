import { useState } from "react";
import { useSubscriptionPlans, useOrgSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Crown, Zap, Building2, AlertTriangle, Clock, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { AppRole } from "@/hooks/useOrganization";
import BillingHistory from "@/components/billing/BillingHistory";

const planIcons: Record<string, any> = {
  basic: Zap,
  pro: Crown,
  enterprise: Building2,
};

interface SubscriptionTabProps {
  orgId: string;
  role: AppRole | null;
}

const SubscriptionTab = ({ orgId, role }: SubscriptionTabProps) => {
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { subscription, loading: subLoading, selectPlan } = useOrgSubscription(orgId);
  const limits = useSubscriptionLimits(orgId);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selecting, setSelecting] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<{ id: string; name: string; isDowngrade: boolean } | null>(null);
  const [activeView, setActiveView] = useState<"plans" | "history">("plans");
  const { toast } = useToast();
  const canManage = role === "org_admin" || role === "super_admin";

  const handleSelect = async (planId: string) => {
    if (!canManage) return;

    const targetPlan = plans.find(p => p.id === planId);
    const currentPlan = plans.find(p => p.id === subscription?.plan_id);
    const isDowngrade = currentPlan && targetPlan && targetPlan.sort_order < currentPlan.sort_order;

    if (subscription?.plan_id && subscription.plan_id !== planId) {
      setConfirmPlan({ id: planId, name: targetPlan?.name || "", isDowngrade: !!isDowngrade });
      return;
    }

    await doSelectPlan(planId);
  };

  const doSelectPlan = async (planId: string) => {
    setSelecting(planId);
    setConfirmPlan(null);
    const { error } = await selectPlan(planId, billingCycle);
    if (error) toast({ title: "Error", description: (error as any).message, variant: "destructive" });
    else toast({ title: "Plan updated successfully" });
    setSelecting(null);
  };

  if (plansLoading || subLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-bold text-2xl">Billing & Subscription</h2>
          {subscription?.plan && (
            <p className="text-sm text-muted-foreground mt-1">
              Current plan: <span className="font-medium text-foreground">{subscription.plan.name}</span>
              {" · "}{subscription.billing_cycle === "yearly" ? "Annual" : "Monthly"} billing
              {" · "}Status: <span className="font-medium text-secondary">{subscription.status}</span>
              {(subscription as any)?.is_trial && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                  Trial · Ends {new Date((subscription as any).trial_ends_at).toLocaleDateString()}
                </span>
              )}
            </p>
          )}
          {!subscription && (
            <p className="text-sm text-muted-foreground mt-1">No active plan. Start your 30-day free trial below.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("plans")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeView === "plans" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveView("history")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${activeView === "history" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Receipt size={12} /> Billing History
          </button>
        </div>
      </div>

      {/* Usage limits banner */}
      {!limits.loading && subscription?.plan && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Orders/mo", current: limits.currentOrders, max: limits.maxOrders, can: limits.canCreateOrder },
            { label: "Customers", current: limits.currentCustomers, max: limits.maxCustomers, can: limits.canCreateCustomer },
            { label: "Members", current: limits.currentMembers, max: limits.maxMembers, can: limits.canAddMember },
          ].map((item) => (
            <div key={item.label} className={`p-3 rounded-lg border ${!item.can ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-heading font-bold text-lg">
                {item.current}{item.max !== null ? ` / ${item.max}` : ""}
              </p>
              {!item.can && (
                <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle size={10} /> Limit reached
                </p>
              )}
              {item.max === null && <p className="text-[10px] text-muted-foreground">Unlimited</p>}
            </div>
          ))}
        </div>
      )}

      {/* Trial expired warning */}
      {limits.trialExpired && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/5 flex items-start gap-3">
          <AlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Trial expired</p>
            <p className="text-xs text-muted-foreground">Your free trial has ended. Select a plan to continue using all features.</p>
          </div>
        </div>
      )}

      {activeView === "history" ? (
        <BillingHistory orgId={orgId} />
      ) : (
        <>
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Yearly <span className="text-xs opacity-75">Save 15%+</span>
            </button>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, i) => {
              const Icon = planIcons[plan.slug] || Zap;
              const isCurrentPlan = subscription?.plan_id === plan.id;
              const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
              const isPro = plan.slug === "pro";
              const currentPlanOrder = plans.find(p => p.id === subscription?.plan_id)?.sort_order ?? -1;
              const isDowngrade = subscription?.plan_id && plan.sort_order < currentPlanOrder;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative rounded-xl border p-6 flex flex-col ${
                    isPro ? "border-primary bg-primary/5 shadow-gold" : "border-border bg-card"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      Most Popular
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={20} className={isPro ? "text-primary" : "text-muted-foreground"} />
                    <h3 className="font-heading font-bold text-lg">{plan.name}</h3>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                  )}

                  <div className="mb-4">
                    <span className="font-heading font-bold text-3xl">₦{price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/{billingCycle === "yearly" ? "yr" : "mo"}</span>
                  </div>

                  {/* Trial badge */}
                  {!subscription && (
                    <div className="mb-3 flex items-center gap-1 text-xs text-secondary">
                      <Clock size={12} /> 30-day free trial included
                    </div>
                  )}

                  {/* Limits */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-secondary shrink-0" />
                      <span>{plan.max_orders ? `${plan.max_orders} orders/mo` : "Unlimited orders"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-secondary shrink-0" />
                      <span>{plan.max_customers ? `${plan.max_customers} customers` : "Unlimited customers"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-secondary shrink-0" />
                      <span>{plan.max_members ? `${plan.max_members} team members` : "Unlimited members"}</span>
                    </div>
                  </div>

                  {/* Features */}
                  {plan.features.length > 0 && (
                    <div className="space-y-1.5 mb-6 flex-1">
                      {plan.features.map((feature, fi) => (
                        <div key={fi} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check size={12} className="text-secondary shrink-0 mt-0.5" />
                          <span>{String(feature)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant={isCurrentPlan ? "outline" : isPro ? "hero" : "default"}
                    className="w-full mt-auto"
                    disabled={isCurrentPlan || !canManage || selecting !== null}
                    onClick={() => handleSelect(plan.id)}
                  >
                    {selecting === plan.id
                      ? "Processing..."
                      : isCurrentPlan
                      ? "Current Plan"
                      : !subscription
                      ? "Start Free Trial"
                      : isDowngrade
                      ? "Downgrade"
                      : "Upgrade"}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirm plan change dialog */}
      <AlertDialog open={!!confirmPlan} onOpenChange={() => setConfirmPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPlan?.isDowngrade ? "Downgrade Plan?" : "Upgrade Plan?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPlan?.isDowngrade
                ? `Downgrading to ${confirmPlan.name} may reduce your usage limits. Features above the new plan's limits will be restricted.`
                : `You're upgrading to ${confirmPlan?.name}. The new plan will take effect immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPlan && doSelectPlan(confirmPlan.id)}>
              {confirmPlan?.isDowngrade ? "Confirm Downgrade" : "Confirm Upgrade"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default SubscriptionTab;
