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

    // Verify the caller owns this registration
    if (reg.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    if (reg.status === "paid") {
      return new Response(JSON.stringify({ status: "already_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org Paystack key
    const { data: apiKeys } = await serviceClient
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", reg.org_id)
      .eq("provider", "paystack")
      .eq("is_active", true);

    const keys = Object.fromEntries((apiKeys || []).map((k: any) => [k.key_name, k.key_value]));
    const secretKey = keys["secret_key"] || keys["PAYSTACK_SECRET_KEY"];

    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), { status: 400, headers: corsHeaders });
    }

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verifyData = await verifyRes.json();

    if (verifyData.data?.status === "success") {
      await serviceClient.from("customer_registrations").update({
        status: "paid",
        paid_at: new Date().toISOString(),
      }).eq("id", reg.id);

      // Log $5 registration fee to platform_fee_ledger as FASHION STITCHES AFRICA revenue
      await serviceClient.from("platform_fee_ledger").insert({
        org_id: reg.org_id,
        fee_type: "registration_fee",
        amount: Number(reg.fee_amount) || 5,
        currency: reg.fee_currency || "USD",
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
    return new Response(JSON.stringify({ error: "An error occurred processing the payment verification" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
