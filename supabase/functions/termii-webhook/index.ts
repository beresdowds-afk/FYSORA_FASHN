import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyHmacSha256,
  persistWebhookEvent,
  pickHeaders,
} from "../_shared/webhook-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-termii-signature, x-signature",
};

/**
 * Termii delivery / inbound message webhook.
 * Verifies the HMAC-SHA256 signature using TERMII_WEBHOOK_SECRET, persists
 * the event to webhook_event_log, and updates message_logs status.
 *
 * Termii payload shapes:
 *   Delivery report:
 *     { type: "outbound", id, message_id, receiver, sender, status, sent_at }
 *   Inbound message:
 *     { type: "inbound", message, sender, receiver, received_at }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    const signature =
      req.headers.get("x-termii-signature") ||
      req.headers.get("x-signature");
    const secret = Deno.env.get("TERMII_WEBHOOK_SECRET");

    const verification = await verifyHmacSha256(rawBody, signature, secret);

    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { payload = { raw: rawBody }; }

    const eventType =
      payload.type ||
      (payload.status ? "delivery_report" : "inbound_message");

    const messageId = payload.message_id || payload.id || null;
    const status = payload.status || null;

    await persistWebhookEvent({
      provider: "termii",
      event_type: eventType,
      signature_verified: verification.verified,
      signature_reason: verification.reason,
      external_id: messageId,
      message_sid: messageId,
      from_number: payload.sender || null,
      to_number: payload.receiver || null,
      status,
      payload,
      headers: pickHeaders(req, [
        "x-termii-signature", "x-signature", "user-agent", "content-type",
      ]),
      processing_notes: verification.verified ? null : verification.reason,
    });

    // Strict mode: reject when secret is configured but signature is bad.
    if (!verification.verified && secret) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Delivery status update → patch message_logs row.
    if (status && messageId) {
      const normalized = mapTermiiStatus(status);
      await supabase
        .from("message_logs")
        .update({ status: normalized })
        .eq("external_id", messageId);
    }

    // Inbound message → write to inbound_messages so the org sees it.
    if (eventType === "inbound" || eventType === "inbound_message") {
      const fromNumber = payload.sender;
      const toNumber = payload.receiver;
      const body = payload.message || payload.text || "";

      if (fromNumber && toNumber) {
        const { data: phoneMapping } = await supabase
          .from("org_phone_numbers")
          .select("org_id")
          .eq("phone_number", toNumber)
          .eq("status", "active")
          .maybeSingle();

        if (phoneMapping?.org_id) {
          await supabase.from("inbound_messages").insert({
            org_id: phoneMapping.org_id,
            from_number: fromNumber,
            to_number: toNumber,
            body,
            channel: payload.channel === "whatsapp" ? "whatsapp" : "sms",
            message_sid: messageId,
            raw_event: payload,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, verified: verification.verified }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("termii-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function mapTermiiStatus(s: string): string {
  const m: Record<string, string> = {
    Delivered: "delivered",
    DELIVERED: "delivered",
    Sent: "sent",
    Pending: "queued",
    Failed: "failed",
    Rejected: "failed",
    Expired: "failed",
  };
  return m[s] || s.toLowerCase();
}