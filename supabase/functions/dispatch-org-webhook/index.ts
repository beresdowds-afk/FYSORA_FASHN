import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  // Service-role only: callers are other edge functions or the manage endpoint.
  const auth = req.headers.get("Authorization");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (auth !== `Bearer ${service}`) return json(401, { ok: false, error: "Unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, service);

  let body: any;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "Invalid JSON" }); }
  const { org_id, event, payload, only_webhook_id, parent_delivery_id,
          attempt: incomingAttempt, max_attempts: incomingMax,
          idempotency_key: incomingIdem, enforce_scope } = body || {};
  if (!org_id || !event) return json(400, { ok: false, error: "org_id and event required" });

  // Exponential backoff: 1m, 5m, 15m, 1h, 6h, 24h
  const BACKOFF_MIN = [1, 5, 15, 60, 360, 1440];
  const MAX_ATTEMPTS = Math.max(1, Math.min(10, Number(incomingMax) || 6));

  let q = admin.from("org_outbound_webhooks")
    .select("id, url, secret, events, is_active")
    .eq("org_id", org_id).eq("is_active", true);
  if (only_webhook_id) q = q.eq("id", only_webhook_id);
  const { data: hooks, error } = await q;
  if (error) return json(500, { ok: false, error: error.message });

  // Scope filter: if only_webhook_id is provided, enforce_scope=true also
  // requires the hook to subscribe to this event (used by Verify with scope).
  const targets = (hooks ?? []).filter((h) => {
    const subscribed = (h.events ?? []).includes(event) || (h.events ?? []).includes("*");
    if (only_webhook_id) return enforce_scope ? subscribed : true;
    return subscribed;
  });

  // Idempotency key: stable across retries / replays of the same logical event.
  // - Caller may pass one explicitly.
  // - Otherwise we generate one per logical event (one per dispatch invocation),
  //   so the same key is sent to every target webhook of this call.
  const idempotencyKey: string = String(incomingIdem || `evt_${crypto.randomUUID()}`);
  const results: any[] = [];

  for (const hook of targets) {
    const requestId = crypto.randomUUID();
    const envelope = {
      id: requestId,
      event,
      org_id,
      idempotency_key: idempotencyKey,
      attempt: Number(incomingAttempt) || 1,
      created_at: new Date().toISOString(),
      data: payload ?? {},
    };
    const bodyStr = JSON.stringify(envelope);
    const signature = await hmacSha256Hex(hook.secret, bodyStr);
    const started = Date.now();
    let status = 0;
    let respText = "";
    let ok = false;
    let errMsg: string | null = null;
    try {
      const resp = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FSA-Event": event,
          "X-FSA-Signature": `sha256=${signature}`,
          "X-FSA-Request-Id": requestId,
          "X-FSA-Idempotency-Key": idempotencyKey,
          "X-FSA-Attempt": String(incomingAttempt || 1),
          "User-Agent": "FashionStitchesAfrica-Webhook/1.0",
        },
        body: bodyStr,
        signal: AbortSignal.timeout(10_000),
      });
      status = resp.status;
      respText = (await resp.text()).slice(0, 2000);
      ok = resp.ok;
    } catch (e) {
      errMsg = (e as Error).message;
      respText = `network_error: ${errMsg}`.slice(0, 2000);
    }
    const duration = Date.now() - started;

    const attempt = Number(incomingAttempt) || 1;
    let nextRetryAt: string | null = null;
    let deliveryStatus: "success" | "pending_retry" | "dead_letter" | "failed" = "success";
    if (!ok) {
      if (attempt < MAX_ATTEMPTS) {
        const mins = BACKOFF_MIN[Math.min(attempt - 1, BACKOFF_MIN.length - 1)];
        nextRetryAt = new Date(Date.now() + mins * 60_000).toISOString();
        deliveryStatus = "pending_retry";
      } else {
        deliveryStatus = "dead_letter";
      }
      // Structured log so failures are searchable in Cloud logs.
      console.error(JSON.stringify({
        level: "error",
        source: "dispatch-org-webhook",
        event,
        org_id,
        webhook_id: hook.id,
        webhook_url: hook.url,
        request_id: requestId,
        idempotency_key: idempotencyKey,
        attempt,
        max_attempts: MAX_ATTEMPTS,
        response_status: status,
        duration_ms: duration,
        error: errMsg,
        response_body_preview: respText.slice(0, 500),
        outcome: deliveryStatus,
      }));
    }

    await admin.from("org_webhook_deliveries").insert({
      webhook_id: hook.id, org_id, event, payload: envelope, request_id: requestId,
      response_status: status || null, response_body: respText, succeeded: ok, duration_ms: duration,
      attempt, max_attempts: MAX_ATTEMPTS, status: deliveryStatus,
      next_retry_at: nextRetryAt, parent_delivery_id: parent_delivery_id ?? null,
      error: errMsg, idempotency_key: idempotencyKey,
    });
    await admin.from("org_outbound_webhooks").update({
      last_delivery_at: new Date().toISOString(),
      last_status: status || null,
      failure_count: ok ? 0 : (hook as any).failure_count != null ? ((hook as any).failure_count + 1) : 1,
    }).eq("id", hook.id);

    results.push({ webhook_id: hook.id, status, ok, request_id: requestId, attempt,
      status_label: deliveryStatus, next_retry_at: nextRetryAt, idempotency_key: idempotencyKey });
  }

  // If a scope-enforced single-webhook call matched nothing, return a 422-style result so callers can show a clear error.
  if (only_webhook_id && targets.length === 0) {
    return json(200, { ok: false, dispatched: 0, results: [], scope_mismatch: true,
      error: `Webhook is not subscribed to "${event}"` });
  }
  return json(200, { ok: true, dispatched: results.length, results });
});