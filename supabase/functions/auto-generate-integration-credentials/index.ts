// Auto-generates / rotates shareable API key + HMAC signing secret + webhook URL
// for an external website / API registration. Returns plaintext values ONCE.
// Only SHA-256 hashes are persisted. Plaintext NEVER goes into logs or DB.
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

// 3–60 chars: letters, digits, space, _ - . /
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _\-.\/]{2,59}$/;

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

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json(401, { error: "missing token" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
    const uid = userData.user.id;
    const actorEmail = userData.user.email ?? null;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isSuper } = await admin.rpc("has_role", { _user_id: uid, _role: "super_admin" });
    if (!isSuper) return json(403, { error: "super_admin required" });

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "rotate" ? "rotate" : "generate";
    const name = String(body?.name ?? "").trim();
    const kind = String(body?.kind ?? "external_api");
    const baseUrl = body?.base_url ? String(body.base_url).trim() : null;
    const environment = body?.environment === "test" ? "test" : "live";

    if (!NAME_RE.test(name)) {
      return json(400, { error: "Name must be 3–60 chars. Allowed: letters, digits, space, dot, dash, underscore, slash. Must start with a letter or digit." });
    }
    if (!ALLOWED_KINDS.has(kind)) return json(400, { error: "invalid kind" });

    const slug = slugify(name);

    // Existing active integration for same slug + environment?
    const { data: existingRows } = await admin
      .from("external_integrations")
      .select("id, name, metadata, is_active")
      .eq("is_active", true)
      .filter("metadata->>slug", "eq", slug)
      .filter("metadata->>environment", "eq", environment);
    const existing = (existingRows ?? [])[0] ?? null;

    if (action === "generate" && existing) {
      return json(409, {
        error: `An active integration named "${existing.name}" already exists in the ${environment} environment. Use Rotate to regenerate.`,
        code: "duplicate_name",
      });
    }
    if (action === "rotate" && !existing) {
      return json(404, {
        error: `No active integration found for "${name}" in ${environment}. Generate one first.`,
        code: "not_found",
      });
    }

    const apiKeyPlain = `fysk_${environment}_${randomBytesHex(24)}`;
    const apiKeyHash = await sha256Hex(apiKeyPlain);
    const apiKeyPrefix = apiKeyPlain.slice(0, 14);
    const signingSecret = randomBytesHex(32);
    const hmacSecretName = `FYSORA_INTEGRATION_${slug.toUpperCase()}_SECRET`;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/fysora-companion-webhook?source=${encodeURIComponent(slug)}`;

    let supersededId: string | null = null;
    if (action === "rotate" && existing) {
      supersededId = existing.id;
      await admin.from("external_integrations").update({ is_active: false }).eq("id", existing.id);
      await admin.from("platform_api_keys").update({ is_active: false }).like("key_name", `auto_${slug}_%`);
    }

    const { data: integ, error: integErr } = await admin
      .from("external_integrations")
      .insert({
        kind, name,
        base_url: baseUrl,
        description: `Auto-generated credentials issued ${new Date().toISOString()}`,
        hmac_secret_name: hmacSecretName,
        proxy_enabled: false,
        auth_passthrough: true,
        rate_limit_per_minute: 120,
        is_active: true,
        created_by: uid,
        metadata: { auto_generated: true, api_key_prefix: apiKeyPrefix, environment, slug, superseded_id: supersededId },
      })
      .select("id").single();
    if (integErr) throw integErr;

    await admin.from("platform_api_keys").insert({
      provider: kind,
      key_name: `auto_${slug}_api_key_${Date.now()}`,
      key_value: apiKeyHash,
      is_active: true,
      description: `[AUTO] ${name} — prefix ${apiKeyPrefix}… (SHA-256 hashed)`,
    });
    await admin.from("platform_api_keys").insert({
      provider: kind,
      key_name: `auto_${slug}_webhook_secret_${Date.now()}`,
      key_value: await sha256Hex(signingSecret),
      is_active: true,
      description: `[AUTO] ${name} — HMAC signing secret (hashed). Name: ${hmacSecretName}`,
    });

    await admin.from("audit_logs").insert({
      user_id: uid,
      action: action === "rotate" ? "rotated_integration_credentials" : "auto_generated_integration_credentials",
      entity_type: "external_integration",
      entity_id: integ.id,
      metadata: { name, kind, environment, api_key_prefix: apiKeyPrefix, hmac_secret_name: hmacSecretName, superseded_id: supersededId },
    });
    await admin.from("integration_credential_events").insert({
      integration_id: integ.id,
      integration_name: name,
      slug, environment,
      action: action === "rotate" ? "rotated" : "generated",
      api_key_prefix: apiKeyPrefix,
      hmac_secret_name: hmacSecretName,
      webhook_url: webhookUrl,
      superseded_integration_id: supersededId,
      actor_user_id: uid,
      actor_email: actorEmail,
      request_metadata: {
        kind,
        user_agent: req.headers.get("user-agent") ?? null,
        ip: req.headers.get("x-forwarded-for") ?? null,
      },
    });

    return json(200, {
      ok: true,
      action: action === "rotate" ? "rotated" : "generated",
      integration_id: integ.id,
      superseded_integration_id: supersededId,
      api_key: apiKeyPlain,
      api_key_prefix: apiKeyPrefix,
      signing_secret: signingSecret,
      hmac_secret_name: hmacSecretName,
      webhook_url: webhookUrl,
      environment,
      notice: "Copy these values now — they will not be shown again. Only hashes are stored.",
    });
  } catch (e) {
    console.error("auto-generate-integration-credentials error", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
