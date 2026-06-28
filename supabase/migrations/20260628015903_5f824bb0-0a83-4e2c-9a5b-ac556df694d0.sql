-- ============================================================
-- 1) org-assets storage: drop the 3 overly-broad member policies
--    so only the path-scoped admin policies remain.
-- ============================================================
DROP POLICY IF EXISTS "Org members can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload assets" ON storage.objects;

-- ============================================================
-- 2) org_websites: split api_key/api_secret into an
--    admin-only sibling table. webhook_url stays (it is a public
--    redirect URL rendered on the anonymous-visitor site).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_website_secrets (
  org_id       UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key      TEXT,
  api_secret   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_website_secrets TO authenticated;
GRANT ALL ON public.org_website_secrets TO service_role;

ALTER TABLE public.org_website_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict org admins manage website secrets"
  ON public.org_website_secrets FOR ALL TO authenticated
  USING (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_org_website_secrets_updated_at
  BEFORE UPDATE ON public.org_website_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from org_websites
INSERT INTO public.org_website_secrets (org_id, api_key, api_secret)
SELECT org_id, api_key, api_secret
  FROM public.org_websites
 WHERE api_key IS NOT NULL OR api_secret IS NOT NULL
ON CONFLICT (org_id) DO NOTHING;

-- Drop the now-relocated sensitive columns
ALTER TABLE public.org_websites DROP COLUMN IF EXISTS api_key;
ALTER TABLE public.org_websites DROP COLUMN IF EXISTS api_secret;
