import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Provider = "smile_id" | "youverify" | "identitypass";

interface TestResult {
  success: boolean;
  status_code?: number;
  latency_ms: number;
  message: string;
  details?: unknown;
}

async function getKey(client: ReturnType<typeof createClient>, provider: string, keyName: string): Promise<string | null> {
  const { data } = await client
    .from("org_api_keys")
    .select("key_value")
    .is("org_id", null)
    .eq("provider", provider)
    .eq("key_name", keyName)
    .eq("is_active", true)
    .maybeSingle();
  return (data as any)?.key_value ?? Deno.env.get(`${provider.toUpperCase()}_${keyName.toUpperCase()}`) ?? null;
}

async function pingSmileId(client: ReturnType<typeof createClient>, env: string): Promise<TestResult> {
  const t = performance.now();
  const partner = await getKey(client, "smile_id", "partner_id");
  const apiKey = await getKey(client, "smile_id", "api_key");
  if (!partner || !apiKey) {
    return { success: false, latency_ms: 0, message: "Missing smile_id partner_id or api_key" };
  }
  const base = env === "live" ? "https://api.smileidentity.com" : "https://testapi.smileidentity.com";
  try {
    const res = await fetch(`${base}/v1/services`, { method: "GET", headers: { "Content-Type": "application/json" } });
    const text = await res.text();
    return {
      success: res.ok,
      status_code: res.status,
      latency_ms: Math.round(performance.now() - t),
      message: res.ok ? "Smile ID reachable with credentials" : `HTTP ${res.status}: ${text.slice(0, 160)}`,
    };
  } catch (e) {
    return { success: false, latency_ms: Math.round(performance.now() - t), message: (e as Error).message };
  }
}

async function pingYouVerify(client: ReturnType<typeof createClient>, env: string): Promise<TestResult> {
  const t = performance.now();
  const token = await getKey(client, "youverify", "api_key");
  if (!token) return { success: false, latency_ms: 0, message: "Missing youverify api_key" };
  const base = env === "live" ? "https://api.youverify.co" : "https://api.sandbox.youverify.co";
  try {
    const res = await fetch(`${base}/v2/api/identity/health`, { headers: { token } });
    return {
      success: res.status < 500,
      status_code: res.status,
      latency_ms: Math.round(performance.now() - t),
      message: res.status < 500 ? "YouVerify reachable" : `HTTP ${res.status}`,
    };
  } catch (e) {
    return { success: false, latency_ms: Math.round(performance.now() - t), message: (e as Error).message };
  }
}

async function pingIdentityPass(client: ReturnType<typeof createClient>, env: string): Promise<TestResult> {
  const t = performance.now();
  const secret = await getKey(client, "identitypass", "api_key");
  const appId = await getKey(client, "identitypass", "app_id");
  if (!secret || !appId) return { success: false, latency_ms: 0, message: "Missing identitypass api_key or app_id" };
  const base = env === "live" ? "https://api.prembly.com" : "https://sandbox.api.prembly.com";
  try {
    const res = await fetch(`${base}/identitypass/verification/health`, {
      headers: { "x-api-key": secret, "app-id": appId },
    });
    return {
      success: res.status < 500,
      status_code: res.status,
      latency_ms: Math.round(performance.now() - t),
      message: res.status < 500 ? "IdentityPass reachable" : `HTTP ${res.status}`,
    };
  } catch (e) {
    return { success: false, latency_ms: Math.round(performance.now() - t), message: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { provider, environment = "sandbox" } = await req.json() as { provider: Provider; environment?: string };
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let result: TestResult;
    if (provider === "smile_id") result = await pingSmileId(client, environment);
    else if (provider === "youverify") result = await pingYouVerify(client, environment);
    else if (provider === "identitypass") result = await pingIdentityPass(client, environment);
    else return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get caller from auth header for tested_by
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();

    await client.from("verification_provider_test_log").insert({
      provider, environment,
      success: result.success,
      status_code: result.status_code ?? null,
      latency_ms: result.latency_ms,
      message: result.message,
      tested_by: u?.user?.id ?? null,
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("test-identity-provider error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});