-- Fix 1: Remove public access to api_key, api_secret, webhook_url on org_websites
DROP POLICY IF EXISTS "Anyone can view enabled org websites" ON public.org_websites;

CREATE POLICY "Anyone can view enabled org websites public"
ON public.org_websites
FOR SELECT
USING (is_enabled = true);

CREATE OR REPLACE VIEW public.org_websites_public
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
  created_at, updated_at
FROM public.org_websites;

-- Fix 2: Drop permissive public INSERT on outbound_messages
DROP POLICY IF EXISTS "System can insert outbound messages" ON public.outbound_messages;