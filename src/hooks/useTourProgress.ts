import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TourRole } from "@/config/roleTourTracks";

const LS_KEY = "fsa.tour_progress.v1";

interface LocalProgress {
  [role: string]: {
    last_step_index: number;
    total_steps: number;
    completed: boolean;
    last_seen_at: string;
  };
}

function readLocal(): LocalProgress {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function writeLocal(p: LocalProgress) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}

export interface TourProgressEntry {
  last_step_index: number;
  total_steps: number;
  completed: boolean;
}

/**
 * Resumable tour progress per (user, role).
 * - Anonymous visitors: localStorage-only.
 * - Authenticated users: localStorage + Supabase `tour_progress` table.
 *   On login, the cloud value (if newer) wins so progress follows the user
 *   across devices/refresh.
 */
export const useTourProgress = (role: TourRole | null) => {
  const { user } = useAuth();
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lastSavedRef = useRef<{ idx: number; completed: boolean } | null>(null);

  // Hydrate on mount / role / auth change
  useEffect(() => {
    if (!role) { setResumeIndex(null); setCompleted(false); setHydrated(true); return; }
    let cancelled = false;
    setHydrated(false);

    (async () => {
      const local = readLocal()[role];
      let chosen: TourProgressEntry | null = local
        ? { last_step_index: local.last_step_index, total_steps: local.total_steps, completed: local.completed }
        : null;
      let chosenSeenAt = local?.last_seen_at ?? null;

      if (user?.id) {
        const { data } = await supabase
          .from("tour_progress")
          .select("last_step_index,total_steps,completed,last_seen_at")
          .eq("user_id", user.id)
          .eq("role", role)
          .maybeSingle();
        if (data) {
          const remoteNewer = !chosenSeenAt || new Date(data.last_seen_at) > new Date(chosenSeenAt);
          if (remoteNewer) {
            chosen = {
              last_step_index: data.last_step_index,
              total_steps: data.total_steps,
              completed: data.completed,
            };
          }
          // Mirror down to local for offline next time
          const localAll = readLocal();
          localAll[role] = {
            last_step_index: data.last_step_index,
            total_steps: data.total_steps,
            completed: data.completed,
            last_seen_at: data.last_seen_at,
          };
          writeLocal(localAll);
        } else if (local) {
          // Push local up so the cloud catches up
          await supabase.from("tour_progress").upsert(
            {
              user_id: user.id,
              role,
              last_step_index: local.last_step_index,
              total_steps: local.total_steps,
              completed: local.completed,
              last_seen_at: local.last_seen_at,
            },
            { onConflict: "user_id,role" }
          );
        }
      }

      if (cancelled) return;
      setResumeIndex(chosen ? chosen.last_step_index : null);
      setCompleted(chosen ? chosen.completed : false);
      setHydrated(true);
    })();

    return () => { cancelled = true; };
  }, [role, user?.id]);

  const save = useCallback(
    (stepIndex: number, totalSteps: number, isComplete = false) => {
      if (!role) return;
      // Skip if unchanged
      const last = lastSavedRef.current;
      if (last && last.idx === stepIndex && last.completed === isComplete) return;
      lastSavedRef.current = { idx: stepIndex, completed: isComplete };

      const now = new Date().toISOString();
      const localAll = readLocal();
      localAll[role] = {
        last_step_index: stepIndex,
        total_steps: totalSteps,
        completed: isComplete,
        last_seen_at: now,
      };
      writeLocal(localAll);

      if (user?.id) {
        supabase
          .from("tour_progress")
          .upsert(
            {
              user_id: user.id,
              role,
              last_step_index: stepIndex,
              total_steps: totalSteps,
              completed: isComplete,
              last_seen_at: now,
            },
            { onConflict: "user_id,role" }
          )
          .then(({ error }) => {
            if (error) console.warn("[useTourProgress] save failed:", error.message);
          });
      }
    },
    [role, user?.id]
  );

  const reset = useCallback(() => {
    if (!role) return;
    const localAll = readLocal();
    delete localAll[role];
    writeLocal(localAll);
    lastSavedRef.current = null;
    setResumeIndex(null);
    setCompleted(false);
    if (user?.id) {
      supabase.from("tour_progress").delete().eq("user_id", user.id).eq("role", role);
    }
  }, [role, user?.id]);

  return { resumeIndex, completed, hydrated, save, reset };
};
