import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TERMII_BASE = "https://api.ng.termii.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      // OTP params
      to, pin_type, pin_length, pin_time_to_live, pin_placeholder, message_text, otp_pin,
      // Sender ID params
      sender_id, usecase, company,
      // Campaign params
      campaign_id: campaignIdParam, org_id, channel, message, phonebook_id, sender_name,
      // Contact/Phonebook params
      phonebook_name, description, contacts,
      // Token API
      token_type, amount_of_token,
    } = await req.json();

    const apiKey = Deno.env.get("TERMII_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "TERMII_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let endpoint = "";
    let method = "POST";
    let body: Record<string, unknown> | null = null;

    switch (action) {
      // ── OTP APIs ──
      case "send_otp":
        endpoint = "/sms/otp/send";
        body = {
          api_key: apiKey,
          message_type: "NUMERIC",
          to,
          from: sender_id || Deno.env.get("TERMII_DEFAULT_SENDER_ID") || "FashionSA",
          channel: channel || "generic",
          pin_attempts: 3,
          pin_time_to_live: pin_time_to_live || 5,
          pin_length: pin_length || 6,
          pin_placeholder: pin_placeholder || "< 1234 >",
          message_text: message_text || "Your FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) OTP is < 1234 >. Valid for 5 minutes.",
          pin_type: pin_type || "NUMERIC",
        };
        break;

      case "verify_otp":
        endpoint = "/sms/otp/verify";
        body = { api_key: apiKey, pin_id: to, pin: otp_pin };
        break;

      case "send_in_app_otp":
        endpoint = "/sms/otp/send/in-app";
        body = {
          api_key: apiKey,
          pin_type: pin_type || "NUMERIC",
          phone_number: to,
          pin_attempts: 3,
          pin_time_to_live: pin_time_to_live || 5,
          pin_length: pin_length || 6,
        };
        break;

      // ── Sender ID ──
      case "request_sender_id":
        endpoint = "/sender-id/request";
        body = { api_key: apiKey, sender_id, usecase: usecase || "Transactional alerts", company: company || "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)" };
        break;

      case "list_sender_ids":
        endpoint = `/sender-id?api_key=${apiKey}`;
        method = "GET";
        break;

      // ── Balance ──
      case "get_balance":
        endpoint = `/get-balance?api_key=${apiKey}`;
        method = "GET";
        break;

      // ── Insights ──
      case "search_number":
        endpoint = "/check/dnd";
        body = { api_key: apiKey, phone_number: to };
        break;

      case "number_status":
        endpoint = "/insight/number/query";
        body = { api_key: apiKey, phone_number: to, country_code: "NG" };
        break;

      // ── Campaign ──
      case "send_campaign":
        endpoint = "/sms/campaigns/send";
        body = {
          api_key: apiKey,
          country_code: "234",
          sender_id: sender_name || Deno.env.get("TERMII_DEFAULT_SENDER_ID") || "FashionSA",
          message,
          channel: channel || "generic",
          message_type: "plain",
          phonebook_id,
          campaign_id: campaignIdParam,
        };
        break;

      case "get_campaigns":
        endpoint = `/sms/campaigns?api_key=${apiKey}`;
        method = "GET";
        break;

      case "campaign_history":
        endpoint = `/sms/campaigns/${campaignIdParam}?api_key=${apiKey}`;
        method = "GET";
        break;

      // ── Phonebook ──
      case "create_phonebook":
        endpoint = "/phonebooks";
        body = { api_key: apiKey, phonebook_name, description: description || "" };
        break;

      case "list_phonebooks":
        endpoint = `/phonebooks?api_key=${apiKey}`;
        method = "GET";
        break;

      case "add_contacts":
        endpoint = "/phonebooks/entries";
        body = {
          api_key: apiKey,
          phonebook_id,
          contact_list: contacts, // array of { phone_number, first_name, last_name, ... }
        };
        break;

      case "list_contacts":
        endpoint = `/phonebooks/${phonebook_id}/entries?api_key=${apiKey}`;
        method = "GET";
        break;

      // ── Voice ──
      case "send_voice_call":
        endpoint = "/sms/otp/send";
        body = {
          api_key: apiKey,
          to,
          from: sender_id || Deno.env.get("TERMII_DEFAULT_SENDER_ID") || "FashionSA",
          channel: "voice",
          pin_type: pin_type || "NUMERIC",
          pin_attempts: 3,
          pin_time_to_live: pin_time_to_live || 5,
          pin_length: pin_length || 6,
          pin_placeholder: pin_placeholder || "< 1234 >",
          message_text: message_text || "Your verification code is < 1234 >",
        };
        break;

      case "send_voice_token":
        endpoint = "/sms/otp/call";
        body = { api_key: apiKey, phone_number: to, code: otp_pin || "1234" };
        break;

      // ── Token ──
      case "send_token":
        endpoint = "/send-token";
        body = {
          api_key: apiKey,
          phone_number: to,
          token_type: token_type || "numeric",
          pin_length: pin_length || 6,
          amount: amount_of_token || 1,
        };
        break;

      // ── Events / Reports ──
      case "get_history":
        endpoint = `/sms/inbox?api_key=${apiKey}`;
        method = "GET";
        break;

      // ── Number API ──
      case "validate_number":
        endpoint = "/check/dnd";
        body = { api_key: apiKey, phone_number: to };
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown Termii action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const url = `${TERMII_BASE}${endpoint}`;
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body && method !== "GET") fetchOptions.body = JSON.stringify(body);

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    // Update provider status if balance check
    if (action === "get_balance" && response.ok) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin.from("comms_provider_status").update({
        status: "connected",
        balance_amount: data.balance || data.available_balance,
        balance_currency: data.currency || "NGN",
        last_checked_at: new Date().toISOString(),
      }).eq("provider", "termii");
    }

    return new Response(
      JSON.stringify({ success: response.ok, data, provider: "termii" }),
      { status: response.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("termii-api error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
