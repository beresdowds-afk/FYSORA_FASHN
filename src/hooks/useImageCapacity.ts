import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CapacityRow {
  id: string;
  org_id: string;
  website_id: string | null;
  base_limit: number;
  granted_packs: number;
  image_count: number;
}

export interface CapacityRequest {
  id: string;
  org_id: string;
  website_id: string | null;
  packs_requested: number;
  status: "pending" | "approved" | "awaiting_payment" | "active" | "rejected" | "cancelled";
  price_total: number | null;
  currency: string | null;
  invoice_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
}

export const useImageCapacity = (orgId?: string | null, websiteId?: string | null) => {
  const [capacity, setCapacity] = useState<CapacityRow | null>(null);
  const [requests, setRequests] = useState<CapacityRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: cap }, { data: reqs }] = await Promise.all([
      supabase.from("org_website_image_capacity" as any).select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("image_capacity_requests" as any).select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    ]);
    setCapacity((cap as any) || null);
    setRequests((reqs as any) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  const requestPacks = async (packsRequested: number, notes?: string) => {
    if (!orgId) return { error: new Error("No org") };
    const { error } = await supabase.from("image_capacity_requests" as any).insert({
      org_id: orgId,
      website_id: websiteId || null,
      packs_requested: packsRequested,
      notes: notes || null,
    } as any);
    if (!error) await refresh();
    return { error };
  };

  const used = capacity?.image_count ?? 0;
  const limit = (capacity?.base_limit ?? 50) + ((capacity?.granted_packs ?? 0) * 50);

  return { capacity, requests, loading, used, limit, refresh, requestPacks };
};
