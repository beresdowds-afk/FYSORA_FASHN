import { supabase } from "@/integrations/supabase/client";
import { startAuthentication } from "@simplewebauthn/browser";

export type PasskeyChallengeResult =
  | { ok: true }
  | { ok: false; code: "no_passkeys" | "cancelled" | "expired" | "failed" | "network"; message: string };

/**
 * Run a passkey verification against the currently signed-in Supabase session.
 * Callers must have a live session (email/password sign-in just completed, or
 * an existing session in localStorage).
 */
export async function verifyPasskeyForCurrentSession(): Promise<PasskeyChallengeResult> {
  try {
    const { data: begin, error: e1 } = await supabase.functions.invoke("passkey-authenticate", {
      body: { action: "begin" },
    });
    if (e1 || !begin?.options) {
      const raw = String((begin as any)?.error ?? e1?.message ?? "");
      if (/no passkeys/i.test(raw)) return { ok: false, code: "no_passkeys", message: "No passkeys enrolled on this account." };
      return { ok: false, code: "network", message: raw || "Could not start passkey challenge." };
    }

    let asResp;
    try {
      asResp = await startAuthentication(begin.options);
    } catch (e) {
      const m = String((e as Error)?.message ?? e).toLowerCase();
      if (m.includes("notallowed") || m.includes("timed out") || m.includes("timeout"))
        return { ok: false, code: "cancelled", message: "Passkey prompt cancelled or timed out." };
      return { ok: false, code: "failed", message: (e as Error)?.message ?? "Passkey prompt failed." };
    }

    const { data: fin, error: e2 } = await supabase.functions.invoke("passkey-authenticate", {
      body: { action: "finish", response: asResp },
    });
    if (e2 || !fin?.verified) {
      const raw = String((fin as any)?.error ?? e2?.message ?? "");
      if (/challenge/i.test(raw) || /expired/i.test(raw))
        return { ok: false, code: "expired", message: "Passkey challenge expired. Please retry." };
      return { ok: false, code: "failed", message: raw || "Passkey verification failed." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, code: "network", message: (e as Error)?.message ?? "Unexpected passkey error." };
  }
}