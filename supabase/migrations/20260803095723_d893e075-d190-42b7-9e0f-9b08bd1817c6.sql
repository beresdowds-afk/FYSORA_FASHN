CREATE TABLE public.org_website_integration_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.org_integration_api_keys(id) ON DELETE SET NULL,
  key_prefix text NOT NULL,
  environment text NOT NULL DEFAULT 'live',
  target text NOT NULL DEFAULT 'native_website',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'installed',
  error text,
  installed_by uuid,
  installed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_website_integration_installs_env_check CHECK (environment IN ('live','test')),
  CONSTRAINT org_website_integration_installs_status_check CHECK (status IN ('installed','pending','failed','superseded')),
  CONSTRAINT org_website_integration_installs_target_check CHECK (target IN ('native_website','github_pages','external'))
);

CREATE INDEX org_website_integration_installs_org_idx ON public.org_website_integration_installs(org_id, installed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_website_integration_installs TO authenticated;
GRANT ALL ON public.org_website_integration_installs TO service_role;

ALTER TABLE public.org_website_integration_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage own integration installs"
ON public.org_website_integration_installs
FOR ALL
TO authenticated
USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_org_website_integration_installs_updated
BEFORE UPDATE ON public.org_website_integration_installs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();