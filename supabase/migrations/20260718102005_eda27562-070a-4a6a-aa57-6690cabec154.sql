
-- Fix Website Builder saves failing for all orgs
-- 1) Add missing hero_poster_url column referenced by the client save payload
ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS hero_poster_url text;

-- 2) Create org_website_secrets table (referenced by client, was never created)
CREATE TABLE IF NOT EXISTS public.org_website_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key text,
  api_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_website_secrets TO authenticated;
GRANT ALL ON public.org_website_secrets TO service_role;

ALTER TABLE public.org_website_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins read secrets" ON public.org_website_secrets;
CREATE POLICY "Org admins read secrets" ON public.org_website_secrets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_website_secrets.org_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('org_admin','super_admin')
    )
  );

DROP POLICY IF EXISTS "Org admins write secrets" ON public.org_website_secrets;
CREATE POLICY "Org admins write secrets" ON public.org_website_secrets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_website_secrets.org_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('org_admin','super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_website_secrets.org_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('org_admin','super_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.tg_org_website_secrets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_org_website_secrets_updated_at ON public.org_website_secrets;
CREATE TRIGGER trg_org_website_secrets_updated_at
  BEFORE UPDATE ON public.org_website_secrets
  FOR EACH ROW EXECUTE FUNCTION public.tg_org_website_secrets_updated_at();

-- 3) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
