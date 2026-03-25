import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// African country codes for Termii routing
const AFRICAN_PREFIXES = [
  "+234","+254","+27","+233","+256","+255","+250","+251",
  "+221","+225","+237","+20","+212","+213","+216","+218",
  "+260","+263","+267","+265","+258","+257","+253","+252",
  "+249","+248","+247","+246","+245","+244","+243","+242",
  "+241","+240","+239","+238","+236","+235","+232","+231",
  "+230","+229","+228","+227","+226","+224","+223","+222",
  "+220","+261","+262","+269",
];

function isAfricanNumber(phone: string): boolean {
  return AFRICAN_PREFIXES.some(p => phone.startsWith(p));
}

interface RouteDecision {
  channel: string;
  provider: string;
  fallback_channel: string | null;
  fallback_provider: string | null;
  reason: string;
}

function determineRoute(params: {
  message: string;
  to: string;
  has_media: boolean;
  priority: string;
  process_type: string;
}): RouteDecision {
  const { message, to, has_media, priority, process_type } = params;
  const isAfrican = isAfricanNumber(to);

  // Emergency / urgent → dual channel
  if (priority === "urgent" || process_type === "emergency_alert") {
    return {
      channel: "sms",
      provider: isAfrican ? "termii" : "twilio",
      fallback_channel: "whatsapp",
      fallback_provider: "whatchimp",
      reason: "Urgent priority: dual-channel delivery",
    };
  }

  // OTP → always SMS via Termii with voice fallback
  if (process_type === "otp_verification") {
    return {
      channel: "sms",
      provider: "termii",
      fallback_channel: "voice",
      fallback_provider: "termii",
      reason: "OTP: SMS primary with voice fallback",
    };
  }

  // Media content → WhatsApp
  if (has_media) {
    return {
      channel: "whatsapp",
      provider: "whatchimp",
      fallback_channel: "sms",
      fallback_provider: isAfrican ? "termii" : "twilio",
      reason: "Media content routes to WhatsApp",
    };
  }

  // Voice/video processes → Twilio
  if (process_type === "designer_consultation" || process_type === "voice_call") {
    return {
      channel: "voice",
      provider: "twilio",
      fallback_channel: "whatsapp",
      fallback_provider: "whatchimp",
      reason: "Voice/video via Twilio VoIP",
    };
  }

  // Customer support → WhatsApp primary
  if (process_type === "customer_support" || process_type === "feedback_collection") {
    return {
      channel: "whatsapp",
      provider: "whatchimp",
      fallback_channel: "sms",
      fallback_provider: isAfrican ? "termii" : "twilio",
      reason: "Support/feedback via WhatsApp for rich interaction",
    };
  }

  // International → WhatsApp (free for recipient)
  if (!isAfrican) {
    return {
      channel: "whatsapp",
      provider: "whatchimp",
      fallback_channel: "sms",
      fallback_provider: "twilio",
      reason: "International: WhatsApp (free for recipient)",
    };
  }

  // Short message → SMS (cost-effective)
  if (message.length < 160) {
    return {
      channel: "sms",
      provider: "termii",
      fallback_channel: "whatsapp",
      fallback_provider: "whatchimp",
      reason: "Short message: SMS via Termii (cheapest)",
    };
  }

  // Long message → WhatsApp (no per-segment charges)
  return {
    channel: "whatsapp",
    provider: "whatchimp",
    fallback_channel: "sms",
    fallback_provider: "termii",
    reason: "Long message: WhatsApp (no segment charges)",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      message,
      media_url,
      org_id,
      owner_id,
      process_type = "general",
      priority = "normal",
      event_type,
      order_id,
      recipient_id,
      recipient_type = "customer",
      force_channel,
      force_provider,
    } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' and 'message' fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // supabaseAdmin available for future analytics tracking
    const _supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine optimal route
    let route: RouteDecision;
    if (force_channel && force_provider) {
      route = {
        channel: force_channel,
        provider: force_provider,
        fallback_channel: null,
        fallback_provider: null,
        reason: "Forced channel/provider override",
      };
    } else {
      route = determineRoute({
        message,
        to,
        has_media: !!media_url,
        priority,
        process_type,
      });
    }

    // Build edge function name based on route
    let edgeFunctionName: string;
    const body: Record<string, unknown> = {
      to, message, org_id, owner_id, order_id,
      event_type: event_type || process_type,
      recipient_id, recipient_type,
    };

    if (route.channel === "sms") {
      if (route.provider === "termii") {
        edgeFunctionName = "termii-send";
        body.action = "send_sms";
      } else {
        edgeFunctionName = "send-sms";
      }
    } else if (route.channel === "whatsapp") {
      edgeFunctionName = "whatchimp-send";
      body.action = "send_message";
      body.owner_type = "organization";
      if (media_url) body.media_url = media_url;
    } else if (route.channel === "voice") {
      // Voice calls go through Twilio webhook
      edgeFunctionName = "twilio-webhook";
      body.route = "initiate-call";
    } else {
      edgeFunctionName = "send-sms"; // default fallback
    }

    // Attempt primary send
    const primaryUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${edgeFunctionName}`;
    const primaryResp = await fetch(primaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(body),
    });

    let primaryResult;
    try { primaryResult = await primaryResp.json(); } catch { primaryResult = {}; }

    let usedFallback = false;
    let fallbackResult = null;

    // If primary failed and we have a fallback, try it
    if (!primaryResp.ok && route.fallback_channel && route.fallback_provider) {
      usedFallback = true;
      // Simple fallback: try the other channel
      let fallbackFn: string;
      const fallbackBody = { ...body };

      if (route.fallback_channel === "whatsapp") {
        fallbackFn = "whatchimp-send";
        fallbackBody.action = "send_message";
      } else if (route.fallback_channel === "sms") {
        fallbackFn = isAfricanNumber(to) ? "termii-send" : "send-sms";
        if (isAfricanNumber(to)) fallbackBody.action = "send_sms";
      } else {
        fallbackFn = "send-sms";
      }

      const fallbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fallbackFn}`;
      const fbResp = await fetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(fallbackBody),
      });
      try { fallbackResult = await fbResp.json(); } catch { fallbackResult = {}; }
    }

    return new Response(
      JSON.stringify({
        success: primaryResp.ok || usedFallback,
        route: {
          channel: route.channel,
          provider: route.provider,
          reason: route.reason,
          used_fallback: usedFallback,
          fallback_channel: usedFallback ? route.fallback_channel : null,
        },
        primary_result: primaryResult,
        fallback_result: fallbackResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("smart-route-message error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
