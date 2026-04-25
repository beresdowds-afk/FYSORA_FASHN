// Shared HMAC / signature verification helpers for inbound webhooks.
// Used by twilio-webhook, whatchimp-webhook, and termii-webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface VerificationResult {
  verified: boolean;
  reason: string;
}

export interface PersistArgs {
  provider: "twilio" | "whatchimp" | "termii";
  event_type: string;
  signature_verified: boolean;
  signature_reason: string;
  external_id?: string | null;
  call_sid?: string | null;
  message_sid?: string | null;
  from_number?: string | null;
  to_number?: string | null;
  status?: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  org_id?: string | null;
  processing_notes?: string | null;
}

/**
 * Verifies a Twilio webhook by recomputing the HMAC-SHA1 signature and
 * comparing it to the X-Twilio-Signature header.
 *
 * Algorithm (per Twilio docs):
 *   HMAC-SHA1( authToken,
 *     fullUrl + concatenatedSortedFormParams ) → base64
 */
export async function verifyTwilioSignature(
  url: string,
  formParams: Record<string, string>,
  signatureHeader: string | null,
  authToken: string | undefined,
): Promise<VerificationResult> {
  if (!authToken) return { verified: false, reason: "TWILIO_AUTH_TOKEN not configured" };
  if (!signatureHeader) return { verified: false, reason: "Missing X-Twilio-Signature header" };

  const sortedKeys = Object.keys(formParams).sort();
  const concatenated = sortedKeys.reduce((acc, k) => acc + k + formParams[k], url);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(concatenated));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  return computed === signatureHeader
    ? { verified: true, reason: "ok" }
    : { verified: false, reason: "Signature mismatch" };
}

/**
 * Verifies a generic webhook secret-prefixed HMAC-SHA256 signature.
 * Header format: `sha256=<hex>` (used by WhatChimp & many providers).
 * Body must be the raw request body (string).
 */
export async function verifyHmacSha256(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  headerPrefix = "sha256=",
): Promise<VerificationResult> {
  if (!secret) return { verified: false, reason: "Webhook secret not configured" };
  if (!signatureHeader) return { verified: false, reason: "Missing signature header" };

  const provided = signatureHeader.startsWith(headerPrefix)
    ? signatureHeader.slice(headerPrefix.length)
    : signatureHeader;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time-ish comparison
  if (computed.length !== provided.length) {
    return { verified: false, reason: "Signature mismatch" };
  }
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0
    ? { verified: true, reason: "ok" }
    : { verified: false, reason: "Signature mismatch" };
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Persists a webhook delivery to webhook_event_log so the Super Admin
 * Communications Hub has a real-time audit trail.
 */
export async function persistWebhookEvent(args: PersistArgs): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from("webhook_event_log").insert({
      provider: args.provider,
      event_type: args.event_type,
      signature_verified: args.signature_verified,
      signature_reason: args.signature_reason,
      external_id: args.external_id ?? null,
      call_sid: args.call_sid ?? null,
      message_sid: args.message_sid ?? null,
      from_number: args.from_number ?? null,
      to_number: args.to_number ?? null,
      status: args.status ?? null,
      payload: args.payload,
      headers: args.headers,
      org_id: args.org_id ?? null,
      processing_notes: args.processing_notes ?? null,
    });
  } catch (e) {
    // Never let logging errors break webhook acknowledgement
    console.error("persistWebhookEvent failed:", e);
  }
}

/** Extracts a small set of headers we care about for forensic logging. */
export function pickHeaders(req: Request, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const v = req.headers.get(name);
    if (v) out[name.toLowerCase()] = v;
  }
  return out;
}

/**
 * Recompute the public-facing URL Twilio used to call this function,
 * preferring the X-Forwarded-* headers when present.
 */
export function externalRequestUrl(req: Request): string {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  return url.toString();
}