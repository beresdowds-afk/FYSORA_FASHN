import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * End-to-end tests against the DEPLOYED smart-route-message edge function.
 *
 * Each scenario sends a real HTTP request to smart-route-message and asserts
 * that the routing decision (which downstream edge function would be invoked)
 * matches expectations for WhatsApp and voice traffic.
 *
 * We do NOT assert on `success` / `primary_result` because the downstream
 * provider calls (WhatChimp, Twilio, Termii) require live credentials and a
 * real recipient; the routing layer's correctness is fully observable from
 * `data.route` regardless of provider success.
 */

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL / VITE_SUPABASE_URL not set");
assert(SUPABASE_ANON_KEY, "VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY not set");

const ROUTER_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/smart-route-message`;

async function callRouter(body: Record<string, unknown>) {
  const res = await fetch(ROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// Helper: which downstream edge function the router will dispatch to.
function expectedDownstream(channel: string, provider: string): string {
  if (channel === "whatsapp") return "whatchimp-send";
  if (channel === "voice") return "twilio-webhook";
  if (channel === "sms" && provider === "termii") return "termii-send";
  if (channel === "sms") return "send-sms";
  return "send-sms";
}

Deno.test("smart-route-message: WhatsApp media payload routes via WhatChimp", async () => {
  const { status, data } = await callRouter({
    to: "+2348012345678",
    message: "Test sketch",
    media_url: "https://example.com/sketch.png",
    process_type: "general",
  });

  assertEquals(status, 200, `Router returned ${status}: ${JSON.stringify(data)}`);
  assert(data?.route, "Response missing 'route'");
  assertEquals(data.route.channel, "whatsapp");
  assertEquals(data.route.provider, "whatchimp");
  assertEquals(expectedDownstream(data.route.channel, data.route.provider), "whatchimp-send");
});

Deno.test("smart-route-message: customer support traffic routes to WhatsApp first", async () => {
  const { status, data } = await callRouter({
    to: "+254712345678",
    message: "Help with order #1234",
    process_type: "customer_support",
  });

  assertEquals(status, 200);
  assertEquals(data.route.channel, "whatsapp");
  assertEquals(data.route.provider, "whatchimp");
});

Deno.test("smart-route-message: international long-form payload uses WhatsApp", async () => {
  const { status, data } = await callRouter({
    to: "+14155550100",
    message: "x".repeat(400),
    process_type: "general",
  });

  assertEquals(status, 200);
  assertEquals(data.route.channel, "whatsapp");
  assertEquals(data.route.provider, "whatchimp");
});

Deno.test("smart-route-message: designer voice consultation routes to Twilio voice", async () => {
  const { status, data } = await callRouter({
    to: "+2348012345678",
    message: "Schedule a fitting call",
    process_type: "designer_consultation",
  });

  assertEquals(status, 200);
  assertEquals(data.route.channel, "voice");
  assertEquals(data.route.provider, "twilio");
  assertEquals(expectedDownstream(data.route.channel, data.route.provider), "twilio-webhook");
});

Deno.test("smart-route-message: explicit voice_call process type also routes to Twilio voice", async () => {
  const { status, data } = await callRouter({
    to: "+447911123456",
    message: "Voice call requested",
    process_type: "voice_call",
  });

  assertEquals(status, 200);
  assertEquals(data.route.channel, "voice");
  assertEquals(data.route.provider, "twilio");
});

Deno.test("smart-route-message: force_channel/force_provider overrides win", async () => {
  const { status, data } = await callRouter({
    to: "+2348012345678",
    message: "Override test",
    force_channel: "whatsapp",
    force_provider: "whatchimp",
  });

  assertEquals(status, 200);
  assertEquals(data.route.channel, "whatsapp");
  assertEquals(data.route.provider, "whatchimp");
  assert(/forced/i.test(data.route.reason || ""), `Expected forced reason, got: ${data.route.reason}`);
});

Deno.test("smart-route-message: rejects payload missing 'to' or 'message' with 400", async () => {
  const { status, data } = await callRouter({ to: "+2348012345678" });
  assertEquals(status, 400);
  assert(data?.error, "Expected error field on 400 response");
});