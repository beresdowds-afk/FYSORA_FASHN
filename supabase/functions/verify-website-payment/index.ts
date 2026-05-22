import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGatewayKeys } from "../_shared/resolve-gateway-keys.ts";
import { runPostVerificationFlow } from "../_shared/post-verification-flow.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyWithGateway(gateway: string, secretKey: string, reference: string): Promise<boolean> {
  if (gateway === "paystack") {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();
    return data.data?.status === "success";
  }
  if (gateway === "stripe") {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Basic ${btoa(secretKey + ":")}` },
    });
    const data = await res.json();
    return data.payment_status === "paid";
  }
  if (gateway === "flutterwave") {
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();
    return data.data?.status === "successful";
  }
  return false;
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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;
    const { reference, org_id, plan } = await req.json();
    if (!reference || !org_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing reference, org_id, or plan" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is an admin of the org
    const { data: membership } = await serviceClient
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!membership || !["org_admin", "manager"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Determine gateway
    let gateway = "paystack";
    if (plan === "lite") {
      const { data: sub } = await serviceClient
        .from("website_builder_subscriptions")
        .select("payment_gateway")
        .eq("org_id", org_id)
        .eq("gateway_reference", reference)
        .maybeSingle();
      if (sub?.payment_gateway) gateway = sub.payment_gateway;
    } else {
      const { data: reqData } = await serviceClient
        .from("website_builder_requests")
        .select("payment_gateway")
        .eq("org_id", org_id)
        .eq("gateway_reference", reference)
        .maybeSingle();
      if (reqData?.payment_gateway) gateway = reqData.payment_gateway;
    }

    const keys = await resolveGatewayKeys(serviceClient, org_id, gateway);
    if (!keys) {
      return new Response(JSON.stringify({ error: `${gateway} keys not configured` }), { status: 400, headers: corsHeaders });
    }

    const verified = await verifyWithGateway(gateway, keys.secretKey, reference);

    if (verified) {
      const planPrices: Record<string, { total: number; platform: number; monthly: number }> = {
        lite: { total: 27, platform: 10, monthly: 17 },
        pro: { total: 339, platform: 140, monthly: 7 },
        "pro-lite": { total: 149, platform: 50, monthly: 5 },
      };
      const pricing = planPrices[plan] || planPrices.pro;
      const planLabel = plan === "lite" ? "Lite" : plan === "pro" ? "Pro" : "Pro-Lite";

      // All plans (Lite, Pro, Pro-Lite): auto-activate the paid subscription
      // immediately so the org has full access to its plan's website builder
      // features the moment payment clears. No admin approval is required to
      // unlock the builder UI — admin involvement (for Pro/Pro-Lite setup) is
      // tracked separately via the website_builder_requests row.
      const nowIso = new Date().toISOString();
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + (plan === "lite" ? 6 : 12));

      await serviceClient.from("website_builder_subscriptions").upsert({
        org_id,
        plan,
        status: "active",
        trial_start: nowIso,
        trial_end: trialEnd.toISOString(),
        monthly_fee: pricing.monthly,
        platform_fee: pricing.platform,
        payment_gateway: gateway,
        gateway_reference: reference,
        activated_at: nowIso,
      }, { onConflict: "org_id" });

      await serviceClient.from("website_builder_requests").upsert({
        org_id,
        plan,
        status: plan === "lite" ? "completed" : "in_progress",
        one_time_fee: plan === "lite" ? 0 : pricing.total - pricing.monthly,
        platform_fee: pricing.platform,
        monthly_maintenance: pricing.monthly,
        payment_gateway: gateway,
        gateway_reference: reference,
        payment_status: "paid",
        paid_at: nowIso,
      }, { onConflict: "org_id,plan" }).catch(async () => {
        await serviceClient.from("website_builder_requests").insert({
          org_id, plan,
          status: plan === "lite" ? "completed" : "in_progress",
          one_time_fee: plan === "lite" ? 0 : pricing.total - pricing.monthly,
          platform_fee: pricing.platform,
          monthly_maintenance: pricing.monthly,
          payment_gateway: gateway,
          gateway_reference: reference,
          payment_status: "paid",
          paid_at: nowIso,
        });
      });

      // Fee ledger
      const feeType = plan === "lite" ? "website_builder_lite" : plan === "pro" ? "website_builder_pro" : "website_builder_pro_lite";
      await serviceClient.from("platform_fee_ledger").insert({
        org_id,
        amount: pricing.platform,
        currency: "USD",
        fee_type: feeType,
        status: "collected",
      });

      // Get request ID for linking
      const { data: reqRecord } = await serviceClient
        .from("website_builder_requests")
        .select("id")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Unified post-verification: invoice + audit + notifications.
      // All paid website-builder plans auto-activate; admin involvement for
      // Pro/Pro-Lite setup is now post-activation only and does not gate access.
      const requiresApproval = false;
      const result = await runPostVerificationFlow({
        serviceClient,
        orgId: org_id,
        userId,
        serviceType: "website_builder",
        amount: pricing.total,
        currency: "USD",
        gateway,
        gatewayReference: reference,
        relatedEntityId: reqRecord?.id || org_id,
        description: `Website Builder ${planLabel} Plan`,
        requiresApproval,
        metadata: { plan, monthly_maintenance: pricing.monthly },
      });

      return new Response(JSON.stringify({
        status: "success",
        plan,
        invoice_number: result.invoiceNumber,
        activated: result.activated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ status: "pending", message: "Payment not yet confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: "An error occurred processing the payment verification" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
