import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { roleTourTracks as fallbackTracks, type TourRole, type RoleTourTrack } from "@/config/roleTourTracks";
import type { PlatformTourStep } from "@/config/platformTourSteps";

export interface TourSyncState {
  is_stale: boolean;
  last_sync_success_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  last_platform_update_id: string | null;
}

const ROLES: TourRole[] = ["customer", "tailor", "designer", "organization"];

/**
 * Live tour tracks: subscribes to `platform_tour_tracks` (Realtime) so PWAs
 * always render the latest narration/feature copy as soon as the
 * `sync-voiced-tour` worker regenerates them.
 *
 * Falls back to bundled static tracks if the row is missing or the network
 * call hasn't completed yet.
 */
export const usePlatformTourTracks = () => {
  const [tracks, setTracks] = useState<Record<TourRole, RoleTourTrack>>(fallbackTracks);
  const [loaded, setLoaded] = useState(false);

  const fetchTracks = useCallback(async () => {
    const { data, error } = await supabase
      .from("platform_tour_tracks")
      .select("role,label,tagline,icon,accent,cta_label,cta_path,steps,generated_at,generated_by");

    if (error || !data) {
      setLoaded(true);
      return;
    }

    const next: Record<TourRole, RoleTourTrack> = { ...fallbackTracks };
    for (const row of data as any[]) {
      const role = row.role as TourRole;
      if (!ROLES.includes(role)) continue;
      const steps = Array.isArray(row.steps) ? (row.steps as PlatformTourStep[]) : [];
      if (steps.length === 0) continue; // keep fallback if empty
      next[role] = {
        role,
        label: row.label,
        tagline: row.tagline,
        icon: row.icon,
        accent: row.accent,
        ctaLabel: row.cta_label,
        ctaPath: row.cta_path,
        steps,
      };
    }
    setTracks(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchTracks();
    const channel = supabase
      .channel("platform-tour-tracks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_tour_tracks" }, () => {
        fetchTracks();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTracks]);

  return { tracks, loaded, refetch: fetchTracks };
};

export const useTourSyncState = () => {
  const [state, setState] = useState<TourSyncState | null>(null);

  const fetchState = useCallback(async () => {
    const { data } = await supabase
      .from("platform_tour_sync_state")
      .select("is_stale,last_sync_success_at,last_sync_status,last_sync_message,last_platform_update_id")
      .eq("id", 1)
      .maybeSingle();
    if (data) setState(data as TourSyncState);
  }, []);

  useEffect(() => {
    fetchState();
    const channel = supabase
      .channel("tour-sync-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_tour_sync_state" }, () => fetchState())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchState]);

  return { state, refetch: fetchState };
};
