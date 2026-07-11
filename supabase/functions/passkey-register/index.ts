// Passkey (WebAuthn) registration: begin + finish.
// Users enroll a passkey on THEIR device — no admin provisioning.
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
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

const RP_NAME = "FYSORA FASHN";

function rpIdFromOrigin(origin: string): string {
  try { return new URL(origin).hostname; } catch { return "localhost"; }
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
      const { data: existing } = await admin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email ?? user.id,
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        excludeCredentials: (existing ?? []).map((c: any) => ({
          id: c.credential_id,
          transports: c.transports ?? [],
        })),
      });

      await admin.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        purpose: "registration",
      });

      return json({ options });
    }

    if (action === "finish") {
      const { response, nickname } = body as { response: any; nickname?: string };

      const { data: chal } = await admin
        .from("webauthn_challenges")
        .select("id, challenge, expires_at")
        .eq("user_id", user.id)
        .eq("purpose", "registration")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!chal) return json({ error: "No active challenge — please retry" }, 400);

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: chal.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "Passkey verification failed" }, 400);
      }

      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      await admin.from("webauthn_credentials").insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: Buffer_toBase64Url(credential.publicKey),
        counter: credential.counter ?? 0,
        transports: response.response?.transports ?? [],
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        nickname: nickname ?? null,
      });

      await admin.from("webauthn_challenges").delete().eq("id", chal.id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[passkey-register]", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function Buffer_toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}