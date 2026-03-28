
-- 1. Create a public summary view (unauthenticated: name, slug, logo, id only)
CREATE OR REPLACE VIEW public.organizations_summary AS
  SELECT id, name, slug, logo_url, is_active, country, region
  FROM public.organizations
  WHERE is_active = true;

GRANT SELECT ON public.organizations_summary TO anon;
GRANT SELECT ON public.organizations_summary TO authenticated;

-- 2. Create an authenticated public view (non-sensitive fields)
CREATE OR REPLACE VIEW public.organizations_public AS
  SELECT id, name, slug, logo_url, description, country, currency,
         phone, email, physical_address, latitude, longitude, region,
         specialties, is_active, created_at, updated_at
  FROM public.organizations;

GRANT SELECT ON public.organizations_public TO authenticated;

-- 3. Replace the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can lookup org by invite code" ON public.organizations;

-- Org members (any role) can read their own org fully
CREATE POLICY "Org members can read own org"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(auth.uid(), id)
  );

-- Super admins can read all orgs
CREATE POLICY "Super admins can read all orgs"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant')
  );
