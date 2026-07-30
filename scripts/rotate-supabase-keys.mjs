#!/usr/bin/env node
/**
 * Automated Supabase key-rotation workflow with rollback.
 *
 * Steps:
 *   1. Snapshot the current .env (backup written to .env.rotation-backup).
 *   2. Write the new publishable key / URL / project ref into .env.
 *   3. Run verification: typecheck, unit tests, and a live health-check probe.
 *   4. On any failure, restore the snapshot and exit non-zero so the deploy
 *      is aborted before the broken keys ever reach production.
 *
 * Usage:
 *   node scripts/rotate-supabase-keys.mjs \
 *     --key sb_publishable_xxx [--url https://ref.supabase.co] [--ref ref] [--dry-run]
 *
 * Env fallbacks: NEW_SUPABASE_PUBLISHABLE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_PROJECT_ID
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");
const BACKUP_PATH = resolve(process.cwd(), ".env.rotation-backup");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};
const DRY_RUN = args.includes("--dry-run");

const newKey = flag("key") ?? process.env.NEW_SUPABASE_PUBLISHABLE_KEY;
const newUrl = flag("url") ?? process.env.NEW_SUPABASE_URL;
const newRef = flag("ref") ?? process.env.NEW_SUPABASE_PROJECT_ID;

const log = (m) => console.log(`[rotate] ${m}`);
const fail = (m) => {
  console.error(`[rotate] FAILED: ${m}`);
  process.exit(1);
};

if (!newKey && !newUrl && !newRef) {
  fail("nothing to rotate — pass --key and/or --url/--ref");
}
if (newKey && !/^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(newKey)) {
  fail('--key is malformed (expected "sb_publishable_..." or a legacy JWT anon key)');
}
if (newUrl && !/^https:\/\/[a-z0-9-]+\.(supabase\.co|lovable\.cloud)\/?$/i.test(newUrl)) {
  fail('--url is malformed (expected "https://<project-ref>.supabase.co")');
}
if (!existsSync(ENV_PATH)) fail(".env not found — cannot rotate");

const original = readFileSync(ENV_PATH, "utf8");

function upsert(content, key, value) {
  if (value === undefined) return content;
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}\\s*=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.replace(/\n*$/, "\n")}${line}\n`;
}

let next = original;
next = upsert(next, "VITE_SUPABASE_PUBLISHABLE_KEY", newKey);
next = upsert(next, "VITE_SUPABASE_URL", newUrl);
next = upsert(next, "VITE_SUPABASE_PROJECT_ID", newRef);

if (next === original) {
  log("no changes needed — keys already current");
  process.exit(0);
}

if (DRY_RUN) {
  log("dry run — .env would be updated with the supplied values");
  process.exit(0);
}

copyFileSync(ENV_PATH, BACKUP_PATH);
writeFileSync(ENV_PATH, next);
log("wrote new credentials to .env (backup at .env.rotation-backup)");

function rollback(reason) {
  copyFileSync(BACKUP_PATH, ENV_PATH);
  unlinkSync(BACKUP_PATH);
  console.error(`[rotate] ROLLED BACK — ${reason}`);
  console.error("[rotate] previous credentials restored; deployment aborted.");
  process.exit(1);
}

const VERIFY_STEPS = [
  { name: "typecheck", cmd: "npx tsc --noEmit -p tsconfig.json" },
  { name: "unit tests", cmd: "npx vitest run --passWithNoTests" },
];

for (const step of VERIFY_STEPS) {
  try {
    log(`verifying: ${step.name}`);
    execSync(step.cmd, { stdio: "inherit" });
  } catch {
    rollback(`verification step "${step.name}" failed`);
  }
}

// Live probe against the rotated project's health-check endpoint.
const probeUrl = (newUrl ?? next.match(/^VITE_SUPABASE_URL\s*=\s*"?([^"\n]+)"?/m)?.[1] ?? "").replace(/\/$/, "");
const probeKey = newKey ?? next.match(/^VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\n]+)"?/m)?.[1];

if (probeUrl && probeKey) {
  try {
    log("verifying: live health-check probe");
    const res = await fetch(`${probeUrl}/functions/v1/health-check`, {
      headers: { apikey: probeKey, Authorization: `Bearer ${probeKey}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(JSON.stringify(body, null, 2));
      rollback(`health-check returned HTTP ${res.status} (${(body.failed_checks ?? []).join(", ")})`);
    }
    log(`health-check: ${body.status ?? "ok"}`);
  } catch (err) {
    rollback(`health-check probe threw: ${err instanceof Error ? err.message : String(err)}`);
  }
} else {
  log("skipping live probe — no URL/key resolvable");
}

unlinkSync(BACKUP_PATH);
log("rotation verified — safe to publish");
