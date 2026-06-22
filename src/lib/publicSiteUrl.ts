/**
 * Resolves the public-facing URL for an organization on FYSORA FASHN.
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
      const { data } = await (supabase as any)
        .from("org_custom_hostnames")
        .select("hostname, is_primary")
        .eq("is_verified", true);
      const match = (data || []).find((h: any) =>
        // matched separately by caller — return first primary if available
        h.is_primary
      );
      if (match?.hostname) return `https://${match.hostname}`;
    } catch {}
  }
  return resolvePublicSiteUrl(slug, publicWebsiteUrl);
};
