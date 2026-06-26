// Cloudflare Registrar edge function: domain search, pricing, purchase, transfer, list.
// Requires CLOUDFLARE_API_TOKEN (account-scoped with Account:Domain:Edit) and CLOUDFLARE_ACCOUNT_ID.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CF_API = "https://api.cloudflare.com/client/v4";
const TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? "";
const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function cf(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function requireSuperAdmin(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return null;
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isSuper = (roles ?? []).some((r: any) =>
    ["super_admin", "super_assistant"].includes(r.role)
  );
  return isSuper ? { user, admin } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    if (!TOKEN || !ACCOUNT_ID) {
      return json({ error: "Cloudflare credentials not configured" }, 500);
    }
    const ctx = await requireSuperAdmin(req);
    if (!ctx) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    switch (action) {
      case "search": {
        const name = String(body.name ?? "").toLowerCase().trim();
        if (!name) return json({ error: "name required" }, 400);
        const r = await cf(
          `/accounts/${ACCOUNT_ID}/registrar/domains/${encodeURIComponent(
            name
          )}/check`
        );
        return json(r.json, r.status);
      }
      case "list": {
        const r = await cf(`/accounts/${ACCOUNT_ID}/registrar/domains`);
        return json(r.json, r.status);
      }
      case "get": {
        const name = String(body.name ?? "").toLowerCase().trim();
        const r = await cf(
          `/accounts/${ACCOUNT_ID}/registrar/domains/${encodeURIComponent(name)}`
        );
        return json(r.json, r.status);
      }
      case "purchase": {
        const name = String(body.name ?? "").toLowerCase().trim();
        const years = Number(body.years ?? 1);
        if (!name) return json({ error: "name required" }, 400);
        const r = await cf(
          `/accounts/${ACCOUNT_ID}/registrar/domains/${encodeURIComponent(name)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              enabled: true,
              auto_renew: true,
              period: years,
              privacy: true,
            }),
          }
        );
        if (r.ok) {
          await ctx.admin.from("audit_logs").insert({
            action: "cloudflare_domain_purchase",
            actor_id: ctx.user.id,
            metadata: { name, years },
          });
        }
        return json(r.json, r.status);
      }
      case "transfer_in": {
        const name = String(body.name ?? "").toLowerCase().trim();
        const auth_code = String(body.auth_code ?? "");
        if (!name || !auth_code)
          return json({ error: "name and auth_code required" }, 400);
        const r = await cf(
          `/accounts/${ACCOUNT_ID}/registrar/domains/${encodeURIComponent(name)}/transfer_in`,
          { method: "POST", body: JSON.stringify({ auth_code }) }
        );
        return json(r.json, r.status);
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}