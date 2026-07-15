// PayPal webhook receiver. Signature verification uses PayPal's
// /v1/notifications/verify-webhook-signature endpoint with the configured
// PAYPAL_WEBHOOK_ID. Handles CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED
// and BILLING.SUBSCRIPTION.* events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo",
};

async function getAccessToken(base: string, id: string, secret: string): Promise<string> {
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const raw = await req.text();
    const event = JSON.parse(raw);

    const isProd = (Deno.env.get("PAYPAL_MODE") || "sandbox") === "live";
    const base = isProd ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";

    // Verify signature when webhook id is configured
    if (webhookId) {
      const token = await getAccessToken(base, clientId, clientSecret);
      const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: event,
        }),
      });
      const verify = await verifyRes.json();
      if (verify.verification_status !== "SUCCESS") {
        return new Response("invalid signature", { status: 401 });
      }
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resource = event.resource || {};
    const eventType = event.event_type as string;

    // Payment / order capture completed
    if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.COMPLETED") {
      const orderId = resource.supplementary_data?.related_ids?.order_id
        || resource.id
        || resource.parent_payment;
      if (orderId) {
        const { data: payment } = await service.from("payments").select("id, order_id, amount")
          .eq("gateway_payment_id", orderId).maybeSingle();
        if (payment) {
          await service.from("payments").update({ status: "completed", paid_at: new Date().toISOString() })
            .eq("id", payment.id);
          if (payment.order_id) {
            const { data: order } = await service.from("orders").select("amount_paid, customer_total, total_amount").eq("id", payment.order_id).maybeSingle();
            const newPaid = Number(order?.amount_paid || 0) + Number(payment.amount);
            const total = Number(order?.customer_total || order?.total_amount || 0);
            await service.from("orders").update({
              amount_paid: newPaid,
              payment_status: newPaid >= total ? "paid" : "partial",
            }).eq("id", payment.order_id);
          }
        }
      }
    }

    // Subscription lifecycle
    if (eventType?.startsWith("BILLING.SUBSCRIPTION.")) {
      const subId = resource.id;
      const mapped =
        eventType === "BILLING.SUBSCRIPTION.ACTIVATED" ? "active"
        : eventType === "BILLING.SUBSCRIPTION.CANCELLED" ? "cancelled"
        : eventType === "BILLING.SUBSCRIPTION.EXPIRED" ? "expired"
        : eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ? "paused"
        : null;
      if (subId && mapped) {
        await service.from("customer_subscriptions").update({ status: mapped })
          .eq("gateway_subscription_id", subId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});