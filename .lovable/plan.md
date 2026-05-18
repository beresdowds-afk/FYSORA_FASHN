# Plan

Four related changes to the Super Admin dashboard and registration flows.

## 1. Platform DNS Records Manager (Keys & Secrets page)

Add a new `PlatformDnsRecordsPanel` rendered inside `KeysSecretsPanel.tsx` (Super Admin → Keys & Secrets). It manages DNS records for FYSORA FASHN's own domains (e.g. `fs-africa.org.ng`, `fashionstitchesafrica.lovable.app`), distinct from `DomainManagementPanel` which manages tenant domain purchases.

Features:
- Table grouped by domain showing Type (A/AAAA/CNAME/MX/TXT/SRV/CAA/NS), Name, Value, TTL, Priority, Purpose, Status (verified/pending).
- Add / Edit / Delete record dialogs with type-aware validation.
- "Verify now" button that performs a live DNS lookup via a new edge function `dns-lookup` (using Deno `Deno.resolveDns`) and stamps `verified_at`.
- "Copy as zone file" export.
- Provider hint field (Namecheap / Cloudflare) using existing `NAMECHEAP_API_KEY` for optional auto-sync (read-only first iteration).

New table `platform_dns_records`:
- `domain`, `record_type`, `name`, `value`, `ttl` (default 3600), `priority`, `purpose`, `is_managed`, `verified_at`, `last_checked_at`, `notes`.
- RLS: super_admin / super_assistant full access.

## 2. Configure TXT records for official emails

Seed `platform_dns_records` with the records required so `hello@fs-africa.org.ng` and `fysorafashn@fs-africa.org.ng` deliver and pass authentication:

- **MX** `@ → <mail host>` (placeholder, admin sets host).
- **SPF** TXT `@` → `v=spf1 include:_spf.resend.com include:_spf.google.com ~all` (Resend is already the configured email provider).
- **DKIM** TXT `resend._domainkey` → value pulled from Resend domain settings (admin pastes).
- **DMARC** TXT `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:hello@fs-africa.org.ng; ruf=mailto:fysorafashn@fs-africa.org.ng; fo=1`.
- **Mailbox aliases** documented (TXT `_mailboxes` informational): `hello@`, `fysorafashn@`.

A "Verify mailboxes" action triggers `dns-lookup` for SPF/DKIM/DMARC and flips status to verified.

Update `platform_settings.contact_email` default to `hello@fs-africa.org.ng` and add `secondary_contact_email = fysorafashn@fs-africa.org.ng`.

## 3. Make referral codes optional for all registrations

Touch points:
- `src/pages/Auth.tsx` (customer/tailor/designer signup).
- `src/pages/CreateOrganization.tsx` (organization signup).
- Any registration payment edge functions that currently require `referral_code`.

Changes:
- Field label becomes "Referral code (optional)".
- Remove required validation; allow empty submit.
- If provided, validate against `referral_codes` table; on invalid, show non-blocking warning instead of rejecting.
- Persist `referral_code = null` when blank so reward logic skips silently.
- Backend: in registration/payment functions, treat missing code as a no-op (no reward grant, no error).

No schema change needed (column already nullable); a migration only if a `NOT NULL` exists — verified during implementation.

## 4. Fix NIN / BVN verification failures

Root cause analysis from `supabase/functions/verify-identity/index.ts` and `verification_provider_config`:

- All four providers (`smile_id`, `youverify`, `identitypass`, `persona`) are currently `is_active = false`, so every request falls through to `localValidation`.
- Local validation requires `entity_id` to persist results; UI callers (`Auth.tsx`, `CreateOrganization.tsx`, `IdentityVerificationGate.tsx`) call the function **before** the auth user / org row exists, so even when the pattern matches, the response is `valid: true` but no row is updated → UI treats it as "failed" because the subsequent re-read of `profiles.identity_verified` is still false.
- For `bvn`, the local regex is correct (`^\d{11}$`) but the masking step uppercases the number which is fine; however the function then increments `monthly_used` on a possibly `undefined` field — no impact here but worth noting.

Fixes:
- In `verify-identity`: when no provider is active, still return `valid` based on local pattern AND, when `entity_id` is provided post-signup, persist verification. When `entity_id` is null (pre-signup), return a `pending_persist: true` flag.
- Add a post-signup hook in `Auth.tsx` and `CreateOrganization.tsx` that re-invokes `verify-identity` with the newly-created `entity_id` so the verification row and `identity_verified` flag are written.
- Activate at least one provider by default. Add a "Provider self-test" button in `VerificationProvidersPanel` so the super admin can flip `is_active = true` once API keys are present. Until then, surface a banner explaining local-only mode.
- Improve error messaging: surface the actual `result.message` to the UI instead of a generic "Verification failed".
- Add edge function logging of the chosen branch (provider vs local) for easier future debugging.

## Technical details

New files:
- `src/components/super-admin/PlatformDnsRecordsPanel.tsx`
- `supabase/functions/dns-lookup/index.ts`
- `supabase/migrations/<ts>_platform_dns_records.sql`

Edited files:
- `src/components/super-admin/KeysSecretsPanel.tsx` (mount new panel)
- `src/pages/Auth.tsx`, `src/pages/CreateOrganization.tsx` (referral optional + post-signup verify re-call + better error display)
- `src/components/shared/IdentityVerificationGate.tsx` (error surfacing)
- `supabase/functions/verify-identity/index.ts` (logging, pending_persist flag, safer counters)
- `supabase/functions/initialize-registration-payment/index.ts` (referral optional)
- `src/hooks/usePlatformSettings.ts` (add `secondary_contact_email`)

Data seeds (via insert tool, not migration):
- Initial DNS records for `fs-africa.org.ng` (SPF, DMARC, DKIM placeholder, MX placeholder).
