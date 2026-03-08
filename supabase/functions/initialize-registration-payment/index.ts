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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;
    const { org_id, callback_url, gateway: preferredGateway } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "Missing org_id" }), { status: 400, headers: corsHeaders });
    }

    const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL")!;
    const defaultCallback = `${origin}/portal?reg_status=success`;
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

    // Check if already paid
    const { data: existing } = await serviceClient
      .from("customer_registrations")
      .select("*")
      .eq("user_id", userId)
      .eq("org_id", org_id)
      .maybeSingle();

    if (existing?.status === "paid" || existing?.status === "waived") {
      return new Response(JSON.stringify({ error: "Already registered" }), { status: 400, headers: corsHeaders });
    }

    // Get org currency and exchange rate
    const { data: org } = await serviceClient
      .from("organizations")
      .select("currency")
      .eq("id", org_id)
      .single();

    const orgCurrency = org?.currency || "NGN";
    const { data: rateData } = await serviceClient
      .from("exchange_rates")
      .select("rate")
      .eq("target_currency", "USD")
      .single();

    const usdRate = rateData?.rate || 0;
    const feeUSD = 5;
    const localAmount = usdRate > 0 ? Math.round(feeUSD / usdRate) : feeUSD;

    // Resolve gateway with priority and platform fallback
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
      return new Response(JSON.stringify({ error: "No payment gateway configured for this organization" }), { status: 400, headers: corsHeaders });
    }

    const reference = `REG-${org_id.substring(0, 8)}-${Date.now().toString(36)}`;

    // Get user email
    const { data: userData } = await serviceClient.auth.admin.getUserById(userId);
    const email = userData?.user?.email || "customer@example.com";

    const result = await initializeGatewayPayment({
      gateway: resolvedGateway,
      keys,
      amount: localAmount,
      currency: orgCurrency,
      reference,
      callbackUrl: safeCallbackUrl,
      email,
      metadata: { type: "registration_fee", user_id: userId, org_id },
      productName: "Customer Registration Fee",
    });

    // Create or update registration record
    if (existing) {
      await serviceClient.from("customer_registrations").update({
        gateway_reference: result.reference,
        gateway_checkout_url: result.checkoutUrl,
        payment_gateway: resolvedGateway,
        local_amount: localAmount,
        local_currency: orgCurrency,
      }).eq("id", existing.id);
    } else {
      await serviceClient.from("customer_registrations").insert({
        user_id: userId,
        org_id,
        fee_amount: feeUSD,
        fee_currency: "USD",
        local_amount: localAmount,
        local_currency: orgCurrency,
        gateway_reference: result.reference,
        gateway_checkout_url: result.checkoutUrl,
        payment_gateway: resolvedGateway,
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
