## Goal

`/create-organization` is currently reached from multiple places that interrupt unrelated flows (customers, designers, tailors, super admins navigating the app). Keep the page reachable through deliberate "register an organization" entry points only, and stop forcing other roles into it.

## Audit of every reference

| # | File | Type | Verdict |
|---|------|------|---------|
| 1 | `src/App.tsx:52` | Route definition | **Keep** — the page must remain reachable. |
| 2 | `src/pages/Auth.tsx:728` | OAuth role picker → after picking "organization" | **Keep** — user explicitly chose to register a fashion house. |
| 3 | `src/config/roleTourTracks.ts:332` | Landing tour CTA "Register Fashion House" | **Change** — landing visitors are unauthenticated; route through auth first to match the other three role CTAs. |
| 4 | `src/pages/SuperAdminDashboard.tsx:624, 633` | "New Organization" buttons inside the Organizations panel (header + empty state) | **Keep** — this is the canonical admin-action entry. |
| 5 | `src/pages/SuperAdminDashboard.tsx:290` | "New Org" link permanently in the super admin header | **Remove** — duplicate of #4, clutters the global header. |
| 6 | `src/pages/Dashboard.tsx:99-107` | Auto-redirect: any signed-in user hitting `/dashboard` without an org gets pushed to `/create-organization` | **Change** — this is the worst interruption. Customers, tailors, designers, etc. who land on `/dashboard` (deep links, stale tabs, OAuth race) are force-routed into org creation. Replace with role-aware routing. |
| 7 | `src/pages/Dashboard.tsx:163` | Super-admin "no org" landing offers "Create Organization" alongside "Go to Admin Panel" | **Keep** — explicit super-admin choice on a dedicated landing card. |

## Changes

### 1. `src/pages/Dashboard.tsx` — fix the forced redirect (lines 99-107)

Replace the "no current org ⇒ /create-organization" jump with role-aware routing that respects where each user actually belongs:

- `tailor` → `/tailor-dashboard` (already partially handled)
- `designer` → `/designer-portal`
- `customer` → `/portal`
- `org_admin` / `manager` without an org → `/create-organization` (this is the one role for which org creation is the correct next step)
- Super admin / super assistant / platform_management without an org → stay on Dashboard (the existing "Welcome, Super Admin" card at line 140 handles this).
- No detectable role yet (race during initial profile load) → stay on Dashboard with the existing spinner instead of redirecting.

Net effect: only users who genuinely need an org to proceed are sent to `/create-organization`. Everyone else continues to their own home.

### 2. `src/pages/SuperAdminDashboard.tsx` — drop the header cross-link (line 290-292)

Remove the always-visible `<Button>… New Org` chip from the super admin top bar. The Organizations panel keeps its own "New Organization" button (#4) so the action is still one click away from the Organizations tab.

### 3. `src/config/roleTourTracks.ts` — route landing CTA through auth (line 332)

Change `ctaPath` for the `organization` track from `"/create-organization"` to `"/auth?role=organization"`, matching the designer/tailor/customer pattern. After sign-in, the OAuth role picker (#2) already forwards to `/create-organization`, so the deliberate flow is preserved without dropping anonymous visitors onto a form that requires auth.

## What stays the same

- Route definition in `App.tsx`.
- OAuth role-picker handoff in `Auth.tsx`.
- Both Organizations-panel buttons in `SuperAdminDashboard.tsx`.
- The super-admin "no org" landing card in `Dashboard.tsx`.
- The page itself (`CreateOrganization.tsx`) — no functional changes.

## Verification

- Sign in as a customer with no org → land on `/portal`, never bounced to `/create-organization`.
- Sign in as a designer with no org → land on `/designer-portal`.
- Sign in as a tailor with no org → land on `/tailor-dashboard`.
- Sign in as a brand-new org admin → reach `/create-organization` (intentional).
- Super admin top bar no longer shows the "New Org" chip; Organizations tab still does.
- Landing page "Register Fashion House" CTA opens `/auth?role=organization`.
