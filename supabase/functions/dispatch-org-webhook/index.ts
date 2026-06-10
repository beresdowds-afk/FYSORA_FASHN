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
  const { org_id, event, payload, only_webhook_id, parent_delivery_id, attempt: incomingAttempt, max_attempts: incomingMax } = body || {};
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

  const targets = (hooks ?? []).filter((h) => only_webhook_id || (h.events ?? []).includes(event) || (h.events ?? []).includes("*"));
  const results: any[] = [];

  for (const hook of targets) {
    const requestId = crypto.randomUUID();
    const envelope = { id: requestId, event, org_id, created_at: new Date().toISOString(), data: payload ?? {} };
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
    }

    await admin.from("org_webhook_deliveries").insert({
      webhook_id: hook.id, org_id, event, payload: envelope, request_id: requestId,
      response_status: status || null, response_body: respText, succeeded: ok, duration_ms: duration,
      attempt, max_attempts: MAX_ATTEMPTS, status: deliveryStatus,
      next_retry_at: nextRetryAt, parent_delivery_id: parent_delivery_id ?? null,
      error: errMsg,
    });
    await admin.from("org_outbound_webhooks").update({
      last_delivery_at: new Date().toISOString(),
      last_status: status || null,
      failure_count: ok ? 0 : (hook as any).failure_count != null ? ((hook as any).failure_count + 1) : 1,
    }).eq("id", hook.id);

    results.push({ webhook_id: hook.id, status, ok, request_id: requestId, attempt, status_label: deliveryStatus, next_retry_at: nextRetryAt });
  }

  return json(200, { ok: true, dispatched: results.length, results });
});