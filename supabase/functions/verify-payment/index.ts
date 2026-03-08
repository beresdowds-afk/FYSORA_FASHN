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

    const { reference, gateway, order_id } = await req.json();
    if (!reference || !gateway) {
      return new Response(JSON.stringify({ error: "Missing reference or gateway" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the payment record
    const { data: payment } = await serviceClient
      .from("payments")
      .select("*")
      .eq("gateway_payment_id", reference)
      .single();

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: corsHeaders });
    }

    if (payment.status === "completed") {
      return new Response(JSON.stringify({ status: "already_completed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is a member of the org
    const userId = claimsData.claims.sub;
    const { data: membership } = await serviceClient
      .from("org_members")
      .select("role")
      .eq("org_id", payment.org_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Get org API keys
    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", payment.org_id)
      .eq("provider", gateway)
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));
    let verified = false;

    if (gateway === "paystack") {
      const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const verifyData = await verifyRes.json();
      verified = verifyData.data?.status === "success";

    } else if (gateway === "flutterwave") {
      const secretKey = keys["secret_key"] || keys["FLUTTERWAVE_SECRET_KEY"];
      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const verifyData = await verifyRes.json();
      verified = verifyData.data?.status === "successful";

    } else if (gateway === "stripe") {
      const secretKey = keys["secret_key"] || keys["STRIPE_SECRET_KEY"];
      const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Basic ${btoa(secretKey + ":")}` },
      });
      const sessionData = await sessionRes.json();
      verified = sessionData.payment_status === "paid";
    }

    if (verified) {
      // Update payment status
      await serviceClient.from("payments").update({
        status: "completed",
        paid_at: new Date().toISOString(),
      }).eq("id", payment.id);

      // Update order payment status
      const { data: orderPayments } = await serviceClient
        .from("payments")
        .select("amount")
        .eq("order_id", payment.order_id)
        .eq("status", "completed");

      const totalPaid = (orderPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0) + Number(payment.amount);

      const { data: order } = await serviceClient
        .from("orders")
        .select("customer_total, total_amount")
        .eq("id", payment.order_id)
        .single();

      const orderTotal = Number(order?.customer_total) || Number(order?.total_amount) || 0;
      const paymentStatus = totalPaid >= orderTotal ? "paid" : "partially_paid";

      await serviceClient.from("orders").update({
        amount_paid: totalPaid,
        payment_status: paymentStatus,
      }).eq("id", payment.order_id);

      // Update fee ledger entries to collected
      await serviceClient.from("platform_fee_ledger").update({
        status: "collected",
      }).eq("order_id", payment.order_id).eq("status", "pending");

      return new Response(JSON.stringify({ status: "success", payment_status: paymentStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ status: "pending", message: "Payment not yet confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: "An error occurred processing the payment verification" }), {
      status: 500, headers: corsHeaders,
    });
  }
});
