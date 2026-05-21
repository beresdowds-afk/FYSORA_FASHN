import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_BACKOFF_SECONDS = 30;
const MAX_BACKOFF_SECONDS = 60 * 60; // 1 hour

function backoffSeconds(attempt: number): number {
  return Math.min(BASE_BACKOFF_SECONDS * 2 ** attempt, MAX_BACKOFF_SECONDS);
}

async function executeJob(client: ReturnType<typeof createClient>, job: any): Promise<{ ok: boolean; error?: string }> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    if (job.kind === "github_push") {
      const res = await fetch(`${url}/functions/v1/github-repo-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify(job.payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) return { ok: false, error: body?.error || `HTTP ${res.status}` };
      return { ok: true };
    }

    if (job.kind === "pwa_sync" || job.kind === "site_publish") {
      // Broadcast realtime signal to clients listening on the org channel
      const ch = client.channel(`org-sync-${job.org_id}`);
      await ch.send({
        type: "broadcast",
        event: "fsa-sync",
        payload: {
          type: "FSA_UPDATE",
          action: job.kind === "pwa_sync" ? "settings_updated" : "website_published",
          orgId: job.org_id,
          timestamp: Date.now(),
          payload: job.payload,
        },
      });
      return { ok: true };
    }

    return { ok: false, error: `Unknown job kind: ${job.kind}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const nowIso = new Date().toISOString();

  // Pull up to 25 due jobs
  const { data: jobs, error: pullErr } = await client
    .from("deployment_jobs")
    .select("*")
    .in("status", ["queued"])
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(25);

  if (pullErr) {
    return new Response(JSON.stringify({ error: pullErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const results: any[] = [];
  for (const job of jobs || []) {
    // Mark running
    await client.from("deployment_jobs").update({ status: "running", last_run_at: new Date().toISOString() }).eq("id", job.id);

    const r = await executeJob(client, job);
    const nextAttempt = (job.attempt as number) + 1;

    if (r.ok) {
      await client.from("deployment_jobs").update({
        status: "succeeded",
        attempt: nextAttempt,
        last_error: null,
      }).eq("id", job.id);
      results.push({ id: job.id, ok: true });
    } else {
      const isDead = nextAttempt >= (job.max_attempts as number);
      const delay = backoffSeconds(nextAttempt);
      await client.from("deployment_jobs").update({
        status: isDead ? "dead" : "queued",
        attempt: nextAttempt,
        last_error: r.error?.slice(0, 1000) ?? "unknown error",
        next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
      }).eq("id", job.id);
      results.push({ id: job.id, ok: false, error: r.error, next_in_s: delay, dead: isDead });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});