
-- Custom website templates (super admin built)
CREATE TABLE public.custom_website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'minimal' CHECK (category IN ('luxury','minimal','editorial','bold','classic')),
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_website_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_website_templates TO authenticated;
GRANT ALL ON public.custom_website_templates TO service_role;

ALTER TABLE public.custom_website_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active templates"
ON public.custom_website_templates FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

CREATE POLICY "Super admins manage custom templates"
ON public.custom_website_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

CREATE TRIGGER update_custom_website_templates_updated_at
BEFORE UPDATE ON public.custom_website_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Credential events (full audit of generate/rotate/revoke, no plaintext stored)
CREATE TABLE public.integration_credential_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.external_integrations(id) ON DELETE SET NULL,
  integration_name text NOT NULL,
  slug text NOT NULL,
  environment text NOT NULL,
  action text NOT NULL CHECK (action IN ('generated','rotated','revoked')),
  api_key_prefix text,
  hmac_secret_name text,
  webhook_url text,
  superseded_integration_id uuid,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_email text,
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.integration_credential_events TO authenticated;
GRANT ALL ON public.integration_credential_events TO service_role;

ALTER TABLE public.integration_credential_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view credential events"
ON public.integration_credential_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

CREATE POLICY "Super admins insert credential events"
ON public.integration_credential_events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

CREATE INDEX integration_credential_events_name_env_idx
ON public.integration_credential_events (slug, environment, created_at DESC);
