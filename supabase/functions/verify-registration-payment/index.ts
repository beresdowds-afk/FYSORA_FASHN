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

    const { data: reg } = await serviceClient
      .from("customer_registrations")
      .select("*")
      .eq("gateway_reference", reference)
      .single();

    if (!reg) {
      return new Response(JSON.stringify({ error: "Registration not found" }), { status: 404, headers: corsHeaders });
    }

    if (reg.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    if (reg.status === "paid") {
      return new Response(JSON.stringify({ status: "already_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = reg.payment_gateway || "paystack";
    const keys = await resolveGatewayKeys(serviceClient, reg.org_id, gateway);
    if (!keys) {
      return new Response(JSON.stringify({ error: `${gateway} keys not configured` }), { status: 400, headers: corsHeaders });
    }

    const verified = await verifyWithGateway(gateway, keys.secretKey, reference);

    if (verified) {
      // Update registration status
      await serviceClient.from("customer_registrations").update({
        status: "paid",
        paid_at: new Date().toISOString(),
      }).eq("id", reg.id);

      // Platform fee ledger
      await serviceClient.from("platform_fee_ledger").insert({
        org_id: reg.org_id,
        fee_type: "registration_fee",
        amount: Number(reg.fee_amount) || 5,
        currency: reg.fee_currency || "USD",
        status: "collected",
      });

      // Unified post-verification flow: invoice + audit + notifications
      const result = await runPostVerificationFlow({
        serviceClient,
        orgId: reg.org_id,
        userId,
        serviceType: "registration",
        amount: Number(reg.fee_amount) || 5,
        currency: reg.fee_currency || "USD",
        gateway,
        gatewayReference: reference,
        relatedEntityId: reg.id,
        description: "Customer Registration Fee",
        requiresApproval: false, // Auto-activated
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
