// Auto-generates shareable API key, signing secret and webhook URL for an
// external website / API registration. Returns the plaintext values ONCE.
// Stores only the SHA-256 hash of the API key in platform_api_keys.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_KINDS = new Set([
  "domain", "external_api", "companion_pwa", "webhook_consumer", "worker",
]);

function randomBytesHex(len: number) {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "integration";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    // Verify caller is a super_admin
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return new Response(JSON.stringify({ error: "missing token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isSuper } = await admin.rpc("has_role", { _user_id: uid, _role: "super_admin" });
    if (!isSuper) {
      return new Response(JSON.stringify({ error: "super_admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const kind = String(body?.kind ?? "external_api");
    const baseUrl = body?.base_url ? String(body.base_url).trim() : null;
    const environment = (body?.environment === "test" ? "test" : "live");

    if (!name || name.length > 100) {
      return new Response(JSON.stringify({ error: "name required (max 100 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ALLOWED_KINDS.has(kind)) {
      return new Response(JSON.stringify({ error: "invalid kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const slug = slugify(name);
    const apiKeyPlain = `fysk_${environment}_${randomBytesHex(24)}`;
    const apiKeyHash = await sha256Hex(apiKeyPlain);
    const apiKeyPrefix = apiKeyPlain.slice(0, 14);
    const signingSecret = randomBytesHex(32);
    const hmacSecretName = `FYSORA_INTEGRATION_${slug.toUpperCase()}_SECRET`;

    const webhookUrl = `${SUPABASE_URL}/functions/v1/fysora-companion-webhook?source=${encodeURIComponent(slug)}`;

    // 1. Register external integration
    const { data: integ, error: integErr } = await admin
      .from("external_integrations")
      .insert({
        kind,
        name,
        base_url: baseUrl,
        description: `Auto-generated credentials issued ${new Date().toISOString()}`,
        hmac_secret_name: hmacSecretName,
        proxy_enabled: false,
        auth_passthrough: true,
        rate_limit_per_minute: 120,
        is_active: true,
        created_by: uid,
        metadata: {
          auto_generated: true,
          api_key_prefix: apiKeyPrefix,
          environment,
          slug,
        },
      })
      .select("id")
      .single();
    if (integErr) throw integErr;

    // 2. Store hashed API key in platform_api_keys (value = sha256 hash, not plaintext)
    await admin.from("platform_api_keys").insert({
      provider: kind,
      key_name: `auto_${slug}_api_key`,
      key_value: apiKeyHash,
      is_active: true,
      description: `[AUTO] ${name} — prefix ${apiKeyPrefix}… (SHA-256 hashed; plaintext shown to admin once)`,
    });

    // 3. Store signing secret reference (hash only) in platform_api_keys for audit
    await admin.from("platform_api_keys").insert({
      provider: kind,
      key_name: `auto_${slug}_webhook_secret`,
      key_value: await sha256Hex(signingSecret),
      is_active: true,
      description: `[AUTO] ${name} — HMAC signing secret (hashed). Secret name: ${hmacSecretName}`,
    });

    // 4. Audit
    await admin.from("audit_logs").insert({
      user_id: uid,
      action: "auto_generated_integration_credentials",
      entity_type: "external_integration",
      entity_id: integ.id,
      metadata: { name, kind, environment, api_key_prefix: apiKeyPrefix, hmac_secret_name: hmacSecretName },
    });

    return new Response(JSON.stringify({
      ok: true,
      integration_id: integ.id,
      api_key: apiKeyPlain,
      api_key_prefix: apiKeyPrefix,
      signing_secret: signingSecret,
      hmac_secret_name: hmacSecretName,
      webhook_url: webhookUrl,
      environment,
      notice: "Copy these values now — they will not be shown again. Only hashes are stored.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auto-generate-integration-credentials error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});