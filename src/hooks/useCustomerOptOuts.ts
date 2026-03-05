import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerOptOut {
  id: string;
  org_id: string;
  customer_id: string;
  opt_out_type: string;
  opted_out_features: string[];
  reason: string | null;
  opted_out_at: string;
  opted_back_in_at: string | null;
  status: string;
  created_at: string;
  customer_profile?: { display_name: string | null } | null;
}

export const useCustomerOptOuts = (orgId: string | undefined) => {
  const [optOuts, setOptOuts] = useState<CustomerOptOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptOuts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("customer_opt_outs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (data) {
      const customerIds = [...new Set(data.map((o: any) => o.customer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", customerIds.length > 0 ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setOptOuts(data.map((o: any) => ({
        ...o,
        customer_profile: profileMap.get(o.customer_id) || null,
      })));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchOptOuts(); }, [fetchOptOuts]);

  const createOptOut = async (data: {
    customer_id: string;
    opt_out_type?: string;
    opted_out_features?: string[];
    reason?: string;
  }) => {
    if (!orgId) return { error: new Error("No org") };
    const { error } = await supabase.from("customer_opt_outs").insert({
      org_id: orgId,
      ...data,
    } as any);
    if (!error) await fetchOptOuts();
    return { error };
  };

  const optBackIn = async (id: string) => {
    const { error } = await supabase
      .from("customer_opt_outs")
      .update({
        status: "opted_in",
        opted_back_in_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (!error) await fetchOptOuts();
    return { error };
  };

  const deleteOptOut = async (id: string) => {
    const { error } = await supabase.from("customer_opt_outs").delete().eq("id", id);
    if (!error) await fetchOptOuts();
    return { error };
  };

  return { optOuts, loading, createOptOut, optBackIn, deleteOptOut, refetch: fetchOptOuts };
};
