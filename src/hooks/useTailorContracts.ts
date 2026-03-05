import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TailorContract {
  id: string;
  org_id: string;
  tailor_id: string;
  contract_number: string;
  status: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  payment_terms: string;
  tailor_rate_type: string;
  tailor_rate_value: number;
  agency_fee_percent: number;
  max_concurrent_orders: number | null;
  auto_renew: boolean;
  notes: string | null;
  terminated_at: string | null;
  terminated_by: string | null;
  termination_reason: string | null;
  created_at: string;
  updated_at: string;
  tailor_profile?: { display_name: string | null } | null;
}

export interface ContractPayment {
  id: string;
  contract_id: string;
  org_id: string;
  order_id: string | null;
  tailor_id: string;
  customer_paid_amount: number;
  tailor_payout_amount: number;
  agency_fee_amount: number;
  org_net_amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderDelegation {
  id: string;
  order_id: string;
  org_id: string;
  contract_id: string | null;
  tailor_id: string;
  delegated_by: string;
  status: string;
  priority: string;
  deadline: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  tailor_notes: string | null;
  admin_notes: string | null;
  quality_rating: number | null;
  created_at: string;
  tailor_profile?: { display_name: string | null } | null;
}

export const useTailorContracts = (orgId: string | undefined) => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<TailorContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("tailor_contracts")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (data) {
      const tailorIds = [...new Set(data.map((c: any) => c.tailor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", tailorIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setContracts(data.map((c: any) => ({
        ...c,
        tailor_profile: profileMap.get(c.tailor_id) || null,
      })));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const generateContractNumber = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CTR-${ts}-${rand}`;
  };

  const createContract = async (data: {
    tailor_id: string;
    contract_type?: string;
    start_date?: string;
    end_date?: string;
    payment_terms?: string;
    tailor_rate_type?: string;
    tailor_rate_value?: number;
    agency_fee_percent?: number;
    max_concurrent_orders?: number;
    auto_renew?: boolean;
    notes?: string;
  }) => {
    if (!orgId) return { error: new Error("No org") };
    const { error } = await supabase.from("tailor_contracts").insert({
      org_id: orgId,
      contract_number: generateContractNumber(),
      ...data,
    } as any);
    if (!error) await fetchContracts();
    return { error };
  };

  const updateContract = async (id: string, updates: Partial<TailorContract>) => {
    const { error } = await supabase
      .from("tailor_contracts")
      .update(updates as any)
      .eq("id", id);
    if (!error) await fetchContracts();
    return { error };
  };

  const terminateContract = async (id: string, reason: string) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase
      .from("tailor_contracts")
      .update({
        status: "terminated",
        terminated_at: new Date().toISOString(),
        terminated_by: user.id,
        termination_reason: reason,
      } as any)
      .eq("id", id);
    if (!error) await fetchContracts();
    return { error };
  };

  const activateContract = async (id: string) => {
    const { error } = await supabase
      .from("tailor_contracts")
      .update({ status: "active" } as any)
      .eq("id", id);
    if (!error) await fetchContracts();
    return { error };
  };

  return { contracts, loading, createContract, updateContract, terminateContract, activateContract, refetch: fetchContracts };
};

export const useContractPayments = (orgId: string | undefined, contractId?: string) => {
  const [payments, setPayments] = useState<ContractPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let query = supabase
      .from("contract_payments")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (contractId) query = query.eq("contract_id", contractId);
    const { data } = await query;
    setPayments((data as ContractPayment[]) || []);
    setLoading(false);
  }, [orgId, contractId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const recordContractPayment = async (paymentData: {
    contract_id: string;
    order_id?: string;
    tailor_id: string;
    customer_paid_amount: number;
    tailor_payout_amount: number;
    agency_fee_amount: number;
    org_net_amount: number;
    currency: string;
    notes?: string;
  }) => {
    if (!orgId) return { error: new Error("No org") };
    const { error } = await supabase.from("contract_payments").insert({
      org_id: orgId,
      ...paymentData,
      status: "completed",
      paid_at: new Date().toISOString(),
    } as any);
    if (!error) await fetchPayments();
    return { error };
  };

  return { payments, loading, recordContractPayment, refetch: fetchPayments };
};

export const useOrderDelegations = (orgId: string | undefined, orderId?: string) => {
  const { user } = useAuth();
  const [delegations, setDelegations] = useState<OrderDelegation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDelegations = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let query = supabase
      .from("order_delegations")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (orderId) query = query.eq("order_id", orderId);
    const { data } = await query;
    if (data) {
      const tailorIds = [...new Set(data.map((d: any) => d.tailor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", tailorIds.length > 0 ? tailorIds : ["00000000-0000-0000-0000-000000000000"]);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setDelegations(data.map((d: any) => ({
        ...d,
        tailor_profile: profileMap.get(d.tailor_id) || null,
      })));
    }
    setLoading(false);
  }, [orgId, orderId]);

  useEffect(() => { fetchDelegations(); }, [fetchDelegations]);

  const delegateOrder = async (data: {
    order_id: string;
    tailor_id: string;
    contract_id?: string;
    priority?: string;
    deadline?: string;
    admin_notes?: string;
  }) => {
    if (!orgId || !user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("order_delegations").insert({
      org_id: orgId,
      delegated_by: user.id,
      ...data,
    } as any);
    if (!error) {
      // Also update order assigned_tailor_id
      await supabase.from("orders").update({ assigned_tailor_id: data.tailor_id }).eq("id", data.order_id);
      await fetchDelegations();
    }
    return { error };
  };

  const updateDelegation = async (id: string, updates: Partial<OrderDelegation>) => {
    const { error } = await supabase
      .from("order_delegations")
      .update(updates as any)
      .eq("id", id);
    if (!error) await fetchDelegations();
    return { error };
  };

  return { delegations, loading, delegateOrder, updateDelegation, refetch: fetchDelegations };
};
