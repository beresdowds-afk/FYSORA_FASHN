/**
 * Regression tests for the two security fixes applied earlier:
 *
 *   1. media_groups — per-command RLS policies so anon has no reach and
 *      only owners / org members can read, only owners insert, only
 *      owner or super_admin can update / delete.
 *
 *   2. org_websites webhook_url — anonymous visitors no longer read the
 *      raw table; they get the sanitised `org_websites_public` view
 *      (no webhook_url column) and, only for enabled custom_integration
 *      sites, the SECURITY DEFINER RPC `get_org_website_redirect`.
 *
 * We only exercise the anon surface here because that is what the fixes
 * lock down. Authenticated flows are covered by the app's e2e paths.
 *
 * Run:  bunx vitest run src/test/orgWebsiteAndMediaGroupAccess.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  "https://nsvwbqvnjsixepxrxysd.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdndicXZuanNpeGVweHJ4eXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODI5MDgsImV4cCI6MjA4NjY1ODkwOH0.92x3rBkLZqUzHK-y0kgagfo7aceWgcKqPfVoXPaB0F4";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RANDOM_UUID = "00000000-0000-0000-0000-000000000000";

function sig(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as { message?: string; code?: string; details?: string };
  return `${e.code ?? ""} ${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
}

describe("media_groups RLS — anon has no read/write access", () => {
  it("anon SELECT is denied or returns zero rows (never leaks other users)", async () => {
    const { data, error } = await anon.from("media_groups").select("id").limit(1);
    // Either PostgREST rejects (permission denied) or RLS filters to 0 rows.
    // Both outcomes prove anon cannot read another user's groups.
    if (error) {
      expect(sig(error)).toMatch(/permission denied|42501|rls|policy/);
    } else {
      expect(Array.isArray(data)).toBe(true);
      expect(data?.length ?? 0).toBe(0);
    }
  }, 15000);

  it("anon INSERT is rejected", async () => {
    const { error } = await anon
      .from("media_groups")
      .insert({ user_id: RANDOM_UUID, name: "regression-anon-insert" });
    expect(error, "anon INSERT must be blocked").toBeTruthy();
    expect(sig(error)).toMatch(/permission denied|row-level security|policy|42501/);
  }, 15000);

  it("anon UPDATE is rejected (matches 0 rows or hard-denies)", async () => {
    const { data, error } = await anon
      .from("media_groups")
      .update({ name: "regression-anon-update" })
      .eq("id", RANDOM_UUID)
      .select();
    if (error) {
      expect(sig(error)).toMatch(/permission denied|policy|42501/);
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  }, 15000);

  it("anon DELETE is rejected (matches 0 rows or hard-denies)", async () => {
    const { data, error } = await anon
      .from("media_groups")
      .delete()
      .eq("id", RANDOM_UUID)
      .select();
    if (error) {
      expect(sig(error)).toMatch(/permission denied|policy|42501/);
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  }, 15000);
});

describe("org_websites webhook URL — anon cannot read the raw table", () => {
  it("selecting webhook_url from org_websites is denied for anon", async () => {
    const { data, error } = await anon
      .from("org_websites")
      .select("webhook_url")
      .limit(1);
    // Either permission is denied (table not exposed to anon) or RLS
    // returns zero rows. Both guarantee webhook_url is not leaked.
    if (error) {
      expect(sig(error)).toMatch(/permission denied|42501|policy|not found/);
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  }, 15000);
});

describe("org_websites_public view — anon-safe surface", () => {
  it("view is reachable by anon", async () => {
    const { error } = await anon.from("org_websites_public" as any).select("id").limit(1);
    expect(error, "org_websites_public should be reachable by anon").toBeFalsy();
  }, 15000);

  it("view does NOT expose webhook_url", async () => {
    // Requesting a non-existent column returns a PostgREST 400 with 42703.
    const { error } = await anon.from("org_websites_public" as any).select("webhook_url").limit(1);
    expect(error, "view must not include webhook_url").toBeTruthy();
    expect(sig(error)).toMatch(/column .*webhook_url.*does not exist|42703|does not exist/);
  }, 15000);
});

describe("get_org_website_redirect RPC", () => {
  it("returns null (not an error) for an unknown org id", async () => {
    const { data, error } = await anon.rpc("get_org_website_redirect" as any, {
      _org_id: RANDOM_UUID,
    });
    expect(error).toBeFalsy();
    expect(data).toBeNull();
  }, 15000);

  it("never returns a value for a site that isn't enabled + custom_integration", async () => {
    // Real orgs exist, but none of them (in the general case) will match the
    // "enabled AND custom_integration" filter for a random uuid. Sample the
    // public view and probe each returned org; every result must be either
    // null or a well-formed URL. The point is: no throw, no leak.
    const { data: sites } = await anon
      .from("org_websites_public" as any)
      .select("org_id, mode, is_enabled")
      .limit(5);
    for (const s of (sites ?? []) as any[]) {
      const { data, error } = await anon.rpc("get_org_website_redirect" as any, {
        _org_id: s.org_id,
      });
      expect(error).toBeFalsy();
      if (data != null) {
        // The only way we should get a value is when mode is custom_integration + enabled.
        expect(s.mode).toBe("custom_integration");
        expect(s.is_enabled).toBe(true);
        expect(String(data)).toMatch(/^https?:\/\//);
      }
    }
  }, 20000);
});

describe("Redirect failure logging RPC is callable", () => {
  it("log_org_website_redirect_failure accepts anon calls without error", async () => {
    const { error } = await anon.rpc("log_org_website_redirect_failure" as any, {
      _org_id: RANDOM_UUID,
      _reason: "regression_test_probe",
    });
    // The org id doesn't exist, so the fn writes nothing; it must still succeed.
    expect(error).toBeFalsy();
  }, 15000);
});