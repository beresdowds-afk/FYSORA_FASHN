import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SyncAction =
  | "branding_updated"
  | "catalogue_updated"
  | "settings_updated"
  | "website_published"
  | "org_details_updated";

interface SyncEvent {
  type: "FSA_UPDATE";
  action: SyncAction;
  orgId: string;
  timestamp: number;
  payload?: Record<string, any>;
}

/**
 * Bidirectional sync hook for organization data.
 * Listens for Supabase realtime changes on org_websites, org_catalogue_items,
 * and organizations tables, then broadcasts FSA_UPDATE events to connected
 * websites/apps. Also listens for inbound sync events from apps.
 */
export const useOrgSync = (orgId: string | undefined, onSyncReceived?: (action: SyncAction) => void) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast a sync event to connected apps/websites
  const broadcastSync = useCallback((action: SyncAction, payload?: Record<string, any>) => {
    if (!orgId) return;

    const event: SyncEvent = {
      type: "FSA_UPDATE",
      action,
      orgId,
      timestamp: Date.now(),
      payload,
    };

    // Broadcast via Supabase Realtime channel
    channelRef.current?.send({
      type: "broadcast",
      event: "fsa-sync",
      payload: event,
    });

    console.log(`[FSA Sync] Broadcasted: ${action} for org ${orgId}`);
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`org-sync-${orgId}`)
      // Listen for org_websites changes (branding, settings)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "org_websites",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log("[FSA Sync] Website settings changed:", payload.eventType);
          broadcastSync("settings_updated", { table: "org_websites", event: payload.eventType });
          onSyncReceived?.("settings_updated");
        }
      )
      // Listen for catalogue changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "org_catalogue_items",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log("[FSA Sync] Catalogue changed:", payload.eventType);
          broadcastSync("catalogue_updated", {
            table: "org_catalogue_items",
            event: payload.eventType,
            itemId: (payload.new as any)?.id || (payload.old as any)?.id,
          });
          onSyncReceived?.("catalogue_updated");
        }
      )
      // Listen for organization detail changes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "organizations",
          filter: `id=eq.${orgId}`,
        },
        (payload) => {
          console.log("[FSA Sync] Org details changed");
          broadcastSync("org_details_updated", { table: "organizations" });
          onSyncReceived?.("org_details_updated");
        }
      )
      // Listen for broadcast messages from apps/websites
      .on("broadcast", { event: "fsa-sync" }, (payload) => {
        const event = payload.payload as SyncEvent;
        if (event?.orgId === orgId && event?.type === "FSA_UPDATE") {
          console.log("[FSA Sync] Received from app/website:", event.action);
          onSyncReceived?.(event.action);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[FSA Sync] Listening for changes on org ${orgId}`);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [orgId, broadcastSync, onSyncReceived]);

  return { broadcastSync };
};
