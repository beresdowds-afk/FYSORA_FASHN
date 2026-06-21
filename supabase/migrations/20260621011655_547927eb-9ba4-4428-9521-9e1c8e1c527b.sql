
ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS featured_showcase_item_limit INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS featured_showcase_pause_on_hover BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured_showcase_mobile_speed TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS featured_showcase_respect_reduced_motion BOOLEAN NOT NULL DEFAULT true;

DROP VIEW IF EXISTS public.org_websites_public;
CREATE VIEW public.org_websites_public
WITH (security_invoker = true)
AS
SELECT
  id, org_id, is_enabled, mode, theme,
  brand_color, accent_color, color_palette,
  font_heading, font_body,
  tagline, hero_description, hero_image_url, favicon_url,
  mission_statement, vision_statement,
  instagram_url, facebook_url, twitter_url, linkedin_url,
  tiktok_url, youtube_url, whatsapp_number,
  featured_showcase_enabled, featured_showcase_variant, featured_showcase_speed,
  featured_showcase_item_limit, featured_showcase_pause_on_hover,
  featured_showcase_mobile_speed, featured_showcase_respect_reduced_motion,
  created_at, updated_at
FROM public.org_websites;
GRANT SELECT ON public.org_websites_public TO anon, authenticated;
