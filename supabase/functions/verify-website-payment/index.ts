import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGatewayKeys } from "../_shared/resolve-gateway-keys.ts";

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

    // Determine which gateway was used from the subscription/request record
    let gateway = "paystack"; // default
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

    // Resolve keys with platform fallback
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

      if (plan === "lite") {
        const trialEnd = new Date();
        trialEnd.setMonth(trialEnd.getMonth() + 6);

        await serviceClient.from("website_builder_subscriptions").upsert({
          org_id,
          plan: "lite",
          status: "trial",
          trial_start: new Date().toISOString(),
          trial_end: trialEnd.toISOString(),
          monthly_fee: pricing.monthly,
          platform_fee: pricing.platform,
          payment_gateway: gateway,
          gateway_reference: reference,
          activated_at: new Date().toISOString(),
        }, { onConflict: "org_id" });

        // Also create/update the website_builder_requests entry for admin tracking
        await serviceClient.from("website_builder_requests").upsert({
          org_id,
          plan: "lite",
          status: "pending",
          one_time_fee: 0,
          platform_fee: pricing.platform,
          monthly_maintenance: pricing.monthly,
          payment_gateway: gateway,
          gateway_reference: reference,
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        }, { onConflict: "org_id,plan" }).catch(() => {
          // Fallback insert if upsert fails
          serviceClient.from("website_builder_requests").insert({
            org_id,
            plan: "lite",
            status: "pending",
            one_time_fee: 0,
            platform_fee: pricing.platform,
            monthly_maintenance: pricing.monthly,
            payment_gateway: gateway,
            gateway_reference: reference,
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          });
        });

        await serviceClient.from("platform_fee_ledger").insert({
          org_id,
          amount: pricing.platform,
          currency: "USD",
          fee_type: "website_builder_lite",
          status: "collected",
        });

      } else {
        // Pro or Pro-Lite
        const feeType = plan === "pro" ? "website_builder_pro" : "website_builder_pro_lite";

        await serviceClient
          .from("website_builder_requests")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("org_id", org_id)
          .eq("gateway_reference", reference);

        await serviceClient.from("platform_fee_ledger").insert({
          org_id,
          amount: pricing.platform,
          currency: "USD",
          fee_type: feeType,
          status: "collected",
        });
      }

      // Create subscription invoice
      const invoiceNumber = `INV-WB-${Date.now().toString(36).toUpperCase()}`;
      const planLabel = plan === "lite" ? "Lite" : plan === "pro" ? "Pro" : "Pro-Lite";

      // Get the request ID for linking
      const { data: reqRecord } = await serviceClient
        .from("website_builder_requests")
        .select("id")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await serviceClient.from("subscription_invoices").insert({
        org_id,
        user_id: userId,
        invoice_number: invoiceNumber,
        invoice_type: "website_builder",
        description: `Website Builder ${planLabel} - Payment Confirmed`,
        amount: pricing.total,
        currency: "USD",
        status: "paid",
        payment_method: gateway,
        gateway_reference: reference,
        related_entity_type: "website_builder_request",
        related_entity_id: reqRecord?.id || null,
        paid_at: new Date().toISOString(),
      });

      // Notifications
      const { data: orgData } = await serviceClient
        .from("organizations")
        .select("name, email")
        .eq("id", org_id)
        .single();

      const { data: notifSettings } = await serviceClient
        .from("org_notification_settings")
        .select("brand_color, email_footer_text, email_enabled")
        .eq("org_id", org_id)
        .maybeSingle();

      const { data: orgMembers } = await serviceClient
        .from("org_members")
        .select("user_id")
        .eq("org_id", org_id)
        .eq("role", "org_admin")
        .eq("is_active", true);

      for (const member of orgMembers || []) {
        await serviceClient.from("notifications").insert({
          org_id,
          user_id: member.user_id,
          title: plan === "lite" ? "Website Builder Lite Activated!" : `Website Builder ${planLabel} Payment Confirmed!`,
          message: plan === "lite"
            ? "Your 6-month Website Builder Lite trial has started. Your public website is live! Activation request has been submitted."
            : `Your ${planLabel} plan payment has been received. Activation request submitted to admin portal for setup.`,
        });
      }

      if (orgData?.email && (!notifSettings || notifSettings.email_enabled !== false)) {
        const eventType = plan === "lite" ? "website_lite_activated" : "website_pro_confirmed";
        const emailSubject = plan === "lite"
          ? "Your Website Builder Lite Plan is Active!"
          : `Your Website Builder ${planLabel} Purchase Confirmation`;

        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: orgData.email,
            subject: emailSubject,
            event_type: eventType,
            org_name: orgData.name,
            org_id,
            recipient_id: orgMembers?.[0]?.user_id || "00000000-0000-0000-0000-000000000000",
            recipient_type: "org_admin",
            brand_color: notifSettings?.brand_color || "#D4AF37",
            email_footer_text: notifSettings?.email_footer_text,
          }),
        }).catch((e) => console.error("Email dispatch failed:", e));
      }

      // Notify super admins for all plans (activation request)
      const { data: superAdmins } = await serviceClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      for (const sa of superAdmins || []) {
        await serviceClient.from("notifications").insert({
          org_id,
          user_id: sa.user_id,
          title: `New ${planLabel} Website Request — ${orgData?.name || "Unknown Org"}`,
          message: `${orgData?.name} has purchased Website Builder ${planLabel}. Payment confirmed (${invoiceNumber}). Please review in DNS & Email portal.`,
        });
      }

      return new Response(JSON.stringify({ status: "success", plan }), {
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
