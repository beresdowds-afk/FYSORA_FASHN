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
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking } = await serviceClient
      .from("ai_measurement_bookings")
      .select("*")
      .eq("gateway_reference", reference)
      .single();

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
    }

    if (booking.payment_status === "paid") {
      return new Response(JSON.stringify({ status: "already_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org Paystack key
    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", booking.org_id)
      .eq("provider", "paystack")
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));
    const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];

    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), { status: 400, headers: corsHeaders });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verifyData = await verifyRes.json();

    if (verifyData.data?.status === "success") {
      // Update booking
      await serviceClient.from("ai_measurement_bookings").update({
        payment_status: "paid",
        booking_status: "confirmed",
        paid_at: new Date().toISOString(),
      }).eq("id", booking.id);

      // Log revenue split to platform_fee_ledger
      // Platform share (40%) - goes to FASHION STITCHES AFRICA
      await serviceClient.from("platform_fee_ledger").insert({
        org_id: booking.org_id,
        fee_type: "ai_measurement_platform_share",
        amount: Number(booking.platform_share_amount),
        currency: booking.currency || "USD",
        status: "collected",
      });

      // Org share (60%) - tracked for transparency
      await serviceClient.from("platform_fee_ledger").insert({
        org_id: booking.org_id,
        fee_type: "ai_measurement_org_share",
        amount: Number(booking.org_share_amount),
        currency: booking.currency || "USD",
        status: "collected",
      });

      return new Response(JSON.stringify({ status: "success" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
