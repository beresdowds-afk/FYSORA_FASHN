# Plan

Five related changes across registration gating, KYC provider config, deployment resilience, and DNS automation.

## 1. Business Registration → "Required" with pending-account gating

Goal: Don't block signup, but freeze access until BizReg verification completes.

- `src/pages/CreateOrganization.tsx`: re-label the BizReg field "Required", keep submit enabled even when verification is pending; on submit, create the auth user + organization row but mark them pending.
- New columns on `organizations`: `verification_status` (`pending` | `verified` | `rejected`, default `pending`), `verification_submitted_at`, `verification_notes`. Migration adds these.
- New column on `profiles`: `access_status` (`pending` | `active` | `suspended`, default `active`) — only set to `pending` for designers/org-admins whose org is unverified.
- New `AccessGate` wrapper in `src/components/shared/AccessGate.tsx` rendered inside `Dashboard.tsx` and `DesignerPortal.tsx`. If `access_status='pending'` or org `verification_status='pending'`, render a "Verification pending" screen with status, submitted documents, and a "Re-run verification" button. Customers and tailors are unaffected.
- Super admin gets a new "Pending Verifications" panel in `SuperAdminDashboard` to approve/reject (sets `verification_status` + cascades `access_status='active'`).
- Email notification on submit + on approval, via existing `send-email` function.

## 2. KYC Provider activation UI + "Run identity test"

- Extend `KeysSecretsPanel.tsx` with a new `IdentityProvidersPanel` (or extend existing `VerificationProvidersPanel` if present). For each of `smile_id`, `youverify`, `identitypass`:
  - Inputs for `api_key`, `api_secret`/`partner_id` (provider-specific), `environment` (sandbox/live).
  - Toggle `is_active`.
  - "Run identity test" button → calls a new edge function `test-identity-provider` which performs a low-cost ping (Smile ID: `/v1/products`; YouVerify: GET `/v2/api/identity/health`; IdentityPass: `/api/v2/biometrics/merchant/data/verification/passport`-style ping with sandbox data). Returns latency, HTTP status, and pass/fail. Logs to a new `verification_provider_test_log` table.
  - On successful test, allow flipping `is_active=true`.
- Secrets stored via `org_api_keys` (platform-level: `org_id IS NULL`) with provider names. No raw keys in client code.

## 3. Retry-with-backoff for GitHub pushes & site/PWA sync

- New table `deployment_jobs`: `id`, `org_id`, `kind` (`github_push` | `pwa_sync` | `site_publish`), `payload jsonb`, `status` (`queued|running|succeeded|failed|dead`), `attempt`, `max_attempts` (default 6), `next_attempt_at`, `last_error`, `created_at`, `updated_at`.
- New edge function `deployment-worker`: pulls due jobs, executes (invokes `github-repo-push` / publish flow), on failure schedules retry with exponential backoff (`30s × 2^attempt`, capped at 1h), marks `dead` after `max_attempts`.
- pg_cron job invokes worker every minute (`supabase--insert` for cron schedule).
- Refactor `PublishWebsiteButton.tsx` and `useOrgSync.ts` to enqueue into `deployment_jobs` instead of calling the function inline.
- New `DeploymentJobsPanel.tsx` rendered in `TenantSitesPanel` (super admin) and in `WebsiteBuilderTab` (tenant) showing per-job status, attempt count, next retry, last error, with "Retry now" and "Cancel" buttons. Realtime via `postgres_changes`.
- Toast + in-app notification when a job moves to `failed` after final attempt.

## 4. Resend DKIM auto-sync

- New edge function `resend-dkim-sync`: calls Resend API `GET /domains/{id}` for each domain registered in `platform_dns_records` (or a new `email_domains_managed` table), reads DKIM record values, compares against `platform_dns_records` rows with `purpose='dkim'`, updates the `value` column when changed, stamps `last_synced_at`, and marks `verified_at=null` to force re-verification.
- Schedule via pg_cron every 6 hours; also expose a "Sync from Resend now" button in `PlatformDnsRecordsPanel`.
- Requires `RESEND_API_KEY` (already implied by existing email setup; add via `secrets--add_secret` if missing).
- Audit row inserted into a new `dns_record_audit` table on each change.

## 5. Worldwide DNS propagation checker

- Extend `dns-lookup` edge function to optionally use multiple public resolvers (Google `8.8.8.8`, Cloudflare `1.1.1.1`, Quad9 `9.9.9.9`, OpenDNS `208.67.222.222`) via DoH (`https://dns.google/resolve`, `https://cloudflare-dns.com/dns-query`, etc.) since Deno's `resolveDns` uses only the system resolver.
- New table `dns_propagation_checks`: `record_id`, `resolver`, `checked_at`, `found_values jsonb`, `matched bool`, `latency_ms`.
- Periodic pg_cron job (every 15 min) calls a new `dns-propagation-sweep` function that iterates all non-archived `platform_dns_records` and runs the multi-resolver check.
- `PlatformDnsRecordsPanel` gets a "Propagation" expandable row per record showing each resolver's last check status with timestamp, latency, and a small world-map dot grid (4 resolvers across regions). "Check now" button triggers an on-demand sweep for the selected record.
- Visual: green check / amber pending / red mismatch per resolver, with the most recent `checked_at` formatted as relative time.

## Technical details

New files:
- `src/components/shared/AccessGate.tsx`
- `src/components/super-admin/PendingVerificationsPanel.tsx`
- `src/components/super-admin/IdentityProvidersPanel.tsx` (or extend existing)
- `src/components/super-admin/DeploymentJobsPanel.tsx`
- `supabase/functions/test-identity-provider/index.ts`
- `supabase/functions/deployment-worker/index.ts`
- `supabase/functions/resend-dkim-sync/index.ts`
- `supabase/functions/dns-propagation-sweep/index.ts`
- Migrations for: `organizations.verification_status`, `profiles.access_status`, `deployment_jobs`, `dns_record_audit`, `dns_propagation_checks`, `verification_provider_test_log`.

Edited files:
- `src/pages/CreateOrganization.tsx`, `src/pages/Dashboard.tsx`, `src/pages/DesignerPortal.tsx`
- `src/components/super-admin/KeysSecretsPanel.tsx`, `src/components/super-admin/PlatformDnsRecordsPanel.tsx`, `src/pages/SuperAdminDashboard.tsx`
- `src/components/website-builder/PublishWebsiteButton.tsx`, `src/components/website-builder/WebsiteBuilderTab.tsx`, `src/hooks/useOrgSync.ts`
- `supabase/functions/dns-lookup/index.ts` (multi-resolver support)

Cron seeds (via insert tool, not migration): `deployment-worker` every 1 min, `resend-dkim-sync` every 6 h, `dns-propagation-sweep` every 15 min.

RLS: all new tables restricted to `super_admin`/`super_assistant` for global views, plus `is_org_admin` for org-scoped reads (`deployment_jobs`).
