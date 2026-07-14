#!/usr/bin/env node
import process from "node:process";

const backendUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const attempts = 3;
const timeoutMs = 12_000;

function fail(message) {
  console.error(`\n❌ Passkey deployment health check failed: ${message}`);
  console.error("Publishing stopped before the frontend deploy to avoid releasing against an incomplete security backend.\n");
  process.exit(1);
}

if (!backendUrl || !publishableKey) {
  fail("Required deployment environment variables are unavailable.");
}

const endpoint = `${backendUrl.replace(/\/$/, "")}/functions/v1/passkey-recovery`;
let lastError = "The recovery function did not respond.";

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "health" }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (response.ok && payload?.ok === true) {
      const failedChecks = Object.entries(payload.checks ?? {})
        .filter(([, value]) => value !== true)
        .map(([name]) => name);

      if (failedChecks.length === 0) {
        console.log("✅ Passkey deployment health check passed: security schema, guard trigger, and recovery function are reachable.");
        process.exit(0);
      }
      lastError = `Unhealthy checks: ${failedChecks.join(", ")}`;
    } else {
      lastError = payload?.error || `Recovery function returned HTTP ${response.status}.`;
    }
  } catch (error) {
    lastError = error?.name === "AbortError"
      ? `Recovery function timed out after ${timeoutMs / 1000} seconds.`
      : error?.message || String(error);
  } finally {
    clearTimeout(timeout);
  }

  if (attempt < attempts) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
}

fail(lastError);