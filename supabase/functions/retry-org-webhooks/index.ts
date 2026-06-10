import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Scheduled retry processor. Pulls deliveries with status=pending_retry
 * whose next_retry_at <= now, and re-dispatches them via dispatch-org-webhook.
 * Safe to invoke from pg_cron or a scheduler. Service-role only.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${service}`) return json(401, { ok: false, error: "Unauthorized" });

  const admin = createClient(url, service);
  const limit = 25;

  const { data: due, error } = await admin
    .from("org_webhook_deliveries")
    .select("id, webhook_id, org_id, event, payload, attempt, max_attempts")
    .eq("status", "pending_retry")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  if (error) return json(500, { ok: false, error: error.message });
  if (!due || due.length === 0) return json(200, { ok: true, processed: 0 });

  const ids = due.map((d) => d.id);
  // Mark in-flight so a concurrent run won't pick them up
  await admin.from("org_webhook_deliveries")
    .update({ status: "retrying" }).in("id", ids);

  const results: any[] = [];
  for (const d of due) {
    const data = (d.payload as any)?.data ?? {};
    const r = await fetch(`${url}/functions/v1/dispatch-org-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}` },
      body: JSON.stringify({
        org_id: d.org_id, event: d.event, payload: data,
        only_webhook_id: d.webhook_id,
        attempt: (d.attempt ?? 1) + 1,
        max_attempts: d.max_attempts ?? 6,
        parent_delivery_id: d.id,
      }),
    });
    const out = await r.json().catch(() => ({}));
    results.push({ delivery_id: d.id, ...out });
  }

  return json(200, { ok: true, processed: due.length, results });
});