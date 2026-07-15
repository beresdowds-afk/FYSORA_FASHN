
-- profiles column needed by guard trigger
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passkey_second_factor_required boolean NOT NULL DEFAULT false;

-- ============ schema_validation_alerts ============
CREATE TABLE IF NOT EXISTS public.schema_validation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity = ANY (ARRAY['info','warning','critical'])),
  source text NOT NULL CHECK (source = ANY (ARRAY['validator','runtime_error','health_check'])),
  object_type text NOT NULL CHECK (object_type = ANY (ARRAY['table','view','function','grant','rls','endpoint'])),
  object_name text NOT NULL,
  column_name text,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  dashboard_url text,
  fingerprint text NOT NULL UNIQUE,
  occurrence_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schema_validation_alerts_open_idx ON public.schema_validation_alerts (last_seen_at DESC) WHERE resolved_at IS NULL;
GRANT SELECT, UPDATE ON public.schema_validation_alerts TO authenticated;
GRANT ALL ON public.schema_validation_alerts TO service_role;
ALTER TABLE public.schema_validation_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view schema alerts" ON public.schema_validation_alerts FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'super_assistant'::app_role));
CREATE POLICY "Super admins can resolve schema alerts" ON public.schema_validation_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'super_assistant'::app_role))
  WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'super_assistant'::app_role));
CREATE TRIGGER schema_validation_alerts_updated_at BEFORE UPDATE ON public.schema_validation_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ webauthn_credentials ============
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}'::text[],
  device_type text,
  backed_up boolean NOT NULL DEFAULT false,
  nickname text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own passkeys" ON public.webauthn_credentials FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins can audit passkeys" ON public.webauthn_credentials FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER trg_webauthn_credentials_updated_at BEFORE UPDATE ON public.webauthn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ webauthn_backup_codes ============
CREATE TABLE IF NOT EXISTS public.webauthn_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);
CREATE INDEX IF NOT EXISTS idx_webauthn_backup_codes_user ON public.webauthn_backup_codes (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_backup_codes TO authenticated;
GRANT ALL ON public.webauthn_backup_codes TO service_role;
ALTER TABLE public.webauthn_backup_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own backup codes" ON public.webauthn_backup_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own backup codes" ON public.webauthn_backup_codes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ webauthn_challenges ============
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  purpose text NOT NULL CHECK (purpose = ANY (ARRAY['registration','authentication'])),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_idx ON public.webauthn_challenges (expires_at);
GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- no user-facing policies: only service role manages challenges

-- ============ helper functions ============
CREATE OR REPLACE FUNCTION public.record_schema_alert(
  _severity text, _source text, _object_type text, _object_name text,
  _column_name text, _message text, _details jsonb DEFAULT '{}'::jsonb, _dashboard_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _fp text := encode(digest(
    coalesce(_source,'')||'|'||coalesce(_object_type,'')||'|'||
    coalesce(_object_name,'')||'|'||coalesce(_column_name,'')||'|'||coalesce(_message,''), 'sha256'), 'hex');
  _id uuid;
BEGIN
  INSERT INTO public.schema_validation_alerts
    (severity, source, object_type, object_name, column_name, message, details, dashboard_url, fingerprint)
  VALUES (_severity,_source,_object_type,_object_name,_column_name,_message,coalesce(_details,'{}'::jsonb),_dashboard_url,_fp)
  ON CONFLICT (fingerprint) DO UPDATE
    SET occurrence_count = public.schema_validation_alerts.occurrence_count + 1,
        last_seen_at = now(), details = EXCLUDED.details,
        resolved_at = NULL, resolved_by = NULL, severity = EXCLUDED.severity
  RETURNING id INTO _id;
  RETURN _id;
END; $fn$;

CREATE OR REPLACE FUNCTION public.capture_missing_column_error(
  _object_name text, _column_name text, _message text, _route text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  RETURN public.record_schema_alert(
    'critical','runtime_error','table',_object_name,_column_name,_message,
    jsonb_build_object('route',_route,'reporter',auth.uid()), NULL);
END; $fn$;

CREATE OR REPLACE FUNCTION public.guard_webauthn_last_credential()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE requires_2fa boolean; remaining int; unused_codes int;
BEGIN
  SELECT COALESCE(passkey_second_factor_required,false) INTO requires_2fa
    FROM public.profiles WHERE id = OLD.user_id;
  IF NOT COALESCE(requires_2fa,false) THEN RETURN OLD; END IF;
  SELECT count(*) INTO remaining FROM public.webauthn_credentials
    WHERE user_id = OLD.user_id AND id <> OLD.id;
  IF remaining > 0 THEN RETURN OLD; END IF;
  SELECT count(*) INTO unused_codes FROM public.webauthn_backup_codes
    WHERE user_id = OLD.user_id AND used_at IS NULL;
  IF unused_codes > 0 THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Cannot remove the last passkey while passkey second factor is required. Turn off 2FA or generate backup codes first.'
    USING ERRCODE = 'check_violation';
END; $fn$;

CREATE TRIGGER trg_guard_webauthn_last_credential BEFORE DELETE ON public.webauthn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.guard_webauthn_last_credential();
