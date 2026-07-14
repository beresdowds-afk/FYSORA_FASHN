// Passkey recovery: generate & redeem one-time backup codes.
// - action=generate : requires a live session; issues 10 codes, stores hashes,
//                     returns the plaintext codes ONCE.
// - action=redeem   : requires a live session (user completed email/password
//                     sign-in but has no passkeys / lost their device); on a
//                     valid unused code we mark it used and flip
//                     `passkey_second_factor_required` to false so the user
//                     can re-enter their account and re-enroll a passkey.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("health") }),
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("generate") }),
  z.object({
    action: z.literal("redeem"),
    code: z.string().trim().min(10).max(11),
  }),
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomCode(): string {
  // 10 base32-ish chars → grouped e.g. XXXXX-XXXXX
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += alphabet[b % alphabet.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}`;
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid recovery action or request data." }, 400);
    const body = parsed.data;

    // Public, read-only deploy probe. The RPC itself is service-role-only and
    // returns object-presence booleans without exposing credential data.
    if (body.action === "health") {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await admin.rpc("passkey_deployment_health_check");
      if (error) return json({ ok: false, error: error.message }, 503);
      return json(data, data?.ok === true ? 200 : 503);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const user = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const action = body.action;

    if (action === "status") {
      const { count } = await admin
        .from("webauthn_backup_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);
      return json({ unused: count ?? 0 });
    }

    if (action === "generate") {
      // Wipe old codes (used or not) and issue a fresh set of 10.
      await admin.from("webauthn_backup_codes").delete().eq("user_id", user.id);
      const codes: string[] = [];
      const rows: { user_id: string; code_hash: string }[] = [];
      for (let i = 0; i < 10; i++) {
        const c = randomCode();
        codes.push(c);
        rows.push({ user_id: user.id, code_hash: await hashCode(c) });
      }
      const { error } = await admin.from("webauthn_backup_codes").insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ codes });
    }

    if (action === "redeem") {
      const raw = body.code.trim().toUpperCase();
      if (!/^[A-Z0-9]{5}-?[A-Z0-9]{5}$/.test(raw)) {
        return json({ error: "Enter a backup code in the format XXXXX-XXXXX." }, 400);
      }
      const normalized = raw.includes("-") ? raw : `${raw.slice(0, 5)}-${raw.slice(5)}`;
      const hash = await hashCode(normalized);
      const { data: match, error: findErr } = await admin
        .from("webauthn_backup_codes")
        .select("id, used_at")
        .eq("user_id", user.id)
        .eq("code_hash", hash)
        .maybeSingle();
      if (findErr) return json({ error: findErr.message }, 500);
      if (!match) return json({ error: "That backup code is not recognised." }, 400);
      if (match.used_at) return json({ error: "That backup code has already been used." }, 400);

      const { error: usedErr } = await admin
        .from("webauthn_backup_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", match.id);
      if (usedErr) return json({ error: usedErr.message }, 500);

      // Disable passkey second-factor so the user can get back in and re-enroll.
      await admin
        .from("profiles")
        .update({ passkey_second_factor_required: false } as any)
        .eq("id", user.id);

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});