CREATE OR REPLACE VIEW public.org_websites_public AS
SELECT
  id, org_id, is_enabled, mode, theme, brand_color, accent_color,
  color_palette, font_heading, font_body, tagline, hero_description,
  hero_image_url, favicon_url, mission_statement, vision_statement,
  instagram_url, facebook_url, twitter_url, linkedin_url, tiktok_url,
  youtube_url, whatsapp_number, featured_showcase_enabled,
  featured_showcase_variant, featured_showcase_speed,
  featured_showcase_item_limit, featured_showcase_pause_on_hover,
  featured_showcase_mobile_speed, featured_showcase_respect_reduced_motion,
  created_at, updated_at,
  public_website_url
FROM public.org_websites
WHERE is_enabled = true;

GRANT SELECT ON public.org_websites_public TO anon, authenticated;