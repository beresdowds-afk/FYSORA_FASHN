import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REACTIVATION_DENIED_STATUS = 402;

// Reactivation is only allowed while the paid period is still valid; otherwise a new checkout is required.
const periodStillValid = (end?: string | null) => !!end && new Date(end).getTime() > Date.now();
const reactivationDenied = () =>
  new Response(JSON.stringify({
    error: "Subscription period has expired. Please start a new checkout to reactivate.",
    code: "payment_required",
  }), { status: REACTIVATION_DENIED_STATUS, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Action = "cancel" | "reactivate";
type Scope = "designer" | "customer" | "organization";

interface Payload {
  scope: Scope;
  action: Action;
  org_id?: string;
  plan_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const body = (await req.json().catch(() => ({}))) as Payload;
    if (!body?.scope || !body?.action) {
      return new Response(JSON.stringify({ error: "scope and action are required" }), { status: 400, headers: corsHeaders });
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nextStatus = body.action === "cancel" ? "cancelled" : "active";

    if (body.scope === "designer" || body.scope === "customer") {
      const plan = body.plan_name || (body.scope === "designer" ? "designer_monthly" : "Premium Access");
      if (body.action === "reactivate") {
        const { data: current } = await svc
          .from("customer_subscriptions")
          .select("current_period_end")
          .eq("user_id", userId)
          .eq("plan_name", plan)
          .maybeSingle();
        if (current && !periodStillValid(current.current_period_end)) {
          console.warn("manage-subscription: reactivation denied (expired)", { scope: body.scope });
          return reactivationDenied();
        }
      }
      const { data, error } = await svc
        .from("customer_subscriptions")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("plan_name", plan)
        .select("id, status, current_period_end")
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }
      if (!data) {
        return new Response(JSON.stringify({ error: "Subscription not found" }), { status: 404, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ ok: true, subscription: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.scope === "organization") {
      if (!body.org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), { status: 400, headers: corsHeaders });
      }
      // Confirm caller is org admin
      const { data: isAdmin } = await svc.rpc("is_org_admin", { _user_id: userId, _org_id: body.org_id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only org admins can manage the subscription" }), { status: 403, headers: corsHeaders });
      }
      if (body.action === "reactivate") {
        const { data: current } = await svc
          .from("org_subscriptions")
          .select("current_period_end")
          .eq("org_id", body.org_id)
          .maybeSingle();
        if (current && !periodStillValid(current.current_period_end)) {
          console.warn("manage-subscription: reactivation denied (expired)", { scope: body.scope });
          return reactivationDenied();
        }
      }
      const { data, error } = await svc
        .from("org_subscriptions")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("org_id", body.org_id)
        .select("id, status, plan_id, billing_cycle, current_period_end")
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }
      if (!data) {
        return new Response(JSON.stringify({ error: "Subscription not found" }), { status: 404, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ ok: true, subscription: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid scope" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});