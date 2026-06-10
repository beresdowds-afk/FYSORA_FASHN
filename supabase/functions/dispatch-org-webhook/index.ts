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
  const { org_id, event, payload, only_webhook_id } = body || {};
  if (!org_id || !event) return json(400, { ok: false, error: "org_id and event required" });

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
    try {
      const resp = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FSA-Event": event,
          "X-FSA-Signature": `sha256=${signature}`,
          "X-FSA-Request-Id": requestId,
          "User-Agent": "FashionStitchesAfrica-Webhook/1.0",
        },
        body: bodyStr,
        signal: AbortSignal.timeout(10_000),
      });
      status = resp.status;
      respText = (await resp.text()).slice(0, 2000);
      ok = resp.ok;
    } catch (e) {
      respText = `network_error: ${(e as Error).message}`.slice(0, 2000);
    }
    const duration = Date.now() - started;

    await admin.from("org_webhook_deliveries").insert({
      webhook_id: hook.id, org_id, event, payload: envelope, request_id: requestId,
      response_status: status || null, response_body: respText, succeeded: ok, duration_ms: duration,
    });
    await admin.from("org_outbound_webhooks").update({
      last_delivery_at: new Date().toISOString(),
      last_status: status || null,
      failure_count: ok ? 0 : (hook as any).failure_count != null ? ((hook as any).failure_count + 1) : 1,
    }).eq("id", hook.id);

    results.push({ webhook_id: hook.id, status, ok, request_id: requestId });
  }

  return json(200, { ok: true, dispatched: results.length, results });
});