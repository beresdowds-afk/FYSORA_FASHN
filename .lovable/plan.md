## Goal
Polish the Platform Catalogue (now the home page) along four axes: SEO, mobile CTA layout, guest conversion analytics, and signed-in redirect.

## 1. SEO metadata for the home page
- Install `react-helmet-async` and wrap the app in `<HelmetProvider>` once in `src/main.tsx` (outside `BrowserRouter`).
- Update `index.html`: keep brand title/description as sitewide fallback (for non-JS social crawlers) but remove `<link rel="canonical">` so per-route Helmet owns it.
- Add a `<Helmet>` block at the top of `PlatformCataloguePage.tsx` rendered for both guest and authed states, with:
  - `<title>` — "Shop African Fashion — Platform Catalogue | FYSORA FASHN" (<60 chars)
  - `<meta name="description">` — curated marketplace pitch (<160 chars)
  - `<link rel="canonical" href="https://fs-africa.org.ng/">`
  - OpenGraph: `og:title`, `og:description`, `og:url`, `og:type=website`, `og:image` (reuse the existing R2 preview image already in `index.html`)
  - Twitter card equivalents
  - JSON-LD `WebSite` + `ItemList` (top 10 catalogue items) so search engines index the marketplace
- Add a single `<h1>` ("Platform Catalogue") inside the guest header for semantic structure (currently only a `<span>`).

## 2. Responsive floating CTA
Current container `fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40` overlaps bottom nav and chat widgets on small screens.
- Use `env(safe-area-inset-bottom)` padding so the pill clears iOS home indicator.
- Bump bottom offset on mobile to clear potential bottom-nav (`bottom-20 sm:bottom-6`) and reduce z-index to `z-30` so chat widgets layered higher remain reachable; verify against other fixed UI (`TourCtaBubble`, `CookieConsent`).
- Make the pill collapse to icon-only on `<xs` widths (hide "Guest preview" + "What can I do?" labels, keep `Sign in` button). Add an accessible `aria-label` on the icon-only trigger.
- Constrain `max-w-[calc(100vw-2rem)]` and switch to `flex-wrap` so it never overflows on 320 px screens.
- Add `pb-32 sm:pb-28` to the catalogue content container so the last row of products is never hidden beneath the CTA.

## 3. Analytics events
- Add a tiny helper `src/lib/analytics.ts` exporting `track(event, props?)` that:
  - Dispatches a `CustomEvent('fsa:analytics', { detail })` on `window` (any future provider can listen).
  - Pushes to `window.dataLayer` if present (GTM-ready).
  - No-ops silently if neither is wired.
- Fire events from `PlatformCataloguePage.tsx`:
  - `guest_cta_view` — once on mount when `!user`.
  - `guest_cta_signin_click` — pill "Sign in" button.
  - `guest_cta_dialog_open` — Dialog `onOpenChange(true)`.
  - `guest_cta_dialog_signin_click` — footer "Continue to Sign In".
  - `guest_product_card_click` — inside `promptAuth()` (already the conversion intent).
  - `guest_signin_required_alert_cta` — Alert's "Sign in / Sign up".
- Each event includes `{ path: '/', items_count, category: selectedCategory }` for context.

## 4. Hide CTA + auto-route when signed in
- The guest CTA already lives inside the `if (!user) { return ... }` branch, so it is naturally hidden once signed in. Verify and document.
- Add a new `useEffect` near the top: when `!authLoading && user && !roleLoading && userRole`, if the resolved role is anything other than `customer` (or super_admin / super_assistant who legitimately browse), call `resolveHomeRoute(user.id)` from `src/lib/roleHome.ts` and `navigate(home, { replace: true })`. Customers stay on the catalogue (it's their home).
- Keep the existing prefetch path; no behavior change for customers.

## Files touched
- `index.html` — remove canonical, keep sitewide fallbacks.
- `src/main.tsx` — wrap with `HelmetProvider`.
- `src/pages/PlatformCataloguePage.tsx` — Helmet, responsive CTA, analytics calls, signed-in redirect, `<h1>`.
- `src/lib/analytics.ts` — new helper.
- `package.json` — add `react-helmet-async`.

## Out of scope
- No backend / RLS / migration changes.
- No new analytics provider (GA/Posthog) — only the event surface; user can wire a provider later.
- Security scan findings in the side panel are not addressed here (separate task).
