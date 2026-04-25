import { useEffect } from "react";
import { toast } from "sonner";
import { usePlatformUpdates, type PlatformUpdateAudience } from "@/hooks/usePlatformUpdates";

interface Props {
  /** Audience this surface represents. Defaults to "all". */
  audience?: PlatformUpdateAudience;
}

/**
 * Global platform-update worker. Mount once near the app root.
 * Listens for new entries in `platform_updates` and:
 *  - Shows a toast with the version + notes
 *  - Triggers PWA service-worker refresh when `force_reload` is set
 */
export const PlatformUpdateWatcher = ({ audience = "all" }: Props) => {
  const { latest, isNew, markSeen } = usePlatformUpdates(audience);

  useEffect(() => {
    if (!isNew || !latest) return;

    const isCritical = latest.severity === "critical" || latest.severity === "major";

    toast(`${latest.title} — v${latest.version}`, {
      description: latest.notes ?? "A new platform update is available.",
      duration: isCritical ? 15000 : 8000,
      action: latest.force_reload
        ? undefined
        : {
            label: "Reload",
            onClick: () => {
              const updateSW = (window as any).__fsaUpdateSW as
                | ((reload?: boolean) => Promise<void>)
                | undefined;
              if (updateSW) updateSW(true).catch(() => window.location.reload());
              else window.location.reload();
            },
          },
      onDismiss: markSeen,
      onAutoClose: markSeen,
    });

    // Always mark seen so we don't re-toast on remount
    markSeen();
  }, [isNew, latest, markSeen]);

  return null;
};

export default PlatformUpdateWatcher;