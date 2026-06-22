import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeedItem {
  id: string;
  source_table: string;
  source_id: string;
  org_id: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  tags: string[] | null;
  is_available: boolean;
  synced_at: string;
}

/**
 * Subscribes to the unified platform_catalogue_feed and rebroadcasts every
 * change over a BroadcastChannel so all open PWA tabs (platform + org PWAs)
 * stay in lockstep. Also returns the latest snapshot for direct consumption.
 */
export const usePlatformCatalogueSync = (filter?: { orgId?: string }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSnapshot = useCallback(async () => {
    let q = supabase
      .from("platform_catalogue_feed" as any)
      .select("*")
      .eq("is_available", true)
      .order("synced_at", { ascending: false })
      .limit(200);
    if (filter?.orgId) q = q.eq("org_id", filter.orgId);
    const { data } = await q;
    setItems(((data as any) || []) as FeedItem[]);
    setLoading(false);
  }, [filter?.orgId]);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try { bc = new BroadcastChannel("fsa-catalogue"); } catch {}

    fetchSnapshot();

    const channel = supabase
      .channel("platform_catalogue_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_catalogue_feed" },
        (payload) => {
          fetchSnapshot();
          try { bc?.postMessage({ type: "feed_change", payload }); } catch {}
        }
      )
      .subscribe();

    const onMessage = () => fetchSnapshot();
    bc?.addEventListener("message", onMessage);

    return () => {
      supabase.removeChannel(channel);
      bc?.removeEventListener("message", onMessage);
      bc?.close();
    };
  }, [fetchSnapshot]);

  return { items, loading, refresh: fetchSnapshot };
};
