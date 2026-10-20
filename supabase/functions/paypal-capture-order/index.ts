// Captures a PayPal order after buyer approval, then updates the matching
// pending payment + order. Called by the frontend on return from PayPal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated user (called by the frontend on return from PayPal).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { order_id: paypalOrderId } = await req.json();
    if (!paypalOrderId) {
      return new Response(JSON.stringify({ error: "missing order_id" }), { status: 400, headers: corsHeaders });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment } = await service
      .from("payments")
      .select("id, order_id, amount, status")
      .eq("gateway_payment_id", paypalOrderId)
      .maybeSingle();

    // Idempotency: already-completed payment => do not capture or increment again.
    if (payment?.status === "completed") {
      return new Response(JSON.stringify({ ok: true, status: "COMPLETED", payment_id: payment.id, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isProd = (Deno.env.get("PAYPAL_MODE") || "sandbox") === "live";
    const base = isProd ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || "PayPal auth failed");

    const capRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });
    const capData = await capRes.json();
    const paypalStatus = capData.status || "";
    const captured = paypalStatus === "COMPLETED";

    if (payment) {
      await service.from("payments").update({
        status: captured ? "completed" : "failed",
        paid_at: captured ? new Date().toISOString() : null,
      }).eq("id", payment.id);

      if (captured && payment.order_id) {
        // Non-incremental: recompute from the authoritative sum of completed payments.
        const { data: paid } = await service.from("payments").select("amount").eq("order_id", payment.order_id).eq("status", "completed");
        const newPaid = (paid || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const { data: order } = await service.from("orders").select("customer_total, total_amount").eq("id", payment.order_id).maybeSingle();
        const total = Number(order?.customer_total || order?.total_amount || 0);
        await service.from("orders").update({
          amount_paid: newPaid,
          payment_status: newPaid >= total ? "paid" : "partial",
        }).eq("id", payment.order_id);
      }
    }

    return new Response(JSON.stringify({ ok: captured, status: paypalStatus, payment_id: payment?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});