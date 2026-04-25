import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyTwilioSignature,
  persistWebhookEvent,
  pickHeaders,
  externalRequestUrl,
} from "../_shared/webhook-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "subscribe", "begin"];

// Complete African country dial codes — for cross-region routing coordination
const AFRICAN_PREFIXES: Record<string, string> = {
  "+234": "NG", "+233": "GH", "+221": "SN", "+225": "CI", "+228": "TG",
  "+229": "BJ", "+237": "CM", "+220": "GM", "+224": "GN", "+226": "BF",
  "+227": "NE", "+231": "LR", "+232": "SL", "+238": "CV", "+245": "GW",
  "+223": "ML", "+254": "KE", "+256": "UG", "+255": "TZ", "+250": "RW",
  "+251": "ET", "+252": "SO", "+253": "DJ", "+257": "BI", "+291": "ER",
  "+211": "SS", "+27": "ZA", "+258": "MZ", "+260": "ZM", "+263": "ZW",
  "+265": "MW", "+266": "LS", "+267": "BW", "+268": "SZ", "+261": "MG",
  "+264": "NA", "+242": "CG", "+243": "CD", "+241": "GA", "+240": "GQ",
  "+235": "TD", "+236": "CF", "+239": "ST", "+212": "MA", "+213": "DZ",
  "+216": "TN", "+218": "LY", "+20": "EG", "+249": "SD", "+230": "MU",
  "+248": "SC", "+269": "KM", "+262": "RE",
};

function isAfricanNumber(phone: string): string | null {
  const clean = phone.replace("whatsapp:", "").replace(/\s/g, "");
  for (const [prefix, code] of Object.entries(AFRICAN_PREFIXES)) {
    if (clean.startsWith(prefix)) return code;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "";

    // Routes that are CALLBACKS from Twilio must verify the signature.
    // `initiate-call` is the user-facing route (auth handled separately).
    const TWILIO_CALLBACK_ROUTES = new Set([
      "voice-inbound",
      "voice-status",
      "voice-ivr",
      "voice-recording-status",
      "message-status",
      "", // default = inbound message
    ]);

    if (TWILIO_CALLBACK_ROUTES.has(route)) {
      const verification = await verifyAndLogTwilioCallback(req, route);
      if (!verification.allow) {
        return verification.response!;
      }
      // Replace req with the cloned one whose body we can re-read
      req = verification.req;
    }

    // Voice routes
    if (route === "voice-inbound") return await handleInboundCall(req, supabaseAdmin);
    if (route === "voice-status") return await handleCallStatusCallback(req, supabaseAdmin);
    if (route === "voice-ivr") return await handleIvrGather(req, supabaseAdmin);
    if (route === "voice-recording-status") return await handleRecordingStatus(req, supabaseAdmin);
    if (route === "initiate-call") return await handleInitiateCall(req, supabaseAdmin);
    if (route === "message-status") return await handleStatusCallback(req, supabaseAdmin);

    // Default: inbound message
    return await handleInboundMessage(req, supabaseAdmin);
  } catch (err) {
    console.error("twilio-webhook error:", err);
    return twimlResponse("Error processing request");
  }
});

/**
 * Verifies the X-Twilio-Signature header and writes a webhook_event_log row.
 * In production an invalid signature returns 403 and is NOT processed.
 * If TWILIO_AUTH_TOKEN is missing (dev), the request is allowed but logged
 * as unverified so admins can spot the gap.
 */
async function verifyAndLogTwilioCallback(
  req: Request,
  route: string,
): Promise<{ allow: boolean; req: Request; response?: Response }> {
  const cloned = req.clone();
  const formData = await cloned.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = v.toString(); });

  const signature = req.headers.get("x-twilio-signature");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fullUrl = externalRequestUrl(req);

  const verification = await verifyTwilioSignature(fullUrl, params, signature, authToken);

  await persistWebhookEvent({
    provider: "twilio",
    event_type: route || "inbound_message",
    signature_verified: verification.verified,
    signature_reason: verification.reason,
    call_sid: params.CallSid || null,
    message_sid: params.MessageSid || null,
    from_number: params.From || null,
    to_number: params.To || null,
    status: params.CallStatus || params.MessageStatus || null,
    payload: params,
    headers: pickHeaders(req, ["x-twilio-signature", "user-agent", "content-type"]),
    processing_notes: verification.verified ? null : verification.reason,
  });

  // Strict mode: block unverified callbacks if the auth token IS configured.
  if (!verification.verified && authToken) {
    return {
      allow: false,
      req,
      response: new Response("Invalid signature", { status: 403 }),
    };
  }

  // Re-issue a request with the body again so downstream handlers can read it.
  const newBody = new URLSearchParams(params).toString();
  const replay = new Request(req.url, {
    method: req.method,
    headers: { ...Object.fromEntries(req.headers), "content-type": "application/x-www-form-urlencoded" },
    body: newBody,
  });
  return { allow: true, req: replay };
}

