import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Validate callback_url
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

    // Get order details
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

    // Get org API keys for the gateway
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", order.org_id)
      .eq("provider", gateway)
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));

    let checkoutUrl = "";
    let reference = "";

    if (gateway === "paystack") {
      const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Paystack secret key not configured for this organization" }), { status: 400, headers: corsHeaders });
      }

      reference = `PAY-${order.order_number}-${Date.now().toString(36)}`;
      
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amountDue * 100),
          currency: order.currency || "NGN",
          reference,
          callback_url: safeCallbackUrl,
          metadata: {
            order_id: order.id,
            org_id: order.org_id,
            order_number: order.order_number,
          },
        }),
      });

      const paystackData = await paystackRes.json();
      if (!paystackData.status) {
        return new Response(JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }), { status: 400, headers: corsHeaders });
      }
      checkoutUrl = paystackData.data.authorization_url;
      reference = paystackData.data.reference;

    } else if (gateway === "flutterwave") {
      const secretKey = keys["secret_key"] || keys["FLUTTERWAVE_SECRET_KEY"];
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Flutterwave secret key not configured" }), { status: 400, headers: corsHeaders });
      }

      reference = `FLW-${order.order_number}-${Date.now().toString(36)}`;

      const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: amountDue,
          currency: order.currency || "NGN",
          redirect_url: safeCallbackUrl,
          meta: {
            order_id: order.id,
            org_id: order.org_id,
          },
          customer: { email: "customer@example.com" },
        }),
      });

      const flwData = await flwRes.json();
      if (flwData.status !== "success") {
        return new Response(JSON.stringify({ error: flwData.message || "Flutterwave initialization failed" }), { status: 400, headers: corsHeaders });
      }
      checkoutUrl = flwData.data.link;

    } else if (gateway === "stripe") {
      const secretKey = keys["secret_key"] || keys["STRIPE_SECRET_KEY"];
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), { status: 400, headers: corsHeaders });
      }

      reference = `STRIPE-${order.order_number}-${Date.now().toString(36)}`;

      const params = new URLSearchParams();
      params.append("mode", "payment");
      params.append("success_url", safeCallbackUrl + "?payment=success");
      params.append("cancel_url", `${origin}/dashboard?payment=cancelled`);
      params.append("line_items[0][price_data][currency]", (order.currency || "NGN").toLowerCase());
      params.append("line_items[0][price_data][product_data][name]", `Order ${order.order_number}`);
      params.append("line_items[0][price_data][unit_amount]", String(Math.round(amountDue * 100)));
      params.append("line_items[0][quantity]", "1");
      params.append("metadata[order_id]", order.id);
      params.append("metadata[org_id]", order.org_id);

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(secretKey + ":")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const stripeData = await stripeRes.json();
      if (stripeData.error) {
        return new Response(JSON.stringify({ error: stripeData.error.message }), { status: 400, headers: corsHeaders });
      }
      checkoutUrl = stripeData.url;
      reference = stripeData.id;
    } else {
      return new Response(JSON.stringify({ error: "Unsupported gateway" }), { status: 400, headers: corsHeaders });
    }

    // Create a pending payment record
    await serviceClient.from("payments").insert({
      org_id: order.org_id,
      order_id: order.id,
      amount: amountDue,
      currency: order.currency || "NGN",
      payment_type: "full",
      payment_gateway: gateway,
      gateway_payment_id: reference,
      gateway_checkout_url: checkoutUrl,
      status: "pending",
      platform_fee_amount: Number(order.platform_fee_amount) || 0,
      admin_fee_amount: Number(order.admin_fee_amount) || 0,
    });

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
