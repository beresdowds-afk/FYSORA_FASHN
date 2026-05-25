/**
 * Automated role-access tests for SECURITY DEFINER functions.
 *
 * These tests confirm the contract documented in
 * docs/SECURITY_DEFINER_ACCESS_MODEL.md:
 *
 *  - Admin-only RPCs reject anon callers with a PostgREST "permission denied"
 *    (Postgres EXECUTE grant has been revoked).
 *  - The single admin RPC that is grant-callable by `authenticated`
 *    (`admin_set_verification_status`) is reachable by anon at the PostgREST
 *    layer only to the extent that the in-function guard rejects it. For anon
 *    callers Postgres rejects it before the body runs, so we still see a
 *    permission error.
 *
 * Run via:  bunx vitest run src/test/securityDefinerAccess.test.ts
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ruplopynbimfjowhpktz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGxvcHluYmltZmpvd2hwa3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Njg4MzYsImV4cCI6MjA4ODU0NDgzNn0.mAA_W_YAFF4NAED6SSmK5bwQzj7wj4u964NrFZjgwiI";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// (fn, args, expectedSubstrings[]) — substrings matched against (error.message || error.code)
const ADMIN_ONLY_RPCS: Array<{
  fn: string;
  args: Record<string, unknown>;
  expectMatches: string[];
}> = [
  {
    fn: "cleanup_expired_sentinel_storage_objects",
    args: { _limit: 1 },
    expectMatches: ["permission denied", "42501", "super_admin"],
  },
  {
    fn: "read_email_batch",
    args: { queue_name: "test", batch_size: 1, vt: 1 },
    expectMatches: ["permission denied", "42501", "super_admin"],
  },
  {
    fn: "delete_email",
    args: { queue_name: "test", message_id: 1 },
    expectMatches: ["permission denied", "42501", "super_admin"],
  },
  {
    fn: "enqueue_email",
    args: { queue_name: "test", payload: {} },
    expectMatches: ["permission denied", "42501", "super_admin"],
  },
  {
    fn: "move_to_dlq",
    args: { source_queue: "test", dlq_name: "test_dlq", message_id: 1, payload: {} },
    expectMatches: ["permission denied", "42501", "super_admin"],
  },
  {
    fn: "admin_set_verification_status",
    // Granted to `authenticated` at the EXECUTE level but guarded in-function.
    // Anon receives an "Not authenticated" raise OR a permission denial,
    // depending on how PostgREST resolves the call. Either is acceptable.
    args: {
      _target_type: "organization",
      _target_id: "00000000-0000-0000-0000-000000000000",
      _decision: "approved",
    },
    expectMatches: ["Not authenticated", "permission denied", "42501", "super admin"],
  },
];

// Internal helper — must never be reachable from PostgREST.
const INTERNAL_RPCS = ["log_admin_access_violation"];

// User-facing helpers — should be reachable by authenticated, but as anon we
// still expect a permission denial (anon is NOT granted EXECUTE).
const USER_FACING_HELPERS_ANON_DENIED: Array<{ fn: string; args: Record<string, unknown> }> = [
  { fn: "has_role", args: { _user_id: "00000000-0000-0000-0000-000000000000", _role: "customer" } },
  { fn: "is_org_member", args: { _user_id: "00000000-0000-0000-0000-000000000000", _org_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "is_monetization_enabled", args: {} },
];

function errSignature(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const e = error as { message?: string; code?: string; details?: string };
  return `${e.code ?? ""} ${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
}

describe("SECURITY DEFINER access model — anonymous callers", () => {
  it.each(ADMIN_ONLY_RPCS)(
    "admin-only RPC %s rejects anon",
    async ({ fn, args, expectMatches }) => {
      const { data, error } = await anon.rpc(fn as any, args);
      expect(error, `expected an error when anon calls ${fn}, got data: ${JSON.stringify(data)}`).toBeTruthy();
      const sig = errSignature(error);
      const matched = expectMatches.some((needle) => sig.includes(needle.toLowerCase()));
      expect(matched, `error signature "${sig}" should include one of ${JSON.stringify(expectMatches)}`).toBe(true);
    },
    15000,
  );

  it.each(INTERNAL_RPCS)("internal helper %s is not reachable as anon", async (fn) => {
    const { error } = await anon.rpc(fn as any, { _function_name: "probe" });
    expect(error).toBeTruthy();
    const sig = errSignature(error);
    expect(sig).toMatch(/permission denied|42501|could not find the function/);
  }, 15000);

  it.each(USER_FACING_HELPERS_ANON_DENIED)(
    "user-facing helper $fn is denied to anon (granted only to authenticated)",
    async ({ fn, args }) => {
      const { error } = await anon.rpc(fn as any, args);
      expect(error).toBeTruthy();
      const sig = errSignature(error);
      expect(sig).toMatch(/permission denied|42501/);
    },
    15000,
  );
});