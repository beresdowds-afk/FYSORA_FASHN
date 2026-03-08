import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGatewayKeys, initializeGatewayPayment } from "../_shared/resolve-gateway-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidCallbackUrl(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    const originParsed = new URL(origin);
    return parsed.origin === originParsed.origin;
  } catch {
    return false;
  }
}

const GATEWAY_PRIORITY = ["paystack", "stripe", "flutterwave"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { org_id, plan, callback_url, gateway: preferredGateway } = await req.json();
    if (!org_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing org_id or plan" }), { status: 400, headers: corsHeaders });
    }

    const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL")!;
    const defaultCallback = `${origin}/dashboard?website_payment=success`;
    let safeCallbackUrl = defaultCallback;
    if (callback_url) {
      if (isValidCallbackUrl(callback_url, origin)) {
        safeCallbackUrl = callback_url;
      } else {
        return new Response(JSON.stringify({ error: "Invalid callback_url" }), { status: 400, headers: corsHeaders });
      }
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("id, name, email, currency")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404, headers: corsHeaders });
    }

    const { data: membership } = await serviceClient
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership || (membership.role !== "org_admin" && membership.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Only org admins can subscribe to website builder plans" }), { status: 403, headers: corsHeaders });
    }

    const currency = org.currency || "NGN";
    const amountUSD = plan === "lite" ? 27 : 339;
    const amountNGN = amountUSD * 1500;
    const amount = currency === "NGN" ? amountNGN : amountUSD;

    // Resolve gateway: preferred > priority list with org+platform fallback
    const gatewayOrder = preferredGateway
      ? [preferredGateway, ...GATEWAY_PRIORITY.filter(g => g !== preferredGateway)]
      : GATEWAY_PRIORITY;

    let resolvedGateway = "";
    let keys = null;
    for (const gw of gatewayOrder) {
      keys = await resolveGatewayKeys(serviceClient, org_id, gw);
      if (keys) { resolvedGateway = gw; break; }
    }

    if (!keys || !resolvedGateway) {
      return new Response(JSON.stringify({ error: "No payment gateway configured. Please add payment keys in Settings." }), { status: 400, headers: corsHeaders });
    }

    const reference = `WB-${plan.toUpperCase()}-${org_id.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    const result = await initializeGatewayPayment({
      gateway: resolvedGateway,
      keys,
      amount,
      currency: currency === "NGN" ? "NGN" : "USD",
      reference,
      callbackUrl: safeCallbackUrl,
      email: org.email || user.email!,
      metadata: { org_id, plan, type: "website_builder" },
      productName: `Website Builder – ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
    });

    // Create subscription/request record
    if (plan === "lite") {
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 6);
      await serviceClient.from("website_builder_subscriptions").upsert({
        org_id,
        plan: "lite",
        status: "trial",
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
        monthly_fee: 17,
        platform_fee: 10,
        payment_gateway: resolvedGateway,
        gateway_reference: result.reference,
        gateway_checkout_url: result.checkoutUrl,
      }, { onConflict: "org_id" });
    } else {
      await serviceClient.from("website_builder_requests").insert({
        org_id,
        plan: "pro",
        status: "pending",
        one_time_fee: 199,
        platform_fee: 140,
        monthly_maintenance: 7,
        payment_gateway: resolvedGateway,
        gateway_reference: result.reference,
        gateway_checkout_url: result.checkoutUrl,
        payment_status: "unpaid",
      });
    }

    return new Response(JSON.stringify({ checkout_url: result.checkoutUrl, reference: result.reference, gateway: resolvedGateway }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
