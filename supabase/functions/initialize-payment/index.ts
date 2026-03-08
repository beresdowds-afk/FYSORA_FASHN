import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGatewayKeys, initializeGatewayPayment } from "../_shared/resolve-gateway-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidCallbackUrl(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    const originParsed = new URL(origin);
    return parsed.origin === originParsed.origin;
  } catch {
    return false;
  }
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { order_id, gateway, callback_url } = await req.json();
    if (!order_id || !gateway) {
      return new Response(JSON.stringify({ error: "Missing order_id or gateway" }), { status: 400, headers: corsHeaders });
    }

    const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL")!;
    const defaultCallback = `${origin}/dashboard`;
    let safeCallbackUrl = defaultCallback;
    if (callback_url) {
      if (isValidCallbackUrl(callback_url, origin)) {
        safeCallbackUrl = callback_url;
      } else {
        return new Response(JSON.stringify({ error: "Invalid callback_url" }), { status: 400, headers: corsHeaders });
      }
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    const customerTotal = Number(order.customer_total) || Number(order.total_amount) || 0;
    const amountPaid = Number(order.amount_paid) || 0;
    const amountDue = customerTotal - amountPaid;

    if (amountDue <= 0) {
      return new Response(JSON.stringify({ error: "Order is already fully paid" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve keys with platform fallback
    const keys = await resolveGatewayKeys(serviceClient, order.org_id, gateway);
    if (!keys) {
      return new Response(JSON.stringify({ error: `${gateway} secret key not configured for this organization or platform` }), { status: 400, headers: corsHeaders });
    }

    const refPrefix = gateway === "paystack" ? "PAY" : gateway === "stripe" ? "STRIPE" : "FLW";
    const reference = `${refPrefix}-${order.order_number}-${Date.now().toString(36)}`;

    // Get customer email
    const userId = claimsData.claims.sub;
    const { data: userData } = await serviceClient.auth.admin.getUserById(userId);
    const email = userData?.user?.email || "customer@example.com";

    const result = await initializeGatewayPayment({
      gateway,
      keys,
      amount: amountDue,
      currency: order.currency || "NGN",
      reference,
      callbackUrl: safeCallbackUrl,
      email,
      metadata: {
        order_id: order.id,
        org_id: order.org_id,
        order_number: order.order_number,
      },
      productName: `Order ${order.order_number}`,
    });

    // Create a pending payment record
    await serviceClient.from("payments").insert({
      org_id: order.org_id,
      order_id: order.id,
      amount: amountDue,
      currency: order.currency || "NGN",
      payment_type: "full",
      payment_gateway: gateway,
      gateway_payment_id: result.reference,
      gateway_checkout_url: result.checkoutUrl,
      status: "pending",
      platform_fee_amount: Number(order.platform_fee_amount) || 0,
      admin_fee_amount: Number(order.admin_fee_amount) || 0,
    });

    return new Response(JSON.stringify({ checkout_url: result.checkoutUrl, reference: result.reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
