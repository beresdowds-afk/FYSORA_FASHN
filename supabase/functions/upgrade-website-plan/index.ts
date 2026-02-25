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

    const { org_id, callback_url } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "Missing org_id" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is org admin
    const { data: membership } = await serviceClient
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership || (membership.role !== "org_admin" && membership.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Only org admins can upgrade plans" }), { status: 403, headers: corsHeaders });
    }

    // Find active Lite subscription
    const { data: subscription } = await serviceClient
      .from("website_builder_subscriptions")
      .select("*")
      .eq("org_id", org_id)
      .in("status", ["trial", "active"])
      .eq("plan", "lite")
      .single();

    if (!subscription) {
      return new Response(JSON.stringify({ error: "No active Lite subscription found to upgrade" }), { status: 400, headers: corsHeaders });
    }

    // Calculate prorated upgrade amount
    let upgradeAmount = 199; // Standard pro build fee
    let platformFee = 140;

    if (subscription.status === "trial") {
      const trialStart = new Date(subscription.trial_start).getTime();
      const trialEnd = new Date(subscription.trial_end).getTime();
      const now = Date.now();
      const totalTrialDays = (trialEnd - trialStart) / (1000 * 60 * 60 * 24);
      const daysUsed = (now - trialStart) / (1000 * 60 * 60 * 24);

      // Discount based on unused trial time (max $50 discount)
      const unusedRatio = Math.max(0, (totalTrialDays - daysUsed) / totalTrialDays);
      const discount = Math.min(subscription.monthly_fee * unusedRatio, 50);

      upgradeAmount = Math.max(149, 199 - discount);
      platformFee = Math.max(100, 140 - discount * 0.7);
    }

    // Round to 2 decimal places
    upgradeAmount = Math.round(upgradeAmount * 100) / 100;
    platformFee = Math.round(platformFee * 100) / 100;
    const totalAmount = upgradeAmount + platformFee;

    // Get org details
    const { data: org } = await serviceClient
      .from("organizations")
      .select("id, name, email, currency")
      .eq("id", org_id)
      .single();

    if (!org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404, headers: corsHeaders });
    }

    // Get Paystack secret key
    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", org_id)
      .eq("provider", "paystack")
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));
    const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];

    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Paystack secret key not configured. Please add it in Keys & Secrets." }), { status: 400, headers: corsHeaders });
    }

    const currency = org.currency || "NGN";
    const amountInCurrency = currency === "NGN" ? totalAmount * 1500 : totalAmount;

    const reference = `UPG-PRO-${org_id.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountInCurrency * 100),
        currency: currency === "NGN" ? "NGN" : "USD",
        reference,
        callback_url: callback_url || `${req.headers.get("origin")}/dashboard?upgrade_payment=success`,
        metadata: {
          org_id,
          type: "website_builder_upgrade",
          previous_plan: "lite",
          new_plan: "pro",
          upgrade_amount: upgradeAmount,
          platform_fee: platformFee,
        },
        email: org.email || user.email,
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || "Payment initialization failed" }), { status: 400, headers: corsHeaders });
    }

    const checkoutUrl = paystackData.data.authorization_url;
    const finalReference = paystackData.data.reference;

    // Create pro request for super admin review
    await serviceClient.from("website_builder_requests").insert({
      org_id,
      plan: "pro",
      status: "pending",
      one_time_fee: upgradeAmount,
      platform_fee: platformFee,
      monthly_maintenance: 7,
      payment_gateway: "paystack",
      gateway_reference: finalReference,
      gateway_checkout_url: checkoutUrl,
      payment_status: "unpaid",
      notes: `Upgrade from Lite (${subscription.status}). Prorated amount: $${upgradeAmount}`,
    });

    return new Response(JSON.stringify({
      checkout_url: checkoutUrl,
      reference: finalReference,
      upgrade_amount: upgradeAmount,
      platform_fee: platformFee,
      total: totalAmount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
