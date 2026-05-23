# Pending Verifications Approval Panel

A new Super Admin panel that surfaces every designer and organization whose business-registration / access status is still `pending`, so the team can approve or reject them in one place. Approving immediately removes the `AccessGate` block and lets the user into their dashboard.

## What you'll see

A new sidebar item **"Pending Verifications"** in the **Account & Onboarding** group of the Super Admin Dashboard (next to Users / Accounts). The panel has:

- Header strip with live counts: *Orgs pending*, *Designers pending*, *Approved today*, *Rejected today*.
- Tabs: **Organizations** | **Designers** | **Recently reviewed**.
- For each pending row:
  - Name, owner email, country, submitted date, business reg type & number (orgs), or display name & role (designers).
  - "View documents" link (opens any uploaded business-registration file from storage in a new tab) when available.
  - **Approve**, **Reject**, **Request more info** buttons.
  - Inline notes field (saved to `verification_notes`).
- Filters: search by name/email, country, submitted date range.
- Refresh button + 30 s auto-refresh.
- "Recently reviewed" tab shows the last 50 approvals/rejections with reviewer, decision, timestamp, and notes — read-only.

## Approval flow

- **Approve org** → `organizations.business_reg_verification_status = 'approved'`, `business_reg_verified = true`, `business_reg_verified_at = now()`, `verification_reviewed_by = auth.uid()`, persist notes. AccessGate stops blocking immediately (it already releases when status ≠ `pending`).
- **Approve designer** → `profiles.access_status = 'approved'`, store reviewer + timestamp + notes.
- **Reject** → status set to `rejected`, notes required. AccessGate copy will read "Verification rejected" with the notes shown (small AccessGate copy tweak — the only frontend gate change).
- **Request more info** → status set to `info_requested`, notes required, AccessGate keeps blocking but shows the message.
- Every decision triggers an in-app + email notification to the org admin / designer through the existing `send-email` edge function (subject + templated body), and writes an `audit_logs` entry.

## Technical details

### Database (one migration)

- Add columns (idempotent `ADD COLUMN IF NOT EXISTS`):
  - `organizations.verification_reviewed_by uuid`, `verification_reviewed_at timestamptz`
  - `profiles.access_status` already exists; add `access_status_reviewed_by uuid`, `access_status_reviewed_at timestamptz`, `access_status_notes text` if missing.
- Add `'info_requested'` to the allowed status values (CHECK relaxation or text-only — keep as free text since current column is `text`).
- New SECURITY DEFINER RPC `admin_set_verification_status(_target_type text, _target_id uuid, _decision text, _notes text)`:
  - Auth: `has_role(auth.uid(), 'super_admin')` OR `has_role(auth.uid(), 'super_assistant')`; reject otherwise.
  - `_target_type` ∈ {`organization`, `designer`}; `_decision` ∈ {`approved`, `rejected`, `info_requested`, `pending`}.
  - Atomically updates the right table, records reviewer + timestamp + notes, inserts an `audit_logs` row, and enqueues a notification row consumed by the existing email/in-app pipeline.
  - `REVOKE EXECUTE … FROM PUBLIC, anon;` `GRANT EXECUTE … TO authenticated;` (internal role check enforces super-admin-only).
- New read-only view `admin_pending_verifications_v` joining orgs + profiles + auth.users email, filtered to `status = 'pending'` or recent reviews, scoped via RLS helper to super_admin/assistant only.

### Frontend

- `src/components/super-admin/PendingVerificationsPanel.tsx` — new file. Uses `supabase.from('admin_pending_verifications_v').select()` for listing and `supabase.rpc('admin_set_verification_status', …)` for decisions. Implements tabs, filters, notes editor, optimistic UI updates, toast feedback.
- `src/pages/SuperAdminDashboard.tsx` — register tab `pending_verifications` in the **Account & Onboarding** group; mount `<PendingVerificationsPanel />` in the render switch. Tab visible to both super_admin and super_assistant (not added to `restrictedTabs`).
- `src/components/shared/AccessGate.tsx` — minor copy tweak: render distinct messages for `rejected` / `info_requested` in addition to the current `pending` state, and surface `verification_notes`. Continue letting `approved` users through.

### Notifications

- Reuse `supabase.functions.invoke('send-email', …)` with two new template bodies (approve / reject) generated inline; no new edge function needed.
- Write an `in_app_messages` (or existing equivalent) row addressed to the org admin / designer so they see a banner on next sign-in.

## Out of scope

- No changes to the customer or tailor flows (they aren't gated).
- No new identity-provider integration (Smile ID / YouVerify panels already exist separately).
- No bulk approval — single-row decisions only in this iteration.
