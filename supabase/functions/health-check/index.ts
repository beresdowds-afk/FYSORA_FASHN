import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Runtime health check for the FYSORA FASHN backend.
 *
 * GET /functions/v1/health-check
 *
 * Verifies, in order:
 *   1. Required environment variables are present and well formed.
 *   2. The anon/publishable key can reach PostgREST (public read path).
 *   3. The service-role key can reach the database (privileged path).
 *   4. The auth service (GoTelling /auth/v1/health) is reachable.
 *   5. Core tables/views the app depends on still resolve.
 *
 * Returns 200 when healthy, 503 with a per-check breakdown otherwise.
 */

type CheckStatus = "ok" | "fail" | "skipped";

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
  remediation?: string;
  duration_ms: number;
}

const REQUIRED_TABLES = [
  "organizations",
  "org_websites",
  "org_websites_public",
  "profiles",
  "user_roles",
];

function isWellFormedUrl(u: string | undefined): boolean {
  return !!u && /^https:\/\/[a-z0-9-]+\.(supabase\.co|lovable\.cloud)\/?$/i.test(u);
}

async function timed(name: string, fn: () => Promise<Omit<Check, "name" | "duration_ms">>): Promise<Check> {
  const started = Date.now();
  try {
    const res = await fn();
    return { name, ...res, duration_ms: Date.now() - started };
  } catch (err) {
    return {
      name,
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
      remediation: "Unexpected exception during the check — see detail.",
      duration_ms: Date.now() - started,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const checks: Check[] = [];

  // 1. Environment
  checks.push(
    await timed("environment", async () => {
      const missing: string[] = [];
      if (!SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!ANON_KEY) missing.push("SUPABASE_ANON_KEY");
      if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      if (missing.length) {
        return {
          status: "fail" as const,
          detail: `Missing environment variable(s): ${missing.join(", ")}`,
          remediation: "Re-bind the backend runtime secrets, then redeploy this function.",
        };
      }
      if (!isWellFormedUrl(SUPABASE_URL)) {
        return {
          status: "fail" as const,
          detail: `SUPABASE_URL is malformed: "${SUPABASE_URL}"`,
          remediation: 'Expected "https://<project-ref>.supabase.co".',
        };
      }
      return { status: "ok" as const, detail: "All required environment variables present." };
    }),
  );

  const envOk = checks[0].status === "ok";

  // 2. Anon / publishable key reachability
  checks.push(
    await timed("anon_key_connectivity", async () => {
      if (!envOk) return { status: "skipped" as const, detail: "Environment check failed." };
      const anon = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });
      const { error } = await anon.from("org_websites_public").select("org_id").limit(1);
      if (error) {
        const badKey = /invalid api key|jwt/i.test(error.message);
        return {
          status: "fail" as const,
          detail: `${error.code ?? "?"}: ${error.message}`,
          remediation: badKey
            ? "The publishable/anon key is invalid or was rotated. Update the frontend .env and re-publish."
            : "PostgREST rejected the request. Check RLS policies and GRANTs on org_websites_public.",
        };
      }
      return { status: "ok" as const, detail: "Publishable key can read the public website view." };
    }),
  );

  // 3. Service role reachability
  checks.push(
    await timed("service_role_connectivity", async () => {
      if (!envOk) return { status: "skipped" as const, detail: "Environment check failed." };
      const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });
      const { error } = await admin.from("organizations").select("id").limit(1);
      if (error) {
        return {
          status: "fail" as const,
          detail: `${error.code ?? "?"}: ${error.message}`,
          remediation:
            "The service-role key is missing or stale. Re-bind the backend secrets and redeploy.",
        };
      }
      return { status: "ok" as const, detail: "Service-role key can query the database." };
    }),
  );

  // 4. Auth service
  checks.push(
    await timed("auth_service", async () => {
      if (!envOk) return { status: "skipped" as const, detail: "Environment check failed." };
      const res = await fetch(`${SUPABASE_URL!.replace(/\/$/, "")}/auth/v1/health`, {
        headers: { apikey: ANON_KEY! },
      });
      if (!res.ok) {
        return {
          status: "fail" as const,
          detail: `Auth health returned HTTP ${res.status}`,
          remediation:
            res.status === 401
              ? "The anon key is not accepted by the auth service — credentials are misconfigured or rotated."
              : "Auth service is unreachable or degraded.",
        };
      }
      await res.text();
      return { status: "ok" as const, detail: "Auth service responded." };
    }),
  );

  // 5. Core relations resolve
  checks.push(
    await timed("core_relations", async () => {
      if (!envOk) return { status: "skipped" as const, detail: "Environment check failed." };
      const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });
      const broken: string[] = [];
      for (const rel of REQUIRED_TABLES) {
        const { error } = await admin.from(rel).select("*").limit(1);
        if (error) broken.push(`${rel} (${error.code ?? "?"}: ${error.message})`);
      }
      if (broken.length) {
        return {
          status: "fail" as const,
          detail: `Unreachable relation(s): ${broken.join("; ")}`,
          remediation: "A migration or view was dropped. Check the Schema Alerts dashboard.",
        };
      }
      return { status: "ok" as const, detail: `${REQUIRED_TABLES.length} core relations reachable.` };
    }),
  );

  const failed = checks.filter((c) => c.status === "fail");
  const healthy = failed.length === 0;

  const body = {
    status: healthy ? "healthy" : "unhealthy",
    checked_at: new Date().toISOString(),
    project_ref: SUPABASE_URL?.match(/https:\/\/([a-z0-9-]+)\./i)?.[1] ?? null,
    failed_checks: failed.map((c) => c.name),
    checks,
  };

  if (!healthy) {
    console.error("[health-check] unhealthy", JSON.stringify(body));
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: healthy ? 200 : 503,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
