import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: any[];
  max_members: number | null;
  max_orders: number | null;
  max_customers: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface OrgSubscription {
  id: string;
  org_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  plan?: SubscriptionPlan;
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setPlans(
        (data || []).map((p: any) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : [],
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  return { plans, loading };
};

export const useOrgSubscription = (orgId: string | undefined) => {
  const [subscription, setSubscription] = useState<OrgSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from("org_subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (data) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", data.plan_id)
        .single();

      setSubscription({
        ...data,
        plan: plan
          ? { ...plan, features: Array.isArray(plan.features) ? plan.features : [] }
          : undefined,
      });
    } else {
      setSubscription(null);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const selectPlan = async (planId: string, billingCycle: "monthly" | "yearly" = "monthly") => {
    if (!orgId) return { error: new Error("No org") };

    // Get plan details for invoice
    const { data: planData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    const isNewSubscription = !subscription;
    const trialEndsAt = isNewSubscription
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    let subError: any = null;
    let subId: string | undefined;

    if (subscription) {
      const { error } = await supabase
        .from("org_subscriptions")
        .update({ plan_id: planId, billing_cycle: billingCycle })
        .eq("id", subscription.id);
      subError = error;
      subId = subscription.id;
    } else {
      const { data: newSub, error } = await supabase
        .from("org_subscriptions")
        .insert({
          org_id: orgId,
          plan_id: planId,
          billing_cycle: billingCycle,
          is_trial: true,
          trial_ends_at: trialEndsAt,
        })
        .select("id")
        .single();
      subError = error;
      subId = newSub?.id;
    }

    if (!subError && planData && subId) {
      // Create subscription invoice
      const price = billingCycle === "yearly" ? planData.price_yearly : planData.price_monthly;
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("subscription_invoices").insert({
        org_id: orgId,
        user_id: user?.id || "",
        invoice_number: `INV-SUB-${Date.now().toString(36).toUpperCase()}`,
        invoice_type: "subscription",
        description: `${planData.name} Plan - ${billingCycle === "yearly" ? "Annual" : "Monthly"} Subscription${isNewSubscription ? " (30-day trial)" : ""}`,
        amount: isNewSubscription ? 0 : price,
        currency: planData.currency || "NGN",
        status: isNewSubscription ? "paid" : "pending",
        payment_method: isNewSubscription ? "trial" : null,
        related_entity_type: "org_subscription",
        related_entity_id: subId,
        paid_at: isNewSubscription ? new Date().toISOString() : null,
        due_date: isNewSubscription ? trialEndsAt : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      // Create fee ledger entry for platform tracking
      await supabase.from("platform_fee_ledger").insert({
        org_id: orgId,
        fee_type: "customer_surcharge",
        amount: isNewSubscription ? 0 : price * 0.05,
        currency: planData.currency || "NGN",
        status: isNewSubscription ? "collected" : "pending",
      });

      await fetchSubscription();
    }

    return { error: subError };
  };

  return { subscription, loading, selectPlan, refetch: fetchSubscription };
};
