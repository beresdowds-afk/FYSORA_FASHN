
-- Enums
DO $$ BEGIN
  CREATE TYPE public.rest_integration_scope AS ENUM ('external_service','internal_website','internal_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rest_integration_auth_type AS ENUM ('none','api_key_header','bearer_token','basic_auth','hmac_signed','oauth2_client_credentials');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rest_integration_environment AS ENUM ('live','test','staging');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rest_integration_health AS ENUM ('unknown','healthy','degraded','down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rest_endpoint_method AS ENUM ('GET','POST','PUT','PATCH','DELETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Parent table
CREATE TABLE IF NOT EXISTS public.rest_api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  scope public.rest_integration_scope NOT NULL,
  target_label text NOT NULL,
  base_url text NOT NULL,
  auth_type public.rest_integration_auth_type NOT NULL DEFAULT 'none',
  auth_header_name text,
  linked_platform_api_key_id uuid REFERENCES public.platform_api_keys(id) ON DELETE SET NULL,
  linked_external_integration_id uuid REFERENCES public.external_integrations(id) ON DELETE SET NULL,
  default_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_query_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeout_ms integer NOT NULL DEFAULT 15000 CHECK (timeout_ms BETWEEN 1000 AND 120000),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count BETWEEN 0 AND 5),
  rate_limit_per_minute integer NOT NULL DEFAULT 60 CHECK (rate_limit_per_minute BETWEEN 1 AND 6000),
  health_check_path text,
  health_status public.rest_integration_health NOT NULL DEFAULT 'unknown',
  last_health_check_at timestamptz,
  last_health_response_ms integer,
  environment public.rest_integration_environment NOT NULL DEFAULT 'live',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rest_api_integrations_base_url_https CHECK (base_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS rest_api_integrations_slug_idx ON public.rest_api_integrations(slug);
CREATE INDEX IF NOT EXISTS rest_api_integrations_scope_idx ON public.rest_api_integrations(scope);
CREATE INDEX IF NOT EXISTS rest_api_integrations_env_idx ON public.rest_api_integrations(environment);
CREATE INDEX IF NOT EXISTS rest_api_integrations_active_idx ON public.rest_api_integrations(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rest_api_integrations TO authenticated;
GRANT ALL ON public.rest_api_integrations TO service_role;

ALTER TABLE public.rest_api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage rest integrations"
ON public.rest_api_integrations FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'super_assistant'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'super_assistant'));

-- Child endpoints table
CREATE TABLE IF NOT EXISTS public.rest_api_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.rest_api_integrations(id) ON DELETE CASCADE,
  name text NOT NULL,
  method public.rest_endpoint_method NOT NULL DEFAULT 'GET',
  path text NOT NULL,
  description text,
  request_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_auth boolean NOT NULL DEFAULT true,
  is_public_facing boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, name)
);

CREATE INDEX IF NOT EXISTS rest_api_endpoints_integration_idx ON public.rest_api_endpoints(integration_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rest_api_endpoints TO authenticated;
GRANT ALL ON public.rest_api_endpoints TO service_role;

ALTER TABLE public.rest_api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage rest endpoints"
ON public.rest_api_endpoints FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'super_assistant'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'super_assistant'));

-- updated_at triggers
CREATE TRIGGER rest_api_integrations_updated
BEFORE UPDATE ON public.rest_api_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER rest_api_endpoints_updated
BEFORE UPDATE ON public.rest_api_endpoints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-slug trigger
CREATE OR REPLACE FUNCTION public.rest_api_integrations_autoslug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _base text; _candidate text; _i int := 0;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    _base := regexp_replace(lower(coalesce(NEW.name,'integration')), '[^a-z0-9]+', '-', 'g');
    _base := trim(both '-' from _base);
    IF _base = '' THEN _base := 'integration'; END IF;
    _candidate := _base;
    WHILE EXISTS (SELECT 1 FROM public.rest_api_integrations WHERE slug = _candidate AND id <> COALESCE(NEW.id, gen_random_uuid())) LOOP
      _i := _i + 1;
      _candidate := _base || '-' || _i::text;
    END LOOP;
    NEW.slug := _candidate;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER rest_api_integrations_autoslug_trg
BEFORE INSERT ON public.rest_api_integrations
FOR EACH ROW EXECUTE FUNCTION public.rest_api_integrations_autoslug();
