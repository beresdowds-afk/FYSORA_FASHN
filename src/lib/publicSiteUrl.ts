/**
 * Resolves the public-facing URL for an organization on FYSORA FASHN.
 */
import { isPlatformHostname, lookupTenantHost } from "@/config/tenantHostnames";

/**
 *
 * If the organization has set a `public_website_url` on their org_websites
 * record (e.g. a custom domain or a linked external site), all outbound links
 * across FYSORA FASHN should route there instead of the native /site/:slug
 * page. Otherwise we fall back to the native page.
 */
export const resolvePublicSiteUrl = (
  slug: string | null | undefined,
  publicWebsiteUrl?: string | null
): string => {
  const url = (publicWebsiteUrl || "").trim();
  if (url) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
  return `/site/${slug || ""}`;
};

export const isExternalSiteUrl = (url: string): boolean =>
  /^https?:\/\//i.test(url);

/**
 * True when a "custom integration" redirect target would send the visitor
 * back to FYSORA FASHN (or to this org's own page / own branded hostname),
 * which creates an endless redirect loop instead of opening a real website.
 */
export const isSelfReferentialSiteUrl = (
  target: string | null | undefined,
  opts: { slug?: string | null; ownHostnames?: string[] } = {}
): boolean => {
  const raw = (target || "").trim();
  if (!raw) return false;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (isPlatformHostname(host)) return true;

  // The org's own branded hostname is just an alias of its FYSORA page.
  const own = (opts.ownHostnames || []).map(h =>
    (h || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")
  );
  if (own.includes(host)) return true;

  // A tenant host we statically map back to a FYSORA org page.
  if (lookupTenantHost(host) || lookupTenantHost(`www.${host}`)) return true;

  // Same-origin link straight back to this org's native page.
  if (opts.slug && url.pathname.replace(/\/+$/, "") === `/site/${opts.slug}`) return true;

  return false;
};

/**
 * Resolve a custom hostname for a given org slug from org_custom_hostnames.
 * Used by `resolvePublicSiteUrlAsync` so cross-platform links to the org's
 * site honor the org's branded domain when present.
 *
 * NOTE: synchronous lookups should keep using `resolvePublicSiteUrl`. The
 * async variant is provided for callers that can await (server pages, share
 * actions). The custom hostname always takes precedence over the legacy
 * `public_website_url` because hostnames are admin-verified.
 */
export const resolvePublicSiteUrlAsync = async (
  slug: string | null | undefined,
  publicWebsiteUrl: string | null | undefined,
  supabase: { from: Function }
): Promise<string> => {
  if (slug) {
    try {
      export const resolvePublicSiteUrlAsync = async (
  orgId: string | null | undefined,
  slug: string | null | undefined,
  publicWebsiteUrl: string | null | undefined,
  supabase: { from: Function }
): Promise<string> => {
  if (orgId) {
    try {
      const { data, error } = await (supabase as any)
        .from("org_custom_hostnames")
        .select("hostname")
        .eq("org_id", orgId)
        .eq("is_verified", true)
        .eq("is_primary", true)
        .maybeSingle();

      if (!error && data?.hostname) {
        return `https://${data.hostname}`;
      }
    } catch (err) {
      console.error("Error resolving custom hostname:", err);
    }
  }

  return resolvePublicSiteUrl(slug, publicWebsiteUrl);
};
      if (match?.hostname) return `https://${match.hostname}`;
    } catch {}
  }
  return resolvePublicSiteUrl(slug, publicWebsiteUrl);
};
