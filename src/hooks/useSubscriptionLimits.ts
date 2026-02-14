import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgSubscription } from "@/hooks/useSubscription";

interface UsageLimits {
  maxOrders: number | null;
  maxCustomers: number | null;
  maxMembers: number | null;
  currentOrders: number;
  currentCustomers: number;
  currentMembers: number;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
  canCreateOrder: boolean;
  canCreateCustomer: boolean;
  canAddMember: boolean;
  planName: string;
}

export const useSubscriptionLimits = (orgId: string | undefined) => {
  const { subscription, loading: subLoading } = useOrgSubscription(orgId);
  const [usage, setUsage] = useState<UsageLimits>({
    maxOrders: null, maxCustomers: null, maxMembers: null,
    currentOrders: 0, currentCustomers: 0, currentMembers: 0,
    isTrial: false, trialEndsAt: null, trialExpired: false,
    canCreateOrder: true, canCreateCustomer: true, canAddMember: true,
    planName: "No Plan",
  });
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    // Get current month order count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [ordersRes, customersRes, membersRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startOfMonth.toISOString()),
      supabase.from("orders").select("customer_id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase.from("org_members").select("id", { count: "exact", head: true })
        .eq("org_id", orgId).eq("is_active", true),
    ]);

    // Get unique customers count
    const { data: customerData } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("org_id", orgId);
    const uniqueCustomers = new Set(customerData?.map(c => c.customer_id) || []).size;

    const plan = subscription?.plan;
    const isTrial = !!(subscription as any)?.is_trial;
    const trialEndsAt = (subscription as any)?.trial_ends_at || null;
    const trialExpired = isTrial && trialEndsAt ? new Date(trialEndsAt) < new Date() : false;

    const currentOrders = ordersRes.count || 0;
    const currentMembers = membersRes.count || 0;

    const canCreateOrder = !trialExpired && (plan?.max_orders === null || plan?.max_orders === undefined || currentOrders < plan.max_orders);
    const canCreateCustomer = !trialExpired && (plan?.max_customers === null || plan?.max_customers === undefined || uniqueCustomers < plan.max_customers);
    const canAddMember = !trialExpired && (plan?.max_members === null || plan?.max_members === undefined || currentMembers < plan.max_members);

    setUsage({
      maxOrders: plan?.max_orders ?? null,
      maxCustomers: plan?.max_customers ?? null,
      maxMembers: plan?.max_members ?? null,
      currentOrders,
      currentCustomers: uniqueCustomers,
      currentMembers,
      isTrial, trialEndsAt, trialExpired,
      canCreateOrder, canCreateCustomer, canAddMember,
      planName: plan?.name || "No Plan",
    });
    setLoading(false);
  }, [orgId, subscription]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  return { ...usage, loading: loading || subLoading, refetch: fetchUsage };
};
