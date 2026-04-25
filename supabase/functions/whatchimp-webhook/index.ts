import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyHmacSha256,
  persistWebhookEvent,
  pickHeaders,
} from "../_shared/webhook-verify.ts";

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
    // Read raw body once for signature verification, then parse.
    const rawBody = await req.text();

    const signature =
      req.headers.get("x-whatchimp-signature") ||
      req.headers.get("x-hub-signature-256") ||
      req.headers.get("x-signature");
    const secret = Deno.env.get("WHATCHIMP_WEBHOOK_SECRET");

    const verification = await verifyHmacSha256(rawBody, signature, secret);

    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { payload = { raw: rawBody }; }

    const eventType = payload.event || payload.type || "unknown";

    await persistWebhookEvent({
      provider: "whatchimp",
      event_type: eventType,
      signature_verified: verification.verified,
      signature_reason: verification.reason,
      external_id: payload.message_id || payload.id || null,
      message_sid: payload.message_id || null,
      from_number: payload.from || payload.sender || null,
      to_number: payload.to || payload.recipient || null,
      status: payload.status || null,
      payload,
      headers: pickHeaders(req, [
        "x-whatchimp-signature", "x-hub-signature-256", "x-signature",
        "user-agent", "content-type",
      ]),
      processing_notes: verification.verified ? null : verification.reason,
    });

    // Strict mode: reject when the secret IS configured but signature is bad.
    if (!verification.verified && secret) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle inbound WhatsApp messages
    if (eventType === "message.received" || eventType === "inbound") {
      const fromNumber = payload.from || payload.sender;
      const toNumber = payload.to || payload.recipient;
      const body = payload.message?.text || payload.body || payload.text || "";
      const mediaUrls = payload.message?.media || payload.media_urls || null;

      // Find the org by WhatsApp number
      const { data: phoneNumber } = await supabaseAdmin
        .from("platform_phone_numbers")
        .select("*")
        .eq("provider", "whatchimp")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      // Try to match to org via whatchimp_api_keys
      const { data: keyMatch } = await supabaseAdmin
        .from("whatchimp_api_keys")
        .select("org_id, owner_id, owner_type")
        .eq("whatsapp_number", toNumber)
        .eq("is_active", true)
        .maybeSingle();

      const orgId = keyMatch?.org_id;

      if (orgId) {
        // Find or create thread
        let { data: thread } = await supabaseAdmin
          .from("message_threads")
          .select("id")
          .eq("org_id", orgId)
          .eq("customer_number", fromNumber)
          .eq("channel", "whatsapp")
          .maybeSingle();

        if (!thread) {
          const { data: newThread } = await supabaseAdmin
            .from("message_threads")
            .insert({
              org_id: orgId,
              customer_number: fromNumber,
              channel: "whatsapp",
              status: "active",
              last_message_at: new Date().toISOString(),
              last_message_preview: body?.substring(0, 100),
            })
            .select()
            .single();
          thread = newThread;
        } else {
          await supabaseAdmin
            .from("message_threads")
            .update({
              last_message_at: new Date().toISOString(),
              last_message_preview: body?.substring(0, 100),
              message_count: (thread as any).message_count + 1,
            })
            .eq("id", thread.id);
        }

        // Store inbound message
        await supabaseAdmin.from("inbound_messages").insert({
          org_id: orgId,
          from_number: fromNumber,
          to_number: toNumber,
          body,
          channel: "whatsapp",
          thread_id: thread?.id,
          message_sid: payload.message_id || null,
          media_urls: mediaUrls,
          raw_event: payload,
        });
      }
    }

    // Handle delivery status updates
    if (eventType === "message.status" || eventType === "delivery") {
      const messageId = payload.message_id || payload.external_id;
      const status = payload.status || "unknown";

      if (messageId) {
        await supabaseAdmin
          .from("message_logs")
          .update({ status: status === "delivered" ? "delivered" : status })
          .eq("external_id", messageId);
      }
    }

    // Handle social media events
    if (eventType === "social.post_status") {
      console.log("Social post status update:", payload);
      // Could update social_sync_configs with status
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("whatchimp-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
