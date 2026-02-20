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
    const { reference, org_id, plan } = await req.json();
    if (!reference || !org_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing reference, org_id, or plan" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
        // Activate the lite subscription
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

        // Create platform fee ledger entry
        await serviceClient.from("platform_fee_ledger").insert({
          org_id,
          amount: 10 * 1500, // $10 USD in NGN
          currency: "NGN",
          fee_type: "website_builder_lite",
          status: "collected",
        });

      } else if (plan === "pro") {
        // Mark the pro request as paid
        await serviceClient
          .from("website_builder_requests")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("org_id", org_id)
          .eq("gateway_reference", reference);

        // Create platform fee ledger entry
        await serviceClient.from("platform_fee_ledger").insert({
          org_id,
          amount: 140 * 1500, // $140 USD in NGN
          currency: "NGN",
          fee_type: "website_builder_pro",
          status: "collected",
        });
      }

      // Create in-app notification
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

      return new Response(JSON.stringify({ status: "success", plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ status: "pending", message: "Payment not yet confirmed by Paystack" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
