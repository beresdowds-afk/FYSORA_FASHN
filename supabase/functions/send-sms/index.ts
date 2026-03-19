import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Complete African country dial codes → Termii routing
const AFRICAN_PREFIXES: Record<string, string> = {
  // West Africa
  "+234": "NG", "+233": "GH", "+221": "SN", "+225": "CI", "+228": "TG",
  "+229": "BJ", "+237": "CM", "+220": "GM", "+224": "GN", "+226": "BF",
  "+227": "NE", "+231": "LR", "+232": "SL", "+238": "CV", "+245": "GW",
  "+223": "ML",
  // East Africa
  "+254": "KE", "+256": "UG", "+255": "TZ", "+250": "RW", "+251": "ET",
  "+252": "SO", "+253": "DJ", "+257": "BI", "+291": "ER", "+211": "SS",
  // Southern Africa
  "+27": "ZA", "+258": "MZ", "+260": "ZM", "+263": "ZW", "+265": "MW",
  "+266": "LS", "+267": "BW", "+268": "SZ", "+261": "MG", "+264": "NA",
  // Central Africa
  "+242": "CG", "+243": "CD", "+241": "GA", "+240": "GQ", "+235": "TD",
  "+236": "CF", "+239": "ST",
  // North Africa
  "+212": "MA", "+213": "DZ", "+216": "TN", "+218": "LY", "+20": "EG",
  "+249": "SD",
  // Island nations
  "+230": "MU", "+248": "SC", "+269": "KM", "+262": "RE",
};

function isAfricanNumber(phone: string): string | null {
  const clean = phone.replace("whatsapp:", "").replace(/\s/g, "");
  for (const [prefix, code] of Object.entries(AFRICAN_PREFIXES)) {
    if (clean.startsWith(prefix)) return code;
  }
  return null;
}

async function sendViaTermii(to: string, message: string, countryCode: string, senderIdOverride?: string) {
  const countryKeyMap: Record<string, string> = {
    NG: "TERMII_NG_API_KEY", GH: "TERMII_GH_API_KEY", KE: "TERMII_KE_API_KEY",
    ZA: "TERMII_ZA_API_KEY", UG: "TERMII_UG_API_KEY", TZ: "TERMII_TZ_API_KEY",
    RW: "TERMII_RW_API_KEY", SN: "TERMII_SN_API_KEY",
  };
  const apiKeyName = countryKeyMap[countryCode] || "TERMII_API_KEY";
  const apiKey = Deno.env.get(apiKeyName) || Deno.env.get("TERMII_API_KEY");
  if (!apiKey) throw new Error(`Termii API key not configured (${apiKeyName})`);

  const senderId = senderIdOverride || Deno.env.get("TERMII_DEFAULT_SENDER_ID") || "FashionSA";
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey, to, from: senderId,
      sms: message, type: "plain", channel: "generic",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Termii SMS error:", JSON.stringify(data));
    throw new Error("SMS provider delivery failed");
  }
  return { provider: "termii", id: data.message_id };
}

async function sendViaTwilio(to: string, message: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) throw new Error("Twilio SMS credentials not configured");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return { provider: "twilio", id: data.sid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to, message, sender_id,
      event_type, org_id, order_id, recipient_id, recipient_type,
      force_provider, // "termii" | "twilio" to override auto-routing
    } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: { provider: string; id: string };
    const countryCode = isAfricanNumber(to);

    if (force_provider === "twilio") {
      result = await sendViaTwilio(to, message);
    } else if (force_provider === "termii" || countryCode) {
      // All African numbers route through Termii
      result = await sendViaTermii(to, message, countryCode || "NG", sender_id);
    } else {
      // Non-African (international) → Twilio
      result = await sendViaTwilio(to, message);
    }

    // Log success
    if (org_id) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin.from("message_logs").insert({
        org_id, order_id: order_id || null, channel: "sms",
        recipient_type: recipient_type || "customer",
        recipient_id: recipient_id || "00000000-0000-0000-0000-000000000000",
        recipient_contact: to, event_type: event_type || "general",
        body: message, status: "sent",
        external_id: result.id || null, sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, provider: result.provider, id: result.id, region: countryCode ? "africa" : "international" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-sms error:", err);

    // Try to log failure
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.org_id) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabaseAdmin.from("message_logs").insert({
          org_id: body.org_id, order_id: body.order_id || null, channel: "sms",
          recipient_type: body.recipient_type || "customer",
          recipient_id: body.recipient_id || "00000000-0000-0000-0000-000000000000",
          recipient_contact: body.to, event_type: body.event_type || "general",
          body: body.message, status: "failed", error_message: err.message,
        });
      }
    } catch (_) { /* ignore logging errors */ }

    return new Response(
      JSON.stringify({ error: "An internal error occurred while sending SMS" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
