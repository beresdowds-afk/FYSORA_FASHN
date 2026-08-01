/**
 * Static tenant → org-slug mapping.
 *
 * Used as a synchronous fallback by `useCustomHostname` when the DB resolver
 * is slow, offline, or returns no match — so a freshly-pointed custom domain
 * still lands on the correct org website without a round-trip.
 *
 * Extend this list as new tenants are onboarded with custom domains.
 */
export interface TenantHostname {
  host: string;
  slug: string;
  name: string;
  org_id?: string;
}

export const TENANT_HOSTNAMES: TenantHostname[] = [
  {
    host: "gabulkfashionstudio.org.ng",
    slug: "gabulk-fashion-studio",
    name: "GABULK FASHION STUDIO",
  },
  {
    host: "www.gabulkfashionstudio.org.ng",
    slug: "gabulk-fashion-studio",
    name: "GABULK FASHION STUDIO",
  },
];

export const lookupTenantHost = (host: string): TenantHostname | null =>
  TENANT_HOSTNAMES.find(t => t.host.toLowerCase() === host.toLowerCase()) ?? null;

/**
 * Hostnames that serve the FYSORA FASHN platform itself (as opposed to a
 * tenant's own external website). Kept in one place so the custom-hostname
 * router and the redirect loop guard always agree.
 */
export const isPlatformHostname = (host: string): boolean => {
  const h = (host || "").toLowerCase().replace(/^www\./, "");
  if (!h) return true;
  return (
    h === "localhost" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "fs-africa.org.ng" ||
    h === "fashionstitchesafrica.lovable.app"
  );
};
