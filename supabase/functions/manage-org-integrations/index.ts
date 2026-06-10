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
      case "rotate_api_key": {
        const id = String(body.key_id ?? "");
        if (!id) return json(400, { ok: false, error: "key_id required" });
        const { data: existing, error: exErr } = await admin
          .from("org_integration_api_keys")
          .select("environment, org_id, revoked_at").eq("id", id).maybeSingle();
        if (exErr || !existing || existing.org_id !== org_id) {
          return json(400, { ok: false, error: "Key not found for this organization" });
        }
        if (existing.revoked_at) return json(400, { ok: false, error: "Key already revoked" });

        const raw = randomToken(32);
        const prefix = `fsa_${existing.environment}_${raw.slice(0, 8)}`;
        const plaintext = `${prefix}_${raw.slice(8)}`;
        const key_hash = await sha256Hex(plaintext);
        // Atomic rotate via security-definer RPC (creates new key, relinks
        // webhooks, revokes old key in a single transaction).
        const userClient2 = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await userClient2.rpc("rotate_org_api_key", {
          _key_id: id, _new_prefix: prefix, _new_hash: key_hash,
        });
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true, plaintext, prefix, rotation: data });
      }
      case "link_webhook_to_key": {
        const wid = String(body.webhook_id ?? "");
        const kid = body.key_id ? String(body.key_id) : null;
        const { error } = await admin.from("org_outbound_webhooks")
          .update({ linked_api_key_id: kid }).eq("id", wid).eq("org_id", org_id);
        if (error) return json(400, { ok: false, error: error.message });
        return json(200, { ok: true });
      }
      case "replay_delivery": {
        const did = String(body.delivery_id ?? "");
        if (!did) return json(400, { ok: false, error: "delivery_id required" });
        const { data: d, error: dErr } = await admin.from("org_webhook_deliveries")
          .select("id, webhook_id, org_id, event, payload, idempotency_key").eq("id", did).maybeSingle();
        if (dErr || !d || d.org_id !== org_id) return json(404, { ok: false, error: "Delivery not found" });
        const data = (d.payload as any)?.data ?? {};
        // Reuse the original idempotency key so downstream systems can dedupe
        // the replay against the original event.
        const idem = (d as any).idempotency_key ?? (d.payload as any)?.idempotency_key ?? null;
        const r = await fetch(`${url}/functions/v1/dispatch-org-webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}` },
          body: JSON.stringify({
            org_id, event: d.event, payload: data,
            only_webhook_id: d.webhook_id, attempt: 1, max_attempts: 6,
            parent_delivery_id: d.id,
            idempotency_key: idem,
          }),
        });
        const out = await r.json();
        await admin.from("audit_logs").insert({
          user_id: userId, action: "webhook_delivery_replayed",
          entity_type: "org_webhook_delivery", entity_id: did,
          metadata: { org_id, event: d.event, webhook_id: d.webhook_id, idempotency_key: idem },
        });
        return json(200, { ok: true, dispatch: out });
      }
      case "process_retries": {
        // Convenience: lets admins trigger retry processor on demand.
        const r = await fetch(`${url}/functions/v1/retry-org-webhooks`, {
          method: "POST",
          headers: { Authorization: `Bearer ${service}` },
        });
        const out = await r.json();
        return json(200, { ok: true, result: out });
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