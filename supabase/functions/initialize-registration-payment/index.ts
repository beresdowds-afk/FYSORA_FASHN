import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { org_id, callback_url } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "Missing org_id" }), { status: 400, headers: corsHeaders });
    }

    // Validate callback_url
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
    const localAmount = usdRate > 0 ? Math.round(5 / usdRate) : 5;

    // Get Paystack key for this org
    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", org_id)
      .eq("provider", "paystack")
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));
    const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];

    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Paystack not configured for this organization" }), { status: 400, headers: corsHeaders });
    }

    const reference = `REG-${org_id.substring(0, 8)}-${Date.now().toString(36)}`;

    // Get user email
    const { data: userData } = await serviceClient.auth.admin.getUserById(userId);
    const email = userData?.user?.email || "customer@example.com";

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(localAmount * 100),
        currency: orgCurrency,
        email,
        reference,
        callback_url: safeCallbackUrl,
        metadata: {
          type: "registration_fee",
          user_id: userId,
          org_id,
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }), { status: 400, headers: corsHeaders });
    }

    const checkoutUrl = paystackData.data.authorization_url;
    const finalReference = paystackData.data.reference;

    // Create or update registration record
    if (existing) {
      await serviceClient.from("customer_registrations").update({
        gateway_reference: finalReference,
        gateway_checkout_url: checkoutUrl,
        payment_gateway: "paystack",
        local_amount: localAmount,
        local_currency: orgCurrency,
      }).eq("id", existing.id);
    } else {
      await serviceClient.from("customer_registrations").insert({
        user_id: userId,
        org_id,
        fee_amount: 5,
        fee_currency: "USD",
        local_amount: localAmount,
        local_currency: orgCurrency,
        gateway_reference: finalReference,
        gateway_checkout_url: checkoutUrl,
        payment_gateway: "paystack",
      });
    }

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, reference: finalReference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
