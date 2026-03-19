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

    if (booking.customer_id !== userId) {
      const { data: membership } = await serviceClient
        .from("org_members")
        .select("role")
        .eq("org_id", booking.org_id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    if (booking.payment_status === "paid") {
      return new Response(JSON.stringify({ status: "already_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = booking.payment_gateway || "paystack";
    const keys = await resolveGatewayKeys(serviceClient, booking.org_id, gateway);
    if (!keys) {
      return new Response(JSON.stringify({ error: `${gateway} keys not configured` }), { status: 400, headers: corsHeaders });
    }

    const verified = await verifyWithGateway(gateway, keys.secretKey, reference);

    if (verified) {
      // Update booking
      await serviceClient.from("ai_measurement_bookings").update({
        payment_status: "paid",
        booking_status: "confirmed",
        paid_at: new Date().toISOString(),
      }).eq("id", booking.id);

      // Platform + org fee ledger entries
      await serviceClient.from("platform_fee_ledger").insert({
        org_id: booking.org_id,
        fee_type: "ai_measurement_platform_share",
        amount: Number(booking.platform_share_amount),
        currency: booking.currency || "USD",
        status: "collected",
      });

      await serviceClient.from("platform_fee_ledger").insert({
        org_id: booking.org_id,
        fee_type: "ai_measurement_org_share",
        amount: Number(booking.org_share_amount),
        currency: booking.currency || "USD",
        status: "collected",
      });

      // Unified post-verification flow: invoice + audit + notifications
      const result = await runPostVerificationFlow({
        serviceClient,
        orgId: booking.org_id,
        userId,
        serviceType: "measurement",
        amount: Number(booking.total_amount),
        currency: booking.currency || "USD",
        gateway,
        gatewayReference: reference,
        relatedEntityId: booking.id,
        description: `AI Measurement Session — ${booking.hours_booked} hour${booking.hours_booked > 1 ? "s" : ""}`,
        requiresApproval: false, // Auto-activated (booking confirmed)
        metadata: { hours_booked: booking.hours_booked, session_type: booking.session_type },
      });

      return new Response(JSON.stringify({
        status: "success",
        invoice_number: result.invoiceNumber,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "An error occurred processing the payment verification" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
