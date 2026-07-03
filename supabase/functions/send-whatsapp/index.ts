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

async function sendViaTermii(to: string, message: string, countryCode: string, mediaUrl?: string) {
  const countryKeyMap: Record<string, string> = {
    NG: "TERMII_NG_API_KEY", GH: "TERMII_GH_API_KEY", KE: "TERMII_KE_API_KEY",
    ZA: "TERMII_ZA_API_KEY", UG: "TERMII_UG_API_KEY", TZ: "TERMII_TZ_API_KEY",
    RW: "TERMII_RW_API_KEY", SN: "TERMII_SN_API_KEY",
  };
  const apiKeyName = countryKeyMap[countryCode] || "TERMII_API_KEY";
  const apiKey = Deno.env.get(apiKeyName) || Deno.env.get("TERMII_API_KEY");
  if (!apiKey) throw new Error(`Termii API key not configured (${apiKeyName})`);

  const from = Deno.env.get("TERMII_WHATSAPP_NUMBER") || "FashionSA";
  const clean = to.replace("whatsapp:", "");

  const body: Record<string, unknown> = {
    api_key: apiKey, to: clean, from, sms: message,
    type: "plain", channel: "whatsapp",
  };
  if (mediaUrl) body.media = { url: mediaUrl, caption: message };

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Termii WhatsApp error:", JSON.stringify(data));
    throw new Error("WhatsApp provider delivery failed");
  }
  return { provider: "termii", id: data.message_id };
}

async function sendViaTwilio(to: string, message: string, templateSid?: string, templateVars?: Record<string, string>) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const waNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
  if (!sid || !token || !waNumber) throw new Error("Twilio WhatsApp credentials not configured");

  const fromNumber = `whatsapp:${waNumber}`;
  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const bodyParams: Record<string, string> = { To: toNumber, From: fromNumber };
  if (templateSid) {
    bodyParams.ContentSid = templateSid;
    if (templateVars) bodyParams.ContentVariables = JSON.stringify(templateVars);
  } else {
    bodyParams.Body = message;
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(bodyParams).toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Twilio WhatsApp error:", JSON.stringify(data));
    throw new Error("WhatsApp provider delivery failed");
  }
  return { provider: "twilio", id: data.sid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }


  // --- Require authenticated user ---
  const _authHeader = req.headers.get("Authorization");
  if (!_authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: _authHeader } } }
    );
    const { data: _authData, error: _authError } = await _authClient.auth.getUser();
    if (_authError || !_authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  // --- end auth ---

  try {
    const {
      to, message, media_url, template_sid, template_variables,
      event_type, org_id, order_id, recipient_id, recipient_type,
      force_provider,
    } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing required field: to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!message && !template_sid) {
      return new Response(
        JSON.stringify({ error: "Provide either message or template_sid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: { provider: string; id: string };
    const countryCode = isAfricanNumber(to);

    if (force_provider === "twilio") {
      result = await sendViaTwilio(to, message, template_sid, template_variables);
    } else if (force_provider === "termii" || countryCode) {
      // All African numbers route through Termii
      result = await sendViaTermii(to, message, countryCode || "NG", media_url);
    } else {
      // Non-African (international) → Twilio
      result = await sendViaTwilio(to, message, template_sid, template_variables);
    }

    if (org_id) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin.from("message_logs").insert({
        org_id, order_id: order_id || null, channel: "whatsapp",
        recipient_type: recipient_type || "customer",
        recipient_id: recipient_id || "00000000-0000-0000-0000-000000000000",
        recipient_contact: to, event_type: event_type || "general",
        subject: template_sid ? `Template: ${template_sid}` : null,
        body: message || null, status: "sent",
        external_id: result.id || null, sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, provider: result.provider, id: result.id, region: countryCode ? "africa" : "international" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp error:", err);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.org_id) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabaseAdmin.from("message_logs").insert({
          org_id: body.org_id, order_id: body.order_id || null, channel: "whatsapp",
          recipient_type: body.recipient_type || "customer",
          recipient_id: body.recipient_id || "00000000-0000-0000-0000-000000000000",
          recipient_contact: body.to, event_type: body.event_type || "general",
          body: body.message, status: "failed", error_message: err.message,
        });
      }
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ error: "An internal error occurred while sending WhatsApp message" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
