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

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

  const { action, org_id } = body || {};
  if (!action || !org_id) return json(400, { ok: false, error: "action and org_id required" });

  // Authorization: super admin OR org admin/manager
  const { data: isSuper } = await admin.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  const { data: isAdmin } = await admin.rpc("is_org_admin", { _user_id: userId, _org_id: org_id });
  if (!isSuper && !isAdmin) return json(403, { ok: false, error: "Forbidden" });

  try {
    switch (action) {
      case "create_api_key": {
        const name = String(body.name ?? "").trim();
        const scopes: string[] = Array.isArray(body.scopes) ? body.scopes.slice(0, 12) : ["catalogue:read", "orders:write"];
        const environment = body.environment === "test" ? "test" : "live";
        if (!name || name.length > 80) return json(400, { ok: false, error: "Name 1-80 chars required" });
        const raw = randomToken(32);
        const prefix = `fsa_${environment}_${raw.slice(0, 8)}`;
        const plaintext = `${prefix}_${raw.slice(8)}`;
        const key_hash = await sha256Hex(plaintext);
        const { data, error } = await admin.from("org_integration_api_keys").insert({
          org_id, name, key_prefix: prefix, key_hash, scopes, environment, created_by: userId,
        }).select("id, name, key_prefix, scopes, environment, created_at").single();
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true, key: data, plaintext });
      }
      case "revoke_api_key": {
        const id = String(body.key_id ?? "");
        if (!id) return json(400, { ok: false, error: "key_id required" });
        const { error } = await admin.from("org_integration_api_keys")
          .update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("org_id", org_id);
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true });
      }
      case "delete_api_key": {
        const id = String(body.key_id ?? "");
        const { error } = await admin.from("org_integration_api_keys").delete().eq("id", id).eq("org_id", org_id);
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true });
      }
      case "create_webhook": {
        const webhookUrl = String(body.url ?? "").trim();
        const description = body.description ? String(body.description).slice(0, 240) : null;
        const events: string[] = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
        if (!/^https?:\/\/.+/i.test(webhookUrl)) return json(400, { ok: false, error: "Valid URL required" });
        if (events.length === 0) return json(400, { ok: false, error: "Select at least one event" });
        const secret = `whsec_${randomToken(24)}`;
        const { data, error } = await admin.from("org_outbound_webhooks").insert({
          org_id, url: webhookUrl, description, events, secret, created_by: userId,
        }).select("*").single();
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true, webhook: data });
      }
      case "update_webhook": {
        const id = String(body.webhook_id ?? "");
        const patch: Record<string, unknown> = {};
        if (typeof body.url === "string") patch.url = body.url;
        if (typeof body.description === "string") patch.description = body.description;
        if (Array.isArray(body.events)) patch.events = body.events.slice(0, 20);
        if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
        const { error } = await admin.from("org_outbound_webhooks")
          .update(patch).eq("id", id).eq("org_id", org_id);
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true });
      }
      case "rotate_webhook_secret": {
        const id = String(body.webhook_id ?? "");
        const secret = `whsec_${randomToken(24)}`;
        const { error } = await admin.from("org_outbound_webhooks")
          .update({ secret }).eq("id", id).eq("org_id", org_id);
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true, secret });
      }
      case "delete_webhook": {
        const id = String(body.webhook_id ?? "");
        const { error } = await admin.from("org_outbound_webhooks").delete().eq("id", id).eq("org_id", org_id);
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true });
      }
      case "test_webhook": {
        const id = String(body.webhook_id ?? "");
        const dispatcherUrl = `${url}/functions/v1/dispatch-org-webhook`;
        const r = await fetch(dispatcherUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}` },
          body: JSON.stringify({
            org_id, event: "ping",
            payload: { message: "Test event from Fashion Stitches Africa", at: new Date().toISOString() },
            only_webhook_id: id,
          }),
        });
        const out = await r.json();
        return json(200, { ok: true, dispatch: out });
      }
      default:
        return json(400, { ok: false, error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});