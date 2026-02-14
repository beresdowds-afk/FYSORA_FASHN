import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { org_id, hours_booked, scheduled_at, callback_url } = await req.json();

    if (!org_id || !hours_booked || hours_booked < 1) {
      return new Response(JSON.stringify({ error: "Missing org_id or invalid hours_booked" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate pricing: $10 first hour, $5 per additional hour
    const firstHourRate = 10;
    const additionalHourRate = 5;
    const totalUSD = firstHourRate + Math.max(0, hours_booked - 1) * additionalHourRate;

    // 60:40 split (org : platform/FASHION STITCHES AFRICA)
    const orgShareAmount = Math.round(totalUSD * 60) / 100;
    const platformShareAmount = Math.round(totalUSD * 40) / 100;

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
    const localAmount = usdRate > 0 ? Math.round(totalUSD / usdRate) : totalUSD;

    // Get Paystack key
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

    const reference = `MEAS-${org_id.substring(0, 8)}-${Date.now().toString(36)}`;

    // Get user email
    const { data: userData } = await serviceClient.auth.admin.getUserById(userId);
    const email = userData?.user?.email || "customer@example.com";

    // Initialize Paystack transaction
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
        callback_url: callback_url || `${req.headers.get("origin")}/portal?meas_status=success`,
        metadata: {
          type: "ai_measurement_booking",
          user_id: userId,
          org_id,
          hours_booked,
          total_usd: totalUSD,
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }), { status: 400, headers: corsHeaders });
    }

    const checkoutUrl = paystackData.data.authorization_url;
    const finalReference = paystackData.data.reference;

    // Create booking record
    await serviceClient.from("ai_measurement_bookings").insert({
      org_id,
      customer_id: userId,
      hours_booked,
      first_hour_rate: firstHourRate,
      additional_hour_rate: additionalHourRate,
      total_amount: totalUSD,
      currency: "USD",
      local_amount: localAmount,
      local_currency: orgCurrency,
      org_share_amount: orgShareAmount,
      platform_share_amount: platformShareAmount,
      scheduled_at: scheduled_at || null,
      gateway_reference: finalReference,
      gateway_checkout_url: checkoutUrl,
      payment_gateway: "paystack",
      booking_status: "pending_payment",
      payment_status: "unpaid",
    });

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, reference: finalReference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
