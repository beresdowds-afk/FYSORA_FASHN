-- 1. website_pricing_config: restrict reads to admins
DROP POLICY IF EXISTS "Org admins can view pricing config" ON public.website_pricing_config;
CREATE POLICY "Admins can view pricing config"
ON public.website_pricing_config
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'super_assistant'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.user_id = auth.uid() AND m.role = 'org_admin'::app_role
  )
);

-- 2. org_app_downloads: constrain anonymous inserts
DROP POLICY IF EXISTS "Anon users can record downloads" ON public.org_app_downloads;
CREATE POLICY "Anon users can record downloads"
ON public.org_app_downloads
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND org_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id)
  AND (platform IS NULL OR platform IN ('ios','android','web','desktop','pwa'))
  AND (user_agent IS NULL OR length(user_agent) <= 512)
);

-- 3. storage org-assets: remove duplicate overlapping policies
DROP POLICY IF EXISTS "Authenticated org members can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view org assets" ON storage.objects;