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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { org_id, plan, callback_url } = await req.json();
    if (!org_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing org_id or plan" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get org details
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("id, name, email, currency")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404, headers: corsHeaders });
    }

    // Check if org is admin
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

    // Determine amount based on plan (USD converted to NGN at ~1500)
    // Lite: $17/month = NGN 25,500 (first payment includes platform fee $10 = $27 total)
    // Pro: $199 one-time + platform fee $140 = $339 total
    const currency = org.currency || "NGN";
    let amountUSD = plan === "lite" ? 27 : 339; // includes platform fee
    let amountNGN = amountUSD * 1500;
    let amount = currency === "NGN" ? amountNGN : amountUSD;

    // Get org's Paystack secret key
    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", org_id)
      .eq("provider", "paystack")
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));
    const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];

    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Paystack secret key not configured for this organization. Please add it in Keys & Secrets." }), { status: 400, headers: corsHeaders });
    }

    const reference = `WB-${plan.toUpperCase()}-${org_id.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // kobo
        currency: currency === "NGN" ? "NGN" : "USD",
        reference,
        callback_url: callback_url || `${req.headers.get("origin")}/dashboard?website_payment=success`,
        metadata: {
          org_id,
          plan,
          type: "website_builder",
        },
        email: org.email || user.email,
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }), { status: 400, headers: corsHeaders });
    }

    const checkoutUrl = paystackData.data.authorization_url;
    const finalReference = paystackData.data.reference;

    // Create a pending subscription/request record
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
        payment_gateway: "paystack",
        gateway_reference: finalReference,
        gateway_checkout_url: checkoutUrl,
      }, { onConflict: "org_id" });
    } else {
      await serviceClient.from("website_builder_requests").insert({
        org_id,
        plan: "pro",
        status: "pending",
        one_time_fee: 199,
        platform_fee: 140,
        monthly_maintenance: 7,
        payment_gateway: "paystack",
        gateway_reference: finalReference,
        gateway_checkout_url: checkoutUrl,
        payment_status: "unpaid",
      });
    }

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
