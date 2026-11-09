import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Paystack webhook signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    
    // Signature is mandatory: reject missing or mismatching signatures.
    if (!signature) {
      console.warn("paystack-dva-webhook: missing signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hash = createHmac("sha512", paystackKey).update(rawBody).digest("hex");
    if (hash !== signature) {
      console.warn("paystack-dva-webhook: invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle dedicatedaccount.assign.success
    if (event === "dedicatedaccount.assign.success") {
      const accountNumber = data.dedicated_account?.account_number;
      if (accountNumber) {
        await supabase
          .from("paystack_virtual_accounts")
          .update({ is_active: true })
          .eq("account_number", accountNumber);
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle charge.success — this fires when money lands in a DVA
    if (event === "charge.success" && data.channel === "dedicated_nuban") {
      const reference = data.reference;
      const amountKobo = data.amount;
      const amountNaira = amountKobo / 100;
      const customerCode = data.customer?.customer_code;

      // Find the virtual account
      const { data: va } = await supabase
        .from("paystack_virtual_accounts")
        .select("*")
        .eq("customer_code", customerCode)
        .eq("is_active", true)
        .order("account_type", { ascending: true }) // dedicated first
        .limit(1)
        .maybeSingle();

      if (!va) {
        console.error("No virtual account found for customer:", customerCode);
        return new Response(JSON.stringify({ received: true, warning: "No VA found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for duplicate transaction
      const { data: existingTx } = await supabase
        .from("paystack_dva_transactions")
        .select("id")
        .eq("paystack_reference", reference)
        .maybeSingle();

      if (existingTx) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record the transaction
      await supabase.from("paystack_dva_transactions").insert({
        virtual_account_id: va.id,
        user_id: va.user_id,
        paystack_reference: reference,
        amount: amountNaira,
        currency: "NGN",
        purpose: va.purpose || "general",
        status: "success",
        channel: "dedicated_nuban",
        sender_bank: data.authorization?.bank || null,
        sender_account: data.authorization?.last4 ? `****${data.authorization.last4}` : null,
        sender_name: data.customer?.first_name
          ? `${data.customer.first_name} ${data.customer.last_name || ""}`
          : null,
        session_id: data.authorization?.authorization_code || null,
        gateway_response: data.gateway_response || null,
        metadata: { paystack_data: data },
      });

      // Auto-credit wallet (token purchase: 100 NGN = 1 token)
      const creditsToAdd = Math.floor(amountNaira / 100);
      if (creditsToAdd > 0) {
        let { data: wallet } = await supabase
          .from("credit_wallets")
          .select("*")
          .eq("owner_id", va.user_id)
          .eq("owner_type", "user")
          .maybeSingle();

        if (!wallet) {
          const { data: newWallet } = await supabase
            .from("credit_wallets")
            .insert({
              owner_id: va.user_id,
              owner_type: "user",
              balance: 0,
              currency: "NGN",
            })
            .select()
            .single();
          wallet = newWallet;
        }

        if (wallet) {
          const newBalance = Number(wallet.balance) + creditsToAdd;
          await supabase
            .from("credit_wallets")
            .update({
              balance: newBalance,
              lifetime_purchased: Number(wallet.lifetime_purchased) + creditsToAdd,
            })
            .eq("id", wallet.id);

          await supabase.from("credit_transactions").insert({
            wallet_id: wallet.id,
            amount: creditsToAdd,
            balance_after: newBalance,
            type: "purchase",
            description: `DVA payment ₦${amountNaira.toLocaleString()} (Ref: ${reference})`,
            feature_type: "token_purchase",
          });

          // Mark transaction as credited
          await supabase
            .from("paystack_dva_transactions")
            .update({ credited_wallet: true, credited_at: new Date().toISOString() })
            .eq("paystack_reference", reference);
        }
      }

      // If temporary account, deactivate after use
      if (va.account_type === "temporary") {
        await supabase
          .from("paystack_virtual_accounts")
          .update({ is_active: false })
          .eq("id", va.id);
      }

      return new Response(JSON.stringify({ received: true, credited: creditsToAdd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: acknowledge
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
