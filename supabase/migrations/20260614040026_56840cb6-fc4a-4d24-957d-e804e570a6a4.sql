
-- 1. Extend custom_invoices with recipient_user_id + creator_name
ALTER TABLE public.custom_invoices
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid,
  ADD COLUMN IF NOT EXISTS creator_name text;

-- 2. Feature role access matrix
CREATE TABLE IF NOT EXISTS public.feature_role_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  role app_role NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  quota integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, role)
);
GRANT SELECT ON public.feature_role_access TO authenticated;
GRANT ALL ON public.feature_role_access TO service_role;
ALTER TABLE public.feature_role_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone authenticated reads role access"
  ON public.feature_role_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage role access"
  ON public.feature_role_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_feature_role_access_updated
  BEFORE UPDATE ON public.feature_role_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Feature plan access matrix (plan_key is free-form, matches subscription_plans.plan_key)
CREATE TABLE IF NOT EXISTS public.feature_plan_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  plan_key text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  quota integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, plan_key)
);
GRANT SELECT ON public.feature_plan_access TO authenticated;
GRANT ALL ON public.feature_plan_access TO service_role;
ALTER TABLE public.feature_plan_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone authenticated reads plan access"
  ON public.feature_plan_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage plan access"
  ON public.feature_plan_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_feature_plan_access_updated
  BEFORE UPDATE ON public.feature_plan_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed two new feature flags for image quota + library access
INSERT INTO public.platform_feature_flags (feature_key, feature_name, description, category, is_enabled, toggle_mechanism, mvp_default, full_platform_default, metadata)
VALUES
  ('image_upload_quota', 'Image Upload Quota', 'Number of images a user/role/plan may upload to their library.', 'website', true, 'feature_flag', true, true, '{"default_quota":100}'::jsonb),
  ('library_access', 'Media Library Access', 'Access to the org Media Library (Design Sets, Collections, Albums).', 'website', true, 'feature_flag', true, true, '{}'::jsonb)
ON CONFLICT (feature_key) DO NOTHING;
