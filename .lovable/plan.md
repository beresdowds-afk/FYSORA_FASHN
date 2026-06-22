
# Scope

Six interlocking changes spanning DNS, the public site renderer, the website-builder UX, the branding portal, PWA sync, and the premium/finance pipeline.

---

## 1. Domain routing — gabulkfashionstudio.org.ng + fs-africa.org.ng access

**Diagnosis (to confirm with the user):**
- `https://fs-africa.org.ng` not reachable in external browsers is almost always **publish visibility = private** OR the apex `A` record missing while only `www` resolves. Will check via `publish_settings--get_publish_settings` and DNS lookup (`dig`) before making changes.
- `gabulkfashionstudio.org.ng` cannot point to `fs-africa.org.ng/site/gabulk-fashion-studio` because Lovable hosting cannot rewrite a path from an apex of another zone — it needs either (a) a registrar-side 301 with path, or (b) the domain connected to the project and the app resolving the hostname → org-slug.

**Implementation:**
- Add `gabulkfashionstudio.org.ng` (and `www.`) as a connected custom domain entry — instruct via UI; agent cannot itself add the DNS at the user's registrar but will surface the exact records (A 185.158.133.1 + TXT `_lovable`).
- Add app-level **hostname → org slug** resolver:
  - New table `org_custom_hostnames` (hostname unique, org_id, verified bool, primary bool).
  - Edge function-free: read on first paint via a tiny RPC `resolve_org_by_hostname(host)`.
  - `App.tsx`/`OrgWebsite.tsx`: when `window.location.hostname` matches a row, mount the org site at `/` (and 301 `/site/:slug` → `/` to dedupe).
- `resolvePublicSiteUrl()` updated to prefer the org's verified custom hostname when present, so links across the platform open the branded domain.
- Add a Super Admin "Custom Hostnames" panel under Domains for verification + primary toggle.
- Document the apex-A-record fix for `fs-africa.org.ng` and flip publish visibility to public if needed.

---

## 2. New homepage layout for all native templates

```text
┌────────────────────────────────────────┐
│ Header (sticky)                        │
├────────────────────────────────────────┤
│ ▾ Featured Showcase (collapsible, ¼)   │  ← infinite scroll, dropdown tab
├────────────────────────────────────────┤
│ Org Catalogue iframe  (¾)              │  ← /site/:slug/catalogue
├────────────────────────────────────────┤
│ Hero / Landing  (multimedia bg)        │  ← moved BELOW (toggleable per template)
│ … rest of sections                     │
└────────────────────────────────────────┘
```

- Featured Showcase wrapped in a `<details>`-style collapsible (`HeaderShowcaseDrawer`) with a small "Featured ▾" tab, defaulting open, remembering state in localStorage. Reduced-motion + keyboard rules from the existing showcase carry over.
- `OrgCatalogueIframe` component renders `<iframe src="/site/:slug/catalogue?embed=1" />` at `h-[75vh]`. Catalogue page gets an `?embed=1` mode that hides nav/footer.
- `OrgWebsite.tsx` re-orders sections; new template config flag `hero_position: "below_catalogue" | "above"` (default `below_catalogue`) so designers can flip back. Toggle lives in `WebsiteBuilderTab` → Layout.

---

## 3 + 4. Multimedia hero background editor in Branding portal

- New `OrgHeroBackgroundPanel.tsx` inside `OrgBrandingPanel`:
  - Drag-and-drop zone (images + videos, ≤ 25MB), reuses existing `MediaDropzone`.
  - Stores list in `org_websites.hero_media` JSONB: `[{url, type, poster_url, focal_point, duration_ms}]`.
  - Supports image slideshow, single video, or mixed playlist; controls for autoplay, loop, mute, overlay opacity.
- `Hero` template component reads `hero_media` and renders `<video>` or `<img>` background with the configured overlay. Falls back to existing `hero_image_url`.
- This is exposed in the Website Builder as a feature toggle `hero_media_editor_enabled` so templates can advertise it as a feature.

---

## 5. Cross-PWA catalogue sync worker

- New edge function `sync-platform-catalogue` (cron every 10 min via `pg_cron` + `pg_net`):
  - Pulls newly approved items from `org_catalogue_items`, `tailor_catalogue_items`, designer items.
  - Upserts into a unified `platform_catalogue_feed` materialized table.
- Client-side `usePlatformCatalogueSync` hook: subscribes via `supabase.channel('platform_catalogue_feed')` and posts a `BroadcastChannel('fsa-catalogue')` message so all open PWAs (org + platform) refresh in lockstep.
- Service-worker safe — uses NetworkFirst for the feed endpoint, never cache-first.

---

## 6. Image capacity premium (50-image packs, Super Admin approval, fee-gated)

**Schema:**
- `org_website_image_capacity` (org_id, website_id, base_limit, granted_packs int, image_count int, updated_at).
- `image_capacity_requests` (org_id, website_id, packs_requested, status: pending/approved/awaiting_payment/active/rejected, price_total, currency, approved_by, invoice_id, paid_at).
- Trigger on `org_catalogue_items` insert: blocks when `image_count + new_images > base_limit + granted_packs*50`, raises clear error.

**Workflow:**
1. Org Admin in Catalogue → "Request more capacity (×50)" → row in `image_capacity_requests` (pending).
2. Super Admin Finance → new "Capacity Requests" tab → Approve → generates `custom_invoice` (reuses existing invoicing pipeline) → status `awaiting_payment`.
3. On payment verification webhook (`payments.status='success'` linked to invoice) → trigger flips request to `active` and increments `granted_packs`.
4. Audit log entry at each step.

**Pricing:**
- New row in `platform_settings` / `website_pricing_config`: `image_pack_price_ngn` (default 5000) and `image_pack_price_usd`. Editable from Pricing & Products section of Super Admin.

**UI surfaces:**
- Catalogue uploader shows live `used / limit` meter + "Request more" button.
- Super Admin Finance → "Capacity Requests" list + approve dialog.
- Super Admin Pricing → editable pack price.

---

# Technical Notes

- All new tables follow the GRANT-then-RLS pattern; capacity tables are org-scoped via `has_org_access()`.
- The hero-media JSONB keeps schema flexible; size-limited by storage bucket quota.
- Custom-hostname resolution runs once per page-load and caches in `sessionStorage` for 5 min.
- Catalogue iframe uses `loading="lazy"` and a `postMessage` handshake so the parent can resize it.
- The premium image-capacity trigger is enforced server-side so it cannot be bypassed by the client.

---

# Delivery order

1. Migration: `org_custom_hostnames`, `org_website_image_capacity`, `image_capacity_requests`, hero_media column, hero_position column, image_pack pricing.
2. Backend: RPCs (`resolve_org_by_hostname`, capacity check trigger), payment-verification trigger, cron for catalogue sync, `sync-platform-catalogue` edge function.
3. Frontend: hostname resolver in App shell, new homepage layout + collapsible drawer + iframe, hero-media editor in branding, capacity meter + request flow, Super Admin Finance + Pricing tabs.
4. Verify: DNS instructions surfaced, Playwright pass on homepage layout, capacity trigger blocks overage.

This is a large batch — I'll ship it as one coordinated change but can pause between phases if you want to review each one before continuing.
