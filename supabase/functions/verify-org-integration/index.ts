import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * End-to-end integration verification.
 * Body: { org_id, api_key (plaintext), webhook_id? }
 * - Hashes api_key, looks it up, validates org match and not revoked.
 * - Optionally signs & POSTs a verify.ping envelope to the webhook URL and
 *   verifies the response status; also recomputes the expected signature
 *   so the caller can confirm header parity.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { ok: false, error: "Unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(url, service);

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json(401, { ok: false, error: "Invalid session" });
  const userId = claims.claims.sub as string;

  let body: any;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "Invalid JSON" }); }
  const { org_id, api_key, webhook_id } = body || {};
  const verifyEvent: string = String(body?.event ?? "integration.verify");
  if (!org_id || typeof api_key !== "string" || api_key.length < 16) {
    return json(400, { ok: false, error: "org_id and api_key required" });
  }

  const [{ data: isSuper }, { data: isAdmin }] = await Promise.all([
    admin.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
    admin.rpc("is_org_admin", { _user_id: userId, _org_id: org_id }),
  ]);
  if (!isSuper && !isAdmin) return json(403, { ok: false, error: "Forbidden" });

  const checks: Record<string, any> = {};

  // API key check
  const keyHash = await sha256Hex(api_key);
  const { data: keyRow } = await admin.from("org_integration_api_keys")
    .select("id, org_id, name, key_prefix, environment, revoked_at, scopes")
    .eq("key_hash", keyHash).maybeSingle();

  if (!keyRow) {
    checks.api_key = { ok: false, reason: "not_found" };
  } else if (keyRow.org_id !== org_id) {
    checks.api_key = { ok: false, reason: "wrong_org" };
  } else if (keyRow.revoked_at) {
    checks.api_key = { ok: false, reason: "revoked", revoked_at: keyRow.revoked_at };
  } else {
    checks.api_key = {
      ok: true, id: keyRow.id, name: keyRow.name, prefix: keyRow.key_prefix,
      environment: keyRow.environment, scopes: keyRow.scopes,
    };
    await admin.from("org_integration_api_keys")
      .update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
  }

  // Optional webhook signature round-trip
  if (webhook_id) {
    const { data: hook } = await admin.from("org_outbound_webhooks")
      .select("id, url, secret, is_active, org_id, events").eq("id", webhook_id).maybeSingle();
    if (!hook || hook.org_id !== org_id) {
      checks.webhook = { ok: false, reason: "not_found" };
    } else if (!hook.is_active) {
      checks.webhook = { ok: false, reason: "inactive" };
    } else if (
      verifyEvent !== "integration.verify" &&
      !(hook.events ?? []).includes(verifyEvent) &&
      !(hook.events ?? []).includes("*")
    ) {
      checks.webhook = {
        ok: false, reason: "scope_mismatch",
        message: `Webhook is not subscribed to "${verifyEvent}"`,
        subscribed_events: hook.events ?? [],
      };
    } else {
      const requestId = crypto.randomUUID();
      const idemKey = `verify_${crypto.randomUUID()}`;
      const envelope = {
        id: requestId, event: verifyEvent, org_id,
        idempotency_key: idemKey, attempt: 1,
        created_at: new Date().toISOString(),
        data: { message: "FSA integration verification ping", initiated_by: userId, scope_test: verifyEvent },
      };
      const bodyStr = JSON.stringify(envelope);
      const signature = await hmacSha256Hex(hook.secret, bodyStr);
      const started = Date.now();
      let status = 0; let respText = ""; let ok = false; let err: string | null = null;
      try {
        const r = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FSA-Event": verifyEvent,
            "X-FSA-Signature": `sha256=${signature}`,
            "X-FSA-Request-Id": requestId,
            "X-FSA-Idempotency-Key": idemKey,
            "User-Agent": "FashionStitchesAfrica-Verify/1.0",
          },
          body: bodyStr,
          signal: AbortSignal.timeout(10_000),
        });
        status = r.status;
        respText = (await r.text()).slice(0, 1000);
        ok = r.ok;
      } catch (e) {
        err = (e as Error).message;
      }
      const duration = Date.now() - started;
      await admin.from("org_webhook_deliveries").insert({
        webhook_id: hook.id, org_id, event: verifyEvent,
        payload: envelope, request_id: requestId,
        response_status: status || null, response_body: respText || err,
        succeeded: ok, duration_ms: duration,
        status: ok ? "success" : "failed", attempt: 1, max_attempts: 1,
        error: err, idempotency_key: idemKey,
      });
      checks.webhook = {
        ok, status, request_id: requestId, duration_ms: duration,
        event_tested: verifyEvent,
        idempotency_key: idemKey,
        signature_header: `sha256=${signature}`,
        signature_algorithm: "HMAC-SHA256",
        body_sent: bodyStr,
        response_preview: respText || err || null,
      };
    }
  }

  const overall = checks.api_key?.ok && (webhook_id ? checks.webhook?.ok : true);
  return json(200, { ok: overall, checks });
});