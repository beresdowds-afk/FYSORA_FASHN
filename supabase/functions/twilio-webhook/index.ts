import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "subscribe", "begin"];

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

    // Handle status callbacks
    if (route === "message-status") {
      return await handleStatusCallback(req, supabaseAdmin);
    }

    // Handle inbound messages (default)
    return await handleInboundMessage(req, supabaseAdmin);
  } catch (err) {
    console.error("twilio-webhook error:", err);
    return twimlResponse("Error processing message");
  }
});

async function handleInboundMessage(req: Request, supabase: any) {
  // Parse form-encoded Twilio webhook payload
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const messageSid = params.MessageSid || "";
  const from = params.From || "";
  const to = params.To || "";
  const body = params.Body || "";
  const numMedia = parseInt(params.NumMedia || "0");
  const channel = detectChannel(to, from);

  // Extract media URLs
  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = params[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  // Detect organization by phone number
  const cleanTo = to.replace("whatsapp:", "");
  const { data: phoneMapping } = await supabase
    .from("org_phone_numbers")
    .select("org_id")
    .eq("phone_number", cleanTo)
    .eq("status", "active")
    .maybeSingle();

  if (!phoneMapping) {
    console.error(`No organization found for number: ${to}`);
    return twimlResponse("");
  }

  const orgId = phoneMapping.org_id;
  const cleanFrom = from.replace("whatsapp:", "");

  // Check opt-out status
  const { data: optOut } = await supabase
    .from("opt_out_registry")
    .select("id")
    .eq("org_id", orgId)
    .eq("customer_number", cleanFrom)
    .eq("status", "opted_out")
    .maybeSingle();

  // Handle opt-out keywords
  const bodyLower = body.toLowerCase().trim();
  if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
    if (!optOut) {
      await supabase.from("opt_out_registry").insert({
        org_id: orgId,
        customer_number: cleanFrom,
        status: "opted_out",
      });
      // Notify org
      await supabase.from("notifications").insert({
        org_id: orgId,
        user_id: "00000000-0000-0000-0000-000000000000",
        title: "Customer Opted Out",
        message: `Customer ${cleanFrom} has unsubscribed from messages`,
      });
    }
    return twimlResponse("You have been unsubscribed. Reply START to resubscribe.");
  }

  // Handle opt-in keywords
  if (OPT_IN_KEYWORDS.includes(bodyLower) && optOut) {
    await supabase
      .from("opt_out_registry")
      .update({ status: "opted_in", opted_in_at: new Date().toISOString() })
      .eq("id", optOut.id);
    return twimlResponse("You have been resubscribed. You will now receive messages.");
  }

  // If opted out, silently ignore
  if (optOut) {
    return twimlResponse("");
  }

  // Get or create thread
  const thread = await getOrCreateThread(supabase, orgId, cleanFrom, channel);

  // Store inbound message
  await supabase.from("inbound_messages").insert({
    org_id: orgId,
    thread_id: thread.id,
    message_sid: messageSid,
    from_number: cleanFrom,
    to_number: cleanTo,
    body,
    channel,
    num_media: numMedia,
    media_urls: mediaUrls,
    raw_event: params,
  });

  // Update thread
  await supabase
    .from("message_threads")
    .update({
      message_count: (thread.message_count || 0) + 1,
      last_message_at: new Date().toISOString(),
      last_message_preview: body.substring(0, 100),
    })
    .eq("id", thread.id);

  // Also log to message_logs for the existing Communications Hub
  await supabase.from("message_logs").insert({
    org_id: orgId,
    channel,
    recipient_type: "customer",
    recipient_id: "00000000-0000-0000-0000-000000000000",
    recipient_contact: cleanFrom,
    event_type: "inbound_message",
    subject: `Inbound ${channel.toUpperCase()}`,
    body: body.substring(0, 500),
    status: "delivered",
    external_id: messageSid,
    sent_at: new Date().toISOString(),
  });

  // Apply routing rules
  const responseText = await applyRoutingRules(supabase, orgId, body, channel, thread, cleanFrom);

  return twimlResponse(responseText || "");
}

async function applyRoutingRules(
  supabase: any,
  orgId: string,
  messageBody: string,
  channel: string,
  thread: any,
  customerNumber: string
) {
  const { data: rules } = await supabase
    .from("message_routing_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("enabled", true)
    .order("priority", { ascending: true });

  if (!rules || rules.length === 0) return null;

  for (const rule of rules) {
    if (evaluateRule(rule, messageBody, channel, thread)) {
      if (rule.action_type === "auto_reply" && rule.auto_response) {
        // Queue auto-reply as outbound
        await supabase.from("outbound_messages").insert({
          org_id: orgId,
          thread_id: thread.id,
          to_number: customerNumber,
          body: rule.auto_response,
          channel,
          status: "queued",
          priority: "high",
          is_auto_reply: true,
        });

        // Send immediately via Twilio
        await sendTwilioMessage(supabase, orgId, customerNumber, rule.auto_response, channel);

        return rule.auto_response;
      }

      if (rule.action_type === "webhook" && rule.webhook_url) {
        // Fire webhook in background
        try {
          await fetch(rule.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "inbound_message",
              org_id: orgId,
              from: customerNumber,
              body: messageBody,
              channel,
              thread_id: thread.id,
            }),
          });
        } catch (e) {
          console.error("Webhook failed:", e);
        }
      }

      break; // First matching rule wins
    }
  }

  return null;
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
  supabase: any,
  orgId: string,
  to: string,
  body: string,
  channel: string
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

  const params = new URLSearchParams({ To: toNumber, From: fromNumber, Body: body });

  try {
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Twilio send error:", e);
  }
}

async function getOrCreateThread(supabase: any, orgId: string, customerNumber: string, channel: string) {
  // Look for recent thread (within 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: existing } = await supabase
    .from("message_threads")
    .select("*")
    .eq("org_id", orgId)
    .eq("customer_number", customerNumber)
    .eq("channel", channel)
    .gte("last_message_at", thirtyDaysAgo.toISOString())
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  // Create new thread
  const { data: newThread } = await supabase
    .from("message_threads")
    .insert({
      org_id: orgId,
      customer_number: customerNumber,
      channel,
      message_count: 0,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  return newThread;
}

async function handleStatusCallback(req: Request, supabase: any) {
  const formData = await req.formData();
  const messageSid = formData.get("MessageSid")?.toString() || "";
  const status = formData.get("MessageStatus")?.toString() || "";

  if (messageSid && status) {
    // Update outbound message status
    await supabase
      .from("outbound_messages")
      .update({ status: mapTwilioStatus(status), updated_at: new Date().toISOString() })
      .eq("twilio_sid", messageSid);
  }

  return new Response("", { status: 200 });
}

function mapTwilioStatus(twilioStatus: string): string {
  const map: Record<string, string> = {
    queued: "queued",
    sent: "sent",
    delivered: "delivered",
    undelivered: "failed",
    failed: "failed",
    read: "delivered",
  };
  return map[twilioStatus] || twilioStatus;
}

function detectChannel(toNumber: string, fromNumber: string): string {
  if (toNumber.includes("whatsapp:") || fromNumber.includes("whatsapp:")) {
    return "whatsapp";
  }
  return "sms";
}

function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>${
    message ? `<Message>${escapeXml(message)}</Message>` : ""
  }</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
