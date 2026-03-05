

## Plan: Organization Branding, Company Details & Officers

### Overview
Add comprehensive branding controls (logo upload, color palette, font choices) and company officer profiles for organizations' natively generated websites.

### 1. Database Migration

**New table: `org_company_officers`**
- `id`, `org_id`, `full_name`, `title` (e.g. CEO, Creative Director), `email`, `phone`, `bio`, `photo_url`, `display_order`, `is_public` (show on website), `created_at`, `updated_at`
- RLS: org admins can CRUD, public can SELECT where `is_public = true`

**Alter `org_websites` table** -- add columns for extended branding:
- `font_heading` (text, default 'Inter')
- `font_body` (text, default 'Inter')  
- `color_palette` (jsonb, default `{}` -- stores tertiary/background/text colors)
- `favicon_url` (text, nullable)

**Storage bucket: `org-assets`** (already exists based on architecture memory -- will verify and use it for logo + officer photo uploads)

### 2. New UI Component: `OrgBrandingPanel.tsx`

A new section in the Website Builder's "General" tab (or a new "Branding" tab) with:

- **Logo Upload**: Drag-and-drop or click-to-upload using the `org-assets` storage bucket. Preview current logo. Updates `organizations.logo_url`.
- **Favicon Upload**: Same pattern, stores in `org_websites.favicon_url`.
- **Color Palette Builder**: Brand color, accent color (existing), plus new tertiary color, background override, and text color. Live preview swatches.
- **Font Selection**: Dropdown for heading and body fonts from a curated list (Inter, Playfair Display, Poppins, Lora, Montserrat, etc.).
- **Company Details Section**: Edit `organizations.description`, `email`, `phone`, `address` fields directly.

### 3. New UI Component: `CompanyOfficersPanel.tsx`

- List of officers with add/edit/delete
- Each officer: name, title/role, email (optional), phone (optional), bio (optional), photo upload, visibility toggle
- Drag to reorder (display_order)
- Photo uploads go to `org-assets` bucket

### 4. Integration

- Add a new "Branding" sub-tab in the Website Builder section tabs (alongside Plans, General, Catalogue, Integration)
- Move color/theme settings from "General" into "Branding" to consolidate
- Add "Company Info" sub-tab for details + officers
- Update `OrgWebsite.tsx` to render officer section and use extended palette/fonts

### 5. Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/components/website-builder/OrgBrandingPanel.tsx` |
| Create | `src/components/website-builder/CompanyOfficersPanel.tsx` |
| Modify | `src/components/website-builder/WebsiteBuilderTab.tsx` (add tabs, integrate panels) |
| Modify | `src/pages/OrgWebsite.tsx` (render officers, use fonts/palette) |
| Create | DB migration (new table + alter org_websites + storage bucket if needed) |

### Technical Notes
- Logo/photo uploads use the existing `org-assets` storage bucket with path pattern `{org_id}/logo.png`, `{org_id}/officers/{officer_id}.jpg`
- All officer fields except `full_name` and `title` are optional to respect user privacy
- Color palette stored as JSONB for flexibility without schema changes per color addition

