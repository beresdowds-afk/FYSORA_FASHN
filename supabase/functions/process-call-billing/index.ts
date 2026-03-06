import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      call_log_id,
      org_id,
      caller_user_id,
      caller_type = "customer",
      duration_seconds,
      call_type = "voip",
      rate_per_minute = 0.5,
    } = await req.json();

    if (!org_id || !caller_user_id || duration_seconds === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate credits
    const minutes = Math.ceil(duration_seconds / 60);
    const totalCredits = parseFloat((minutes * rate_per_minute).toFixed(2));

    // Find caller's wallet (or org wallet for tailor calls)
    const { data: wallet, error: walletErr } = await supabase
      .from("credit_wallets")
      .select("*")
      .eq("owner_id", caller_type === "tailor" ? org_id : caller_user_id)
      .eq("owner_type", caller_type === "tailor" ? "org" : "user")
      .single();

    if (walletErr || !wallet) {
      // Create billing record as failed
      await supabase.from("call_billing_records").insert({
        call_log_id,
        org_id,
        caller_user_id,
        caller_type,
        duration_seconds,
        rate_per_minute,
        total_credits_charged: totalCredits,
        billing_status: "failed",
        call_type,
        metadata: { error: "No wallet found" },
      });
      return new Response(
        JSON.stringify({ error: "No credit wallet found", billing_status: "failed" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check balance
    if (wallet.balance < totalCredits) {
      await supabase.from("call_billing_records").insert({
        call_log_id,
        org_id,
        caller_user_id,
        caller_type,
        wallet_id: wallet.id,
        duration_seconds,
        rate_per_minute,
        total_credits_charged: totalCredits,
        billing_status: "failed",
        call_type,
        metadata: { error: "Insufficient balance", balance: wallet.balance },
      });
      return new Response(
        JSON.stringify({ error: "Insufficient credits", balance: wallet.balance, required: totalCredits }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits
    const newBalance = parseFloat((wallet.balance - totalCredits).toFixed(2));
    await supabase
      .from("credit_wallets")
      .update({ balance: newBalance, lifetime_used: wallet.lifetime_used + totalCredits })
      .eq("id", wallet.id);

    // Record credit transaction
    await supabase.from("credit_transactions").insert({
      wallet_id: wallet.id,
      type: "deduction",
      amount: -totalCredits,
      balance_after: newBalance,
      feature_type: "voip_call",
      description: `VoIP ${call_type} call - ${minutes} min${minutes > 1 ? "s" : ""}`,
      session_id: call_log_id,
    });

    // Create billing record
    const { data: billingRecord } = await supabase
      .from("call_billing_records")
      .insert({
        call_log_id,
        org_id,
        caller_user_id,
        caller_type,
        wallet_id: wallet.id,
        duration_seconds,
        rate_per_minute,
        total_credits_charged: totalCredits,
        billing_status: "charged",
        call_type,
        charged_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Archive the call
    await supabase.from("platform_call_archives").insert({
      call_log_id,
      billing_record_id: billingRecord?.id,
      org_id,
      caller_id: caller_user_id,
      caller_type,
      call_type,
      duration_seconds,
      credits_charged: totalCredits,
    });

    return new Response(
      JSON.stringify({
        success: true,
        credits_charged: totalCredits,
        new_balance: newBalance,
        billing_record_id: billingRecord?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
