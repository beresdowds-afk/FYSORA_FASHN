
DROP VIEW IF EXISTS public.organizations_summary CASCADE;
CREATE VIEW public.organizations_summary
WITH (security_invoker = false)
AS
SELECT id, name, slug, logo_url, is_active, country, region
FROM public.organizations
WHERE is_active = true;
GRANT SELECT ON public.organizations_summary TO anon, authenticated;

DROP VIEW IF EXISTS public.org_websites_public CASCADE;
CREATE VIEW public.org_websites_public
WITH (security_invoker = false)
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
FROM public.org_websites
WHERE is_enabled = true;
GRANT SELECT ON public.org_websites_public TO anon, authenticated;

DROP POLICY IF EXISTS "Org admins can manage catalogue items" ON public.org_catalogue_items;
CREATE POLICY "Org admins can manage catalogue items"
  ON public.org_catalogue_items
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Strict org admins can manage their website" ON public.org_websites;
CREATE POLICY "Strict org admins can manage their website"
  ON public.org_websites
  FOR ALL
  TO authenticated
  USING (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Org members can read their website" ON public.org_websites;
CREATE POLICY "Org members can read their website"
  ON public.org_websites
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));
