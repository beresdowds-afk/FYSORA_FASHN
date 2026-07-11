// Passkey (WebAuthn) authentication: begin + finish.
// Used as a SECOND-FACTOR check after email/password sign-in.
// The Supabase session is created by password auth; this function only
// verifies possession of an enrolled passkey and marks last_used_at.
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@10.0.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

function rpIdFromOrigin(origin: string): string {
  try { return new URL(origin).hostname; } catch { return "localhost"; }
}
function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
    const body = await req.json().catch(() => ({}));
    const action = body.action as "begin" | "finish";
    const origin = req.headers.get("origin") ?? "";
    const rpID = rpIdFromOrigin(origin);

    if (action === "begin") {
      const { data: creds } = await admin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      if (!creds || creds.length === 0) {
        return json({ error: "No passkeys enrolled for this account" }, 404);
      }

      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
        allowCredentials: creds.map((c: any) => ({
          id: c.credential_id,
          transports: c.transports ?? [],
        })),
      });

      await admin.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        purpose: "authentication",
      });

      return json({ options });
    }

    if (action === "finish") {
      const { response } = body as { response: any };

      const { data: chal } = await admin
        .from("webauthn_challenges")
        .select("id, challenge")
        .eq("user_id", user.id)
        .eq("purpose", "authentication")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!chal) return json({ error: "No active challenge — please retry" }, 400);

      const { data: stored } = await admin
        .from("webauthn_credentials")
        .select("id, credential_id, public_key, counter, transports")
        .eq("user_id", user.id)
        .eq("credential_id", response.id)
        .maybeSingle();

      if (!stored) return json({ error: "Unknown passkey" }, 404);

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: chal.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: stored.credential_id,
          publicKey: b64uToBytes(stored.public_key),
          counter: Number(stored.counter ?? 0),
          transports: stored.transports ?? [],
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        return json({ error: "Passkey verification failed" }, 400);
      }

      await admin
        .from("webauthn_credentials")
        .update({
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", stored.id);

      await admin.from("webauthn_challenges").delete().eq("id", chal.id);
      return json({ ok: true, verified: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[passkey-authenticate]", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}