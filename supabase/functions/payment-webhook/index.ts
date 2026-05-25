/**
 * Unified payment webhook receiver for Paystack + Flutterwave.
 *
 * Paystack: POSTs JSON, signs the raw body with HMAC-SHA512 using the merchant
 *   secret key and sends it as `x-paystack-signature`.
 * Flutterwave: POSTs JSON and sends a `verif-hash` header that must equal a
 *   pre-configured secret hash (`FLUTTERWAVE_WEBHOOK_HASH`).
 *
 * Both gateways may fire for either an order payment (`payments` table) or a
 * customer registration fee (`customer_registrations` table). We look up the
 * reference in both, re-verify with the gateway API for safety, and then run
 * the same finalize logic the synchronous `verify-*` functions use.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
import { resolveGatewayKeys } from "../_shared/resolve-gateway-keys.ts";
import { runPostVerificationFlow } from "../_shared/post-verification-flow.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, verif-hash",
};

function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const computed = createHmac("sha512", secret).update(rawBody).digest("hex");
  return computed === signature;
}

async function reVerifyWithGateway(gateway: string, secretKey: string, reference: string): Promise<boolean> {
  try {
    if (gateway === "paystack") {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const d = await r.json();
      return d?.data?.status === "success";
    }
    if (gateway === "flutterwave") {
      const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const d = await r.json();
      return d?.data?.status === "successful";
    }
  } catch (_e) {
    return false;
  }
  return false;
}

async function finalizeOrderPayment(serviceClient: any, payment: any, gateway: string, reference: string) {
  if (payment.status === "completed") return { already: true };

  await serviceClient.from("payments").update({
    status: "completed",
    paid_at: new Date().toISOString(),
  }).eq("id", payment.id);

  const { data: orderPayments } = await serviceClient
    .from("payments").select("amount")
    .eq("order_id", payment.order_id).eq("status", "completed");

  const totalPaid = (orderPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const { data: order } = await serviceClient
    .from("orders").select("customer_total, total_amount, order_number, title, customer_id")
    .eq("id", payment.order_id).single();

  const orderTotal = Number(order?.customer_total) || Number(order?.total_amount) || 0;
  const paymentStatus = totalPaid >= orderTotal ? "paid" : "partially_paid";

  await serviceClient.from("orders").update({
    amount_paid: totalPaid, payment_status: paymentStatus,
  }).eq("id", payment.order_id);

  await serviceClient.from("platform_fee_ledger").update({ status: "collected" })
    .eq("order_id", payment.order_id).eq("status", "pending");

  await runPostVerificationFlow({
    serviceClient,
    orgId: payment.org_id,
    userId: order?.customer_id || payment.user_id,
    serviceType: "order",
    amount: Number(payment.amount),
    currency: payment.currency || "NGN",
    gateway,
    gatewayReference: reference,
    relatedEntityId: payment.order_id,
    description: `Order ${order?.order_number || ""} — ${order?.title || "Payment"}`,
    requiresApproval: false,
    metadata: { order_number: order?.order_number, payment_status: paymentStatus, via: "webhook" },
  });
  return { ok: true };
}

async function finalizeRegistrationPayment(serviceClient: any, reg: any, gateway: string, reference: string) {
  if (reg.status === "paid") return { already: true };

  await serviceClient.from("customer_registrations").update({
    status: "paid",
    paid_at: new Date().toISOString(),
  }).eq("id", reg.id);

  await serviceClient.from("platform_fee_ledger").insert({
    org_id: reg.org_id,
    fee_type: "registration_fee",
    amount: Number(reg.fee_amount) || 5,
    currency: reg.fee_currency || "USD",
    status: "collected",
  });

  await runPostVerificationFlow({
    serviceClient,
    orgId: reg.org_id,
    userId: reg.user_id,
    serviceType: "registration",
    amount: Number(reg.fee_amount) || 5,
    currency: reg.fee_currency || "USD",
    gateway,
    gatewayReference: reference,
    relatedEntityId: reg.id,
    description: "Customer Registration Fee",
    requiresApproval: false,
    metadata: { via: "webhook" },
  });
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  // Identify gateway from headers/payload shape
  const paystackSig = req.headers.get("x-paystack-signature");
  const flwHash = req.headers.get("verif-hash");
  const gateway: "paystack" | "flutterwave" =
    paystackSig ? "paystack" :
    flwHash ? "flutterwave" :
    (event?.event?.startsWith("charge.") && event?.data?.reference ? "paystack" : "flutterwave");

  // Signature checks
  if (gateway === "paystack") {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    if (!verifyPaystackSignature(rawBody, paystackSig, secret)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }
  } else if (gateway === "flutterwave") {
    const expected = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH") || "";
    if (!expected || flwHash !== expected) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }
  }

  // Extract reference + success
  const reference: string | undefined =
    event?.data?.reference || event?.data?.tx_ref || event?.tx_ref;
  if (!reference) {
    return new Response(JSON.stringify({ status: "ignored", reason: "no reference" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType: string = event?.event || event?.["event.type"] || "";
  const gatewayStatus: string = event?.data?.status || "";
  const isSuccess =
    (gateway === "paystack" && (eventType === "charge.success" || gatewayStatus === "success")) ||
    (gateway === "flutterwave" && (eventType === "charge.completed" || gatewayStatus === "successful"));

  if (!isSuccess) {
    return new Response(JSON.stringify({ status: "ignored", reason: "not a success event" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Look up the reference in both tables
  const { data: payment } = await serviceClient
    .from("payments").select("*").eq("gateway_payment_id", reference).maybeSingle();

  const { data: reg } = payment ? { data: null } : await serviceClient
    .from("customer_registrations").select("*").eq("gateway_reference", reference).maybeSingle();

  if (!payment && !reg) {
    // Unknown reference — ack 200 so the gateway stops retrying
    return new Response(JSON.stringify({ status: "ignored", reason: "unknown reference" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orgId = payment?.org_id || reg?.org_id;
  const keys = await resolveGatewayKeys(serviceClient, orgId, gateway);
  if (!keys) {
    return new Response(JSON.stringify({ error: "gateway keys not configured" }), {
      status: 500, headers: corsHeaders,
    });
  }

  // Re-verify with gateway to defend against forged/replayed payloads
  const verified = await reVerifyWithGateway(gateway, keys.secretKey, reference);
  if (!verified) {
    return new Response(JSON.stringify({ status: "rejected", reason: "re-verify failed" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const result = payment
      ? await finalizeOrderPayment(serviceClient, payment, gateway, reference)
      : await finalizeRegistrationPayment(serviceClient, reg, gateway, reference);

    return new Response(JSON.stringify({ status: "ok", ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("payment-webhook finalize error", err);
    return new Response(JSON.stringify({ error: "finalize failed" }), {
      status: 500, headers: corsHeaders,
    });
  }
});