// ==================== VOICE HANDLERS ====================

async function handleInboundCall(req: Request, supabase: any) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = v.toString(); });

  const callSid = params.CallSid || "";
  const from = params.From || "";
  const to = params.To || "";
  const callerName = params.CallerName || "";

  const { data: phoneMapping } = await supabase
    .from("org_phone_numbers")
    .select("org_id")
    .eq("phone_number", to)
    .eq("status", "active")
    .maybeSingle();

  if (!phoneMapping) {
    console.error(`No organization found for voice number: ${to}`);
    return twimlVoiceResponse('<Say voice="alice">Sorry, this number is not configured. Goodbye.</Say><Hangup/>');
  }

  const orgId = phoneMapping.org_id;

  await supabase.from("call_logs").insert({
    org_id: orgId, direction: "inbound", call_sid: callSid,
    from_number: from, to_number: to, status: "ringing",
    caller_name: callerName || null, started_at: new Date().toISOString(),
  });

  const { data: org } = await supabase
    .from("organizations").select("name").eq("id", orgId).single();

  const orgName = org?.name || "our business";
  const functionUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1/twilio-webhook";
  const gatherUrl = `${functionUrl}?route=voice-ivr&org_id=${orgId}&call_sid=${callSid}`;

  const twiml = `
    <Say voice="alice">Thank you for calling ${escapeXml(orgName)}.</Say>
    <Gather numDigits="1" action="${gatherUrl}" method="POST" timeout="8">
      <Say voice="alice">
        Press 1 to speak with our team.
        Press 2 to leave a voicemail.
        Press 3 to hear our business hours.
      </Say>
    </Gather>
    <Say voice="alice">We didn't receive any input. Goodbye.</Say>
    <Hangup/>
  `;

  return twimlVoiceResponse(twiml);
}

async function handleIvrGather(req: Request, supabase: any) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id") || "";
  const callSid = url.searchParams.get("call_sid") || "";

  const formData = await req.formData();
  const digits = formData.get("Digits")?.toString() || "";

  const functionUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1/twilio-webhook";

  await supabase.from("call_logs").update({ ivr_path: [digits] }).eq("call_sid", callSid);

  switch (digits) {
    case "1": {
      const { data: orgPhones } = await supabase
        .from("org_phone_numbers").select("phone_number")
        .eq("org_id", orgId).eq("channel", "voice_forward").eq("status", "active")
        .limit(1).maybeSingle();

      if (orgPhones?.phone_number) {
        const recordingStatusUrl = `${functionUrl}?route=voice-recording-status&call_sid=${callSid}`;
        return twimlVoiceResponse(`
          <Say voice="alice">Connecting you now. This call may be recorded for quality purposes.</Say>
          <Record recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" timeout="3" playBeep="false" />
          <Dial callerId="${orgPhones.phone_number}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST">
            <Number>${orgPhones.phone_number}</Number>
          </Dial>
          <Say voice="alice">Sorry, no one is available right now. Please try again later. Goodbye.</Say>
          <Hangup/>
        `);
      }

      return twimlVoiceResponse(`
        <Say voice="alice">Sorry, no agents are available right now. Please leave a message after the beep and we will get back to you.</Say>
        <Record maxLength="120" action="${functionUrl}?route=voice-status" transcribe="true" />
        <Say voice="alice">Goodbye.</Say>
        <Hangup/>
      `);
    }

    case "2": {
      const recordingStatusUrl = `${functionUrl}?route=voice-recording-status&call_sid=${callSid}`;
      return twimlVoiceResponse(`
        <Say voice="alice">Please leave your message after the beep. Press pound when you are finished.</Say>
        <Record maxLength="180" finishOnKey="#" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" />
        <Say voice="alice">Thank you for your message. Goodbye.</Say>
        <Hangup/>
      `);
    }

    case "3":
      return twimlVoiceResponse(`
        <Say voice="alice">Our business hours are Monday through Friday, 9 AM to 5 PM. 
        We are closed on weekends and public holidays.
        Thank you for calling. Goodbye.</Say>
        <Hangup/>
      `);

    default:
      return twimlVoiceResponse(`<Say voice="alice">Invalid selection. Goodbye.</Say><Hangup/>`);
  }
}

async function handleCallStatusCallback(req: Request, supabase: any) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = v.toString(); });

  const callSid = params.CallSid || "";
  const callStatus = params.CallStatus || "";
  const duration = parseInt(params.CallDuration || "0");

  if (callSid) {
    const updates: Record<string, any> = { status: callStatus, updated_at: new Date().toISOString() };
    if (duration > 0) updates.duration_seconds = duration;
    if (callStatus === "in-progress") updates.answered_at = new Date().toISOString();
    if (["completed", "busy", "no-answer", "canceled", "failed"].includes(callStatus)) {
      updates.ended_at = new Date().toISOString();
    }
    await supabase.from("call_logs").update(updates).eq("call_sid", callSid);
  }

  return new Response("", { status: 200 });
}

async function handleRecordingStatus(req: Request, supabase: any) {
  const url = new URL(req.url);
  const callSid = url.searchParams.get("call_sid") || "";

  const formData = await req.formData();
  const recordingUrl = formData.get("RecordingUrl")?.toString() || "";
  const recordingSid = formData.get("RecordingSid")?.toString() || "";

  if (callSid && recordingUrl) {
    await supabase.from("call_logs")
      .update({ recording_url: recordingUrl, recording_sid: recordingSid })
      .eq("call_sid", callSid);
  }

  return new Response("", { status: 200 });
}

async function handleInitiateCall(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );

  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;
  const { to, orgId } = await req.json();

  if (!to || !orgId) {
    return new Response(JSON.stringify({ error: "Missing 'to' or 'orgId'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: member } = await supabase
    .from("org_members").select("role")
    .eq("org_id", orgId).eq("user_id", userId).eq("is_active", true).maybeSingle();

  if (!member) {
    return new Response(JSON.stringify({ error: "Not an org member" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: orgPhone } = await supabase
    .from("org_phone_numbers").select("phone_number")
    .eq("org_id", orgId).eq("status", "active").limit(1).maybeSingle();

  if (!orgPhone) {
    return new Response(JSON.stringify({ error: "No phone number configured for this organization" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const functionUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1/twilio-webhook";
  const statusUrl = `${functionUrl}?route=voice-status`;
  const recordingStatusUrl = `${functionUrl}?route=voice-recording-status`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const twimlForOutbound = `<Response><Say voice="alice">Connecting your call.</Say><Dial record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST"><Number>${to}</Number></Dial></Response>`;

  const callParams = new URLSearchParams({
    To: to, From: orgPhone.phone_number, Twiml: twimlForOutbound,
    StatusCallback: statusUrl,
    StatusCallbackEvent: "initiated ringing answered completed",
    StatusCallbackMethod: "POST",
  });

  try {
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: callParams.toString(),
    });

    const data = await res.json();

    if (data.sid) {
      await supabase.from("call_logs").insert({
        org_id: orgId, direction: "outbound", call_sid: data.sid,
        from_number: orgPhone.phone_number, to_number: to,
        status: "initiated", started_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, callSid: data.sid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: data.message || "Failed to initiate call" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Outbound call error:", e);
    return new Response(JSON.stringify({ error: "Failed to initiate call" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// ==================== MESSAGE HANDLERS ====================

async function handleInboundMessage(req: Request, supabase: any) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = value.toString(); });

  const messageSid = params.MessageSid || "";
  const from = params.From || "";
  const to = params.To || "";
  const body = params.Body || "";
  const numMedia = parseInt(params.NumMedia || "0");
  const channel = detectChannel(to, from);

  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = params[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  const cleanTo = to.replace("whatsapp:", "");
  const { data: phoneMapping } = await supabase
    .from("org_phone_numbers").select("org_id")
    .eq("phone_number", cleanTo).eq("status", "active").maybeSingle();

  if (!phoneMapping) {
    console.error(`No organization found for number: ${to}`);
    return twimlResponse("");
  }

  const orgId = phoneMapping.org_id;
  const cleanFrom = from.replace("whatsapp:", "");

  const { data: optOut } = await supabase
    .from("opt_out_registry").select("id")
    .eq("org_id", orgId).eq("customer_number", cleanFrom).eq("status", "opted_out").maybeSingle();

  const bodyLower = body.toLowerCase().trim();
  if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
    if (!optOut) {
      await supabase.from("opt_out_registry").insert({
        org_id: orgId, customer_number: cleanFrom, status: "opted_out",
      });
      await supabase.from("notifications").insert({
        org_id: orgId, user_id: "00000000-0000-0000-0000-000000000000",
        title: "Customer Opted Out",
        message: `Customer ${cleanFrom} has unsubscribed from messages`,
      });
    }
    return twimlResponse("You have been unsubscribed. Reply START to resubscribe.");
  }

  if (OPT_IN_KEYWORDS.includes(bodyLower) && optOut) {
    await supabase.from("opt_out_registry")
      .update({ status: "opted_in", opted_in_at: new Date().toISOString() })
      .eq("id", optOut.id);
    return twimlResponse("You have been resubscribed. You will now receive messages.");
  }

  if (optOut) return twimlResponse("");

  const thread = await getOrCreateThread(supabase, orgId, cleanFrom, channel);

  await supabase.from("inbound_messages").insert({
    org_id: orgId, thread_id: thread.id, message_sid: messageSid,
    from_number: cleanFrom, to_number: cleanTo, body, channel,
    num_media: numMedia, media_urls: mediaUrls, raw_event: params,
  });

  await supabase.from("message_threads").update({
    message_count: (thread.message_count || 0) + 1,
    last_message_at: new Date().toISOString(),
    last_message_preview: body.substring(0, 100),
  }).eq("id", thread.id);

  await supabase.from("message_logs").insert({
    org_id: orgId, channel,
    recipient_type: "customer",
    recipient_id: "00000000-0000-0000-0000-000000000000",
    recipient_contact: cleanFrom, event_type: "inbound_message",
    subject: `Inbound ${channel.toUpperCase()}`,
    body: body.substring(0, 500), status: "delivered",
    external_id: messageSid, sent_at: new Date().toISOString(),
  });

  // Apply routing rules — with Twilio-Termii coordination for replies
  const responseText = await applyRoutingRules(supabase, orgId, body, channel, thread, cleanFrom);
  return twimlResponse(responseText || "");
}

/**
 * Routing rules with Twilio-Termii coordination:
 * - If the customer is African, auto-replies route through Termii (not Twilio TwiML)
 * - If international, auto-replies go through Twilio TwiML as normal
 */
async function applyRoutingRules(
  supabase: any, orgId: string, messageBody: string,
  channel: string, thread: any, customerNumber: string
) {
  const { data: rules } = await supabase
    .from("message_routing_rules").select("*")
    .eq("org_id", orgId).eq("enabled", true).order("priority", { ascending: true });

  if (!rules || rules.length === 0) return null;

  for (const rule of rules) {
    if (evaluateRule(rule, messageBody, channel, thread)) {
      if (rule.action_type === "auto_reply" && rule.auto_response) {
        // Log the outbound message
        await supabase.from("outbound_messages").insert({
          org_id: orgId, thread_id: thread.id, to_number: customerNumber,
          body: rule.auto_response, channel, status: "queued",
          priority: "high", is_auto_reply: true,
        });

        const africaCountry = isAfricanNumber(customerNumber);

        if (africaCountry) {
          // African customer: route reply through Termii instead of Twilio
          await sendViaTermii(supabase, orgId, customerNumber, rule.auto_response, channel, africaCountry);
          // Return empty TwiML since we sent via Termii
          return null;
        } else {
          // International customer: reply via Twilio TwiML
          await sendTwilioMessage(supabase, orgId, customerNumber, rule.auto_response, channel);
          return rule.auto_response;
        }
      }

      if (rule.action_type === "webhook" && rule.webhook_url) {
        try {
          await fetch(rule.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "inbound_message", org_id: orgId, from: customerNumber,
              body: messageBody, channel, thread_id: thread.id,
            }),
          });
        } catch (e) {
          console.error("Webhook failed:", e);
        }
      }

      break;
    }
  }

  return null;
}

/**
 * Send reply via Termii for African customers.
 * Called when Twilio receives an inbound message from an African number,
 * and the reply needs to go out through Termii for cost efficiency.
 */
async function sendViaTermii(
  supabase: any, orgId: string, to: string,
  message: string, channel: string, countryCode: string
) {
  try {
    const functionUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1";
    const functionName = channel === "whatsapp" ? "send-whatsapp" : "send-sms";

    // Invoke our own edge function for proper routing & logging
    const res = await fetch(`${functionUrl}/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to, message, org_id: orgId,
        event_type: "auto_reply",
        recipient_type: "customer",
        recipient_id: "00000000-0000-0000-0000-000000000000",
        force_provider: "termii",
      }),
    });

    const data = await res.json();
    if (!res.ok) console.error("Termii cross-route failed:", data);
    return data;
  } catch (e) {
    console.error("Termii cross-route error:", e);
  }
}

function evaluateRule(rule: any, body: string, channel: string, thread: any): boolean {
  const bodyLower = body.toLowerCase();

  switch (rule.condition_type) {
    case "always":
      return true;
    case "keyword":
      return (rule.keywords || []).some((kw: string) => bodyLower.includes(kw.toLowerCase()));
    case "channel":
      return channel === rule.channel;
    case "time_based": {
      const now = new Date();
      const hour = now.getUTCHours();
      const day = now.getUTCDay();
      if (rule.time_type === "business_hours") {
        return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
      }
      if (rule.time_type === "range" && rule.start_time && rule.end_time) {
        const startH = parseInt(rule.start_time.split(":")[0]);
        const endH = parseInt(rule.end_time.split(":")[0]);
        return hour >= startH && hour <= endH;
      }
      return true;
    }
    case "customer_history":
      if (!thread) return false;
      if (rule.history_type === "new_customer") return (thread.message_count || 0) <= 1;
      if (rule.history_type === "returning_customer") return (thread.message_count || 0) > 5;
      return false;
    default:
      return false;
  }
}

async function sendTwilioMessage(
  supabase: any, orgId: string, to: string, body: string, channel: string
) {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
  const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  let fromNumber: string;
  let toNumber: string;

  if (channel === "whatsapp") {
    fromNumber = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
    toNumber = `whatsapp:${to}`;
  } else {
    fromNumber = TWILIO_PHONE_NUMBER || "";
    toNumber = to;
  }

  const msgParams = new URLSearchParams({ To: toNumber, From: fromNumber, Body: body });

  try {
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: msgParams.toString(),
    });
    return await res.json();
  } catch (e) {
    console.error("Twilio send error:", e);
  }
}

async function getOrCreateThread(supabase: any, orgId: string, customerNumber: string, channel: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: existing } = await supabase
    .from("message_threads").select("*")
    .eq("org_id", orgId).eq("customer_number", customerNumber).eq("channel", channel)
    .gte("last_message_at", thirtyDaysAgo.toISOString())
    .order("last_message_at", { ascending: false }).limit(1).maybeSingle();

  if (existing) return existing;

  const { data: newThread } = await supabase
    .from("message_threads").insert({
      org_id: orgId, customer_number: customerNumber, channel,
      message_count: 0, last_message_at: new Date().toISOString(),
    }).select().single();

  return newThread;
}

async function handleStatusCallback(req: Request, supabase: any) {
  const formData = await req.formData();
  const messageSid = formData.get("MessageSid")?.toString() || "";
  const status = formData.get("MessageStatus")?.toString() || "";

  if (messageSid && status) {
    await supabase.from("outbound_messages")
      .update({ status: mapTwilioStatus(status), updated_at: new Date().toISOString() })
      .eq("twilio_sid", messageSid);
  }

  return new Response("", { status: 200 });
}

function mapTwilioStatus(twilioStatus: string): string {
  const map: Record<string, string> = {
    queued: "queued", sent: "sent", delivered: "delivered",
    undelivered: "failed", failed: "failed", read: "delivered",
  };
  return map[twilioStatus] || twilioStatus;
}

function detectChannel(toNumber: string, fromNumber: string): string {
  if (toNumber.includes("whatsapp:") || fromNumber.includes("whatsapp:")) return "whatsapp";
  return "sms";
}

function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>${
    message ? `<Message>${escapeXml(message)}</Message>` : ""
  }</Response>`;
  return new Response(twiml, { status: 200, headers: { "Content-Type": "text/xml" } });
}

function twimlVoiceResponse(innerTwiml: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>${innerTwiml}</Response>`;
  return new Response(twiml, { status: 200, headers: { "Content-Type": "text/xml" } });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
