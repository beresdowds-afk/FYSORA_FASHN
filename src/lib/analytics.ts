/**
 * Lightweight analytics surface.
 *
 * - Dispatches a `fsa:analytics` CustomEvent on `window` for any listener.
 * - Pushes to `window.dataLayer` if present (GTM-ready).
 * - No-ops silently if neither is wired and in non-browser environments.
 */
export type AnalyticsProps = Record<string, unknown>;

export const track = (event: string, props: AnalyticsProps = {}) => {
  if (typeof window === "undefined") return;
  const detail = { event, ...props, ts: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent("fsa:analytics", { detail }));
    const dl = (window as any).dataLayer;
    if (Array.isArray(dl)) dl.push(detail);
  } catch {
    // swallow — analytics must never break UX
  }
};