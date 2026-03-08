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
    // Authenticate the caller
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
      return new Response(JSON.stringify({ error: "Paystack secret key not found" }), { status: 400, headers: corsHeaders });
    }

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verifyData = await verifyRes.json();
    const verified = verifyData.data?.status === "success";

    if (verified) {
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
          gateway_reference: reference,
          activated_at: new Date().toISOString(),
        }, { onConflict: "org_id" });

        await serviceClient.from("platform_fee_ledger").insert({
          org_id,
          amount: 10 * 1500,
          currency: "NGN",
          fee_type: "website_builder_lite",
          status: "collected",
        });

      } else if (plan === "pro") {
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
          amount: 140 * 1500,
          currency: "NGN",
          fee_type: "website_builder_pro",
          status: "collected",
        });
      }

      // Fetch org details for email
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
          title: plan === "lite" ? "Website Builder Lite Activated!" : "Website Builder Pro Payment Confirmed!",
          message: plan === "lite"
            ? "Your 6-month Website Builder Lite trial has started. Your public website is live!"
            : "Your Pro plan payment has been received. Our team will contact you within 24 hours to set up your custom website.",
        });
      }

      if (orgData?.email && (!notifSettings || notifSettings.email_enabled !== false)) {
        const eventType = plan === "lite" ? "website_lite_activated" : "website_pro_confirmed";
        const emailSubject = plan === "lite"
          ? "Your Website Builder Lite Plan is Active!"
          : "Your Website Builder Pro Purchase Confirmation";

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

      if (plan === "pro") {
        const { data: superAdmins } = await serviceClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");

        for (const sa of superAdmins || []) {
          await serviceClient.from("notifications").insert({
            org_id,
            user_id: sa.user_id,
            title: `New Pro Website Request — ${orgData?.name || "Unknown Org"}`,
            message: `${orgData?.name} has purchased Website Builder Pro. Payment confirmed. Please assign and set up their custom website.`,
          });
        }
      }

      return new Response(JSON.stringify({ status: "success", plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ status: "pending", message: "Payment not yet confirmed by Paystack" }), {
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
