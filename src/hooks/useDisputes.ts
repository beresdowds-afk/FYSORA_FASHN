import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Dispute {
  id: string;
  org_id: string;
  order_id: string | null;
  shipment_id: string | null;
  filed_by: string;
  filed_against: string | null;
  dispute_type: string;
  category: string | null;
  status: string;
  priority: string;
  subject: string;
  description: string | null;
  evidence_urls: string[];
  ai_classification: any;
  ai_sentiment: string | null;
  ai_recommendation: string | null;
  ai_auto_resolved: boolean;
  resolution_type: string | null;
  resolution_notes: string | null;
  compensation_amount: number;
  compensation_currency: string;
  compensation_type: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  escalation_level: number;
  created_at: string;
  updated_at: string;
}

export const useDisputes = (orgId: string | undefined) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("disputes")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setDisputes((data || []) as Dispute[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const createDispute = async (dispute: Partial<Dispute>) => {
    const { error } = await supabase.from("disputes").insert({ ...dispute, org_id: orgId! } as any);
    if (!error) await fetchDisputes();
    return { error };
  };

  const updateDispute = async (id: string, updates: Partial<Dispute>) => {
    const { error } = await supabase.from("disputes").update(updates as any).eq("id", id);
    if (!error) await fetchDisputes();
    return { error };
  };

  return { disputes, loading, createDispute, updateDispute, refetch: fetchDisputes };
};
