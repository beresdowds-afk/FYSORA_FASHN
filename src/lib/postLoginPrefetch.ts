import { supabase } from "@/integrations/supabase/client";

export interface PrefetchedMembership {
  org_id: string;
  org_name: string;
  role: string;
}

export interface PrefetchedSessionData {
  userId: string;
  fetchedAt: number;
  role: string | null;
  memberships: PrefetchedMembership[];
  currentOrgId: string | null;
  identityVerified: boolean;
}

const CACHE_KEY = "fsa_post_login_cache_v1";
const TTL_MS = 60_000; // 1 minute — enough to make first dashboard render instant

/**
 * Fire-and-forget prefetch of the minimum data needed by the dashboard / org
 * picker / role-based router so the next page can render synchronously from cache.
 * Safe to call multiple times — it overwrites the cache.
 */
export async function prefetchPostLoginData(userId: string): Promise<PrefetchedSessionData | null> {
  if (!userId) return null;
  try {
    const [rolesRes, membershipsRes, profileRes] = await Promise.all([
      supabase.from("user_roles" as any).select("role").eq("user_id", userId),
      supabase
        .from("org_members")
        .select("org_id, role, organizations(name)")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("profiles")
        .select("current_org_id, identity_verified")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const rolesArr = (rolesRes.data as any[]) || [];
    const role = rolesArr[0]?.role ?? null;

    const memberships: PrefetchedMembership[] = ((membershipsRes.data as any[]) || []).map((m) => ({
      org_id: m.org_id,
      org_name: m.organizations?.name || "Unknown",
      role: m.role,
    }));

    const data: PrefetchedSessionData = {
      userId,
      fetchedAt: Date.now(),
      role,
      memberships,
      currentOrgId: (profileRes.data as any)?.current_org_id ?? null,
      identityVerified: !!(profileRes.data as any)?.identity_verified,
    };

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota / private-mode failures
    }
    return data;
  } catch (e) {
    console.warn("[postLoginPrefetch] failed:", e);
    return null;
  }
}

/** Read prefetched data if it was cached for the same user and is still fresh. */
export function readPrefetchedData(userId: string | undefined | null): PrefetchedSessionData | null {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrefetchedSessionData;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPrefetchedData() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}