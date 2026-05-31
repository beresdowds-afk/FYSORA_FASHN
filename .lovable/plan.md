# Catalogue Review + Admin Portals & Workers

This is a large scope. I'll break it into 6 deliverables and ship them in order. Each item is independently verifiable.

## 1. Catalogue & Cart Audit — Organizations (native + external sites)

**Goal:** Verify the flow matches the users-guide contract: Dashboard = full CRUD; Mobile App = quick edits; cart submissions land in Orders tab + multi-channel notifications.

**Files to review (read-only audit, then patch gaps):**
- `src/components/catalogue/TailorCatalogueManager.tsx` (also used by orgs)
- `src/pages/CataloguePage.tsx`, `OrgWebsite.tsx`, `DemoOrgWebsite.tsx`
- `src/components/orders/CreateOrderDialog.tsx`, `OrdersTab.tsx`
- `supabase/functions/embed-widget/index.ts` (non-native sites)
- Notification dispatch on new order (email/SMS/WhatsApp)

**Output:** A short audit report + targeted patches for any missing pieces (e.g. mobile-app quick-edit guard, embed widget cart → order pipe, notification fan-out on cart submission).

## 2. Catalogue & Cart Audit — Tailors & Designers

Same pattern, scoped to:
- Tailor: `TailorCataloguePage.tsx`, `OrgTailorPage.tsx`
- Designer: `DesignerPortal.tsx` catalogue tab
- Confirm contract-bound tailors only sell through their org (per role-constraints memory)

## 3. Accounts Health Monitor Worker

New edge function `supabase/functions/accounts-health-monitor/index.ts`:
- Iterate verified+activated tailors, designers, organizations
- Probe: profile row exists, role row exists, org membership active, dashboard route resolves, at least one nav module enabled
- Write findings to a new `account_health_reports` table
- Schedule daily via pg_cron

Surfaced in Super Admin as a new "Accounts Health" panel.

## 4. Monetization Master Switches — finish + enforcement worker

- Frontend panel `MonetizationSwitchesPanel.tsx` already exists. Add: audit log on toggle, master-off banner across billing surfaces (`useMonetizationGate` hook), seed missing default switches.
- Worker `supabase/functions/monetization-enforcement/index.ts`: sweeps pending fee ledger entries, voids charges where `is_monetization_enabled(...)` is false at charge time; logs to `audit_logs`.
- Hook `useMonetizationGate(scope)` consumed by Pricing CTAs, billing panels, fee triggers.

## 5. Website Builder Fee Exemptions Portal

New super-admin page `src/pages/admin/FeeExemptionsPortal.tsx`:
- Live list (realtime) of verified organizations + designers + registered tailors + customers
- Per-row switch → toggles `org_fee_exemptions` / new `user_fee_exemptions` row for `website_builder`, `website_builder_pro`, `registration`, `mobile_app`, `custom_domain_external`
- Search, filter by role, badge for GABULK FASHION STUDIO (locked exemptions)
- Worker `supabase/functions/fee-exemption-enforcer/index.ts`: nightly sweep — for every active exemption, ensures matching `org_fee_exemptions` rows exist, voids any fee_ledger entries charged in error, re-applies the GABULK auto-grant if missing.

## 6. Zero-Value Invoice Worker for Exemptions

New edge function `supabase/functions/exemption-invoice-generator/index.ts`:
- Triggered when an exemption is granted (DB trigger → pg_net call) and nightly fallback
- Creates a `subscription_invoices` row: amount=0, currency=org currency (NGN/USD), status=`paid`, payment_method=`exemption_grant`, description=`Complimentary <exemption_type>`
- Inserts a `platform_fee_ledger` entry with status=`waived` so revenue analytics shows the foregone amount
- Updates `payments`/`revenue` dashboards (they already read from these tables — no schema changes needed)

## Technical notes

- New tables: `account_health_reports`, `user_fee_exemptions` — both with GRANT + RLS (super_admin only).
- New edge functions deploy automatically; cron via `supabase--insert` after deploy.
- Workers use service role and respect `is_monetization_enabled()`.
- Reuses `runPostVerificationFlow` patterns from `_shared/post-verification-flow.ts` where relevant.

## Order of execution

1. Audit (1+2) → small patches only where gaps exist
2. New tables migration (health reports + user exemptions)
3. Fee Exemptions Portal UI + worker
4. Zero-value invoice worker + DB trigger
5. Monetization enforcement worker + gate hook
6. Accounts Health worker + super-admin panel
7. Cron schedules + smoke test edge function curls

Estimated: large change set (~15-20 new/edited files). I'll proceed straight through once approved.
