
-- 1) insurance_config / insurance_feature_flags: restrict anonymous read access
DROP POLICY IF EXISTS "iconf_read_all" ON public.insurance_config;
CREATE POLICY "iconf_read_authenticated"
  ON public.insurance_config
  FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.insurance_config FROM anon;

DROP POLICY IF EXISTS "iff_read_all" ON public.insurance_feature_flags;
CREATE POLICY "iff_read_authenticated"
  ON public.insurance_feature_flags
  FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.insurance_feature_flags FROM anon;

-- 2) org-assets storage bucket: drop overly broad policies; keep path-scoped variants
DROP POLICY IF EXISTS "Org members can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete assets" ON storage.objects;

-- 3) profiles: re-revoke identity PII columns from co-member SELECT exposure
REVOKE SELECT (identity_number, identity_type, identity_verification_status)
  ON public.profiles FROM anon, authenticated;
