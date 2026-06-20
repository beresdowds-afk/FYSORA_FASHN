## Goal
Extend the website template workflow with segment targeting, an automatic compatibility checker, a time-boxed staging preview, and one-click rollback with audit logging.

## 1. Database (single migration)

New tables (all in `public`, RLS on, GRANTs for `authenticated` + `service_role`, org-scoped policies via `is_org_admin` / `has_role('super_admin')`):

- **`org_template_segment_rules`** — segment-based template targeting
  - `org_id`, `template_key`, `segment_type` (`location` | `category` | `default`),
    `segment_value` (text, e.g. country code, category slug, or `*`), `priority` (int), `is_active` (bool)
  - Unique `(org_id, segment_type, segment_value)` so each segment maps to exactly one template
  - The website renderer resolves the visitor's template by matching segment_type/value in priority order, falling back to `default`

- **`org_template_staging`** — staging/preview drafts
  - `org_id`, `template_key`, `created_by`, `preview_token` (uuid, unique), `expires_at` (default `now() + interval '72 hours'`), `status` (`active` | `expired` | `promoted` | `discarded`), `compatibility_report` jsonb
  - Trigger sets `status='expired'` on read when past `expires_at`
  - Public read by token via SECURITY DEFINER RPC `get_staging_template_by_token(_token uuid)` so unauthenticated preview links work without exposing the table

- **`org_template_publish_history`** — published-version log enabling rollback
  - `org_id`, `template_key`, `published_by`, `published_at`, `snapshot` jsonb (full template config snapshot at publish time), `was_rollback` bool
  - On publish (in `org_websites` update), trigger inserts a new history row

New RPCs (SECURITY DEFINER):
- `promote_staging_template(_staging_id uuid)` — moves staging to live, writes publish history, requires org admin
- `rollback_org_template(_org_id uuid)` — picks the row before the current one in `org_template_publish_history`, applies its `template_key` + `snapshot` to `org_websites`, inserts a new history row with `was_rollback=true`, writes to `audit_logs`

## 2. Compatibility checker (client-side, pure TS)

`src/lib/templateCompatibility.ts`:

```ts
export type CompatIssue = {
  severity: 'breaking' | 'warning' | 'info';
  code: 'missing_asset' | 'unsupported_widget' | 'layout_break' | 'feature_loss';
  message: string;
};
export function checkTemplateCompatibility(
  current: TemplateDef, next: TemplateDef, websiteState: OrgWebsiteState
): { issues: CompatIssue[]; canProceed: boolean }
```

Rules covered:
- **Missing assets**: next template requires hero/logo/gallery slots that aren't populated in `websiteState`
- **Unsupported widgets**: widgets enabled in `org_websites` that the next template doesn't render (e.g., cultural story, featured products, officers)
- **Layout break risks**: aspect-ratio mismatch on existing gallery, hero image orientation, category count exceeded
- Returns aggregated issues; `canProceed=false` only if breaking issues exist and user hasn't acknowledged

## 3. UI changes

- **`OrgTemplatePublishPanel.tsx`**
  - Replace ad-hoc `diffTemplates` with `checkTemplateCompatibility`
  - Consent dialog now shows three sections: Breaking / Warnings / Info, plus a "View compatibility report" expander
  - Consent always required (already true); checkbox label dynamic to severity
  - Add **"Save as preview (72h)"** button that calls the staging RPC and shows a copyable preview URL (`/preview/template/:token`)
  - Add **"Rollback to previous"** button (visible only if `publish_history.count > 1`) with confirm dialog
  - Add **Segment Rules** subsection: list current rules, "Add rule" form (segment type + value + template), delete/toggle

- **New page `src/pages/TemplatePreviewPage.tsx`** at route `/preview/template/:token`
  - Calls `get_staging_template_by_token` RPC
  - Renders the existing `BrandingLivePreview` with the staged template_key
  - Shows banner: "Preview expires in Xh — not visible to customers"

- **`DesignerPortal.tsx`** — already embeds `OrgTemplatePublishPanel`, so new features surface automatically

## 4. Renderer integration

`src/lib/resolveTemplateForVisitor.ts` (used by public website route):
- Loads `org_template_segment_rules` for the org
- Resolves visitor country (existing geo helper) and active category context
- Returns the highest-priority matching rule's `template_key`, falling back to `org_websites.template_key`

## 5. Audit logging

- `rollback_org_template` writes `audit_logs` entry: `action='website_template_rollback'`, `entity_type='org_website'`, with `old_data` (current template) and `new_data` (restored template)
- `promote_staging_template` writes `action='website_template_promoted'`
- Segment rule changes already covered by existing `org_website_template_events` table — extend trigger to log segment rule inserts/updates/deletes

## Files

**New**
- `supabase/migrations/<ts>_template_targeting_staging_rollback.sql`
- `src/lib/templateCompatibility.ts`
- `src/lib/resolveTemplateForVisitor.ts`
- `src/pages/TemplatePreviewPage.tsx`
- `src/components/website-builder/SegmentRulesPanel.tsx`

**Edit**
- `src/components/website-builder/OrgTemplatePublishPanel.tsx`
- `src/App.tsx` (add `/preview/template/:token` route)
- `src/integrations/supabase/types.ts` (regenerated after migration)

## Constraints honored
- Consent dialog still mandatory before every template change (existing behavior preserved)
- No CHECK constraints on time-dependent expiry; staging expiry enforced via trigger + RPC filter
- All new public-schema tables get GRANTs in the same migration
- Roles unchanged; org_admin / manager / designer guarded via existing `is_org_admin` and `has_role` helpers
