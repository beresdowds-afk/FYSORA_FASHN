import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      message,
      channel = "generic", // generic | whatsapp | dnd
      sender_id,
      media_url,
      event_type,
      org_id,
      order_id,
      recipient_id,
      recipient_type,
      country_code = "NG",
    } = await req.json();

    if (!to || (!message && channel !== "whatsapp")) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select the appropriate API key based on country
    const countryKeyMap: Record<string, string> = {
      NG: "TERMII_NG_API_KEY",
      GH: "TERMII_GH_API_KEY",
      KE: "TERMII_KE_API_KEY",
      ZA: "TERMII_ZA_API_KEY",
      UG: "TERMII_UG_API_KEY",
      TZ: "TERMII_TZ_API_KEY",
      RW: "TERMII_RW_API_KEY",
      SN: "TERMII_SN_API_KEY",
    };

    const apiKeyName = countryKeyMap[country_code] || "TERMII_API_KEY";
    const apiKey = Deno.env.get(apiKeyName) || Deno.env.get("TERMII_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `Termii API key not configured (${apiKeyName})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const termiiBaseUrl = "https://api.ng.termii.com/api";
    let termiiResponse;

    if (channel === "whatsapp") {
      // WhatsApp via Termii
      termiiResponse = await fetch(`${termiiBaseUrl}/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to,
          from: sender_id || Deno.env.get("TERMII_WHATSAPP_NUMBER") || "FashionSA",
          sms: message,
          type: "plain",
          channel: "whatsapp",
          media: media_url ? { url: media_url, caption: message } : undefined,
        }),
      });
    } else {
      // SMS via Termii
      termiiResponse = await fetch(`${termiiBaseUrl}/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to,
          from: sender_id || Deno.env.get("TERMII_DEFAULT_SENDER_ID") || "FashionSA",
          sms: message,
          type: "plain",
          channel: channel === "dnd" ? "dnd" : "generic",
        }),
      });
    }

    const termiiData = await termiiResponse.json();

    // Log the message
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const logEntry = {
      org_id: org_id || null,
      order_id: order_id || null,
      channel: channel === "whatsapp" ? "whatsapp" : "sms",
      recipient_type: recipient_type || "customer",
      recipient_id: recipient_id || "00000000-0000-0000-0000-000000000000",
      recipient_contact: to,
      event_type: event_type || "general",
      body: message || null,
    };

    if (!termiiResponse.ok) {
      if (org_id) {
        await supabaseAdmin.from("message_logs").insert({
          ...logEntry,
          status: "failed",
          error_message: JSON.stringify(termiiData),
        });
      }
      return new Response(
        JSON.stringify({ error: "Failed to send message via Termii", details: termiiData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org_id) {
      await supabaseAdmin.from("message_logs").insert({
        ...logEntry,
        status: "sent",
        external_id: termiiData.message_id || null,
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message_id: termiiData.message_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("termii-send error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
