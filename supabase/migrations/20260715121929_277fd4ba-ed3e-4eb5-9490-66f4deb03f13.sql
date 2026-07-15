-- 1) Remove direct anon SELECT on org_websites; anon uses the org_websites_public view instead
ALTER VIEW public.org_websites_public SET (security_invoker = off);
GRANT SELECT ON public.org_websites_public TO anon, authenticated;
DROP POLICY IF EXISTS "Anon can read enabled org websites" ON public.org_websites;

-- 2) Safe SECURITY DEFINER RPC to expose only the public redirect URL when applicable
CREATE OR REPLACE FUNCTION public.get_org_website_redirect(_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT webhook_url
    FROM public.org_websites
   WHERE org_id = _org_id
     AND is_enabled = true
     AND mode = 'custom_integration'
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_org_website_redirect(uuid) TO anon, authenticated;

-- 3) media_groups: split the ALL policy into intent-aligned SELECT/INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users manage own groups" ON public.media_groups;

CREATE POLICY "media_groups_select"
  ON public.media_groups
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (org_id IS NOT NULL AND public.is_org_member(auth.uid(), org_id))
  );

CREATE POLICY "media_groups_insert"
  ON public.media_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "media_groups_update"
  ON public.media_groups
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "media_groups_delete"
  ON public.media_groups
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));