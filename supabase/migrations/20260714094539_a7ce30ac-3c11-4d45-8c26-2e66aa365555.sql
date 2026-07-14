CREATE OR REPLACE FUNCTION public.passkey_deployment_health_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  checks jsonb;
  healthy boolean;
BEGIN
  checks := jsonb_build_object(
    'webauthn_credentials_table', to_regclass('public.webauthn_credentials') IS NOT NULL,
    'webauthn_challenges_table', to_regclass('public.webauthn_challenges') IS NOT NULL,
    'webauthn_backup_codes_table', to_regclass('public.webauthn_backup_codes') IS NOT NULL,
    'profiles_second_factor_column', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
        AND column_name = 'passkey_second_factor_required'
    ),
    'credential_required_columns', (
      SELECT count(*) = 6
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'webauthn_credentials'
        AND column_name IN ('user_id', 'credential_id', 'public_key', 'counter', 'created_at', 'updated_at')
    ),
    'challenge_required_columns', (
      SELECT count(*) = 4
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'webauthn_challenges'
        AND column_name IN ('user_id', 'challenge', 'purpose', 'expires_at')
    ),
    'backup_code_required_columns', (
      SELECT count(*) = 4
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'webauthn_backup_codes'
        AND column_name IN ('user_id', 'code_hash', 'used_at', 'created_at')
    ),
    'last_credential_guard_function', EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'guard_webauthn_last_credential'
        AND p.prorettype = 'trigger'::regtype
    ),
    'last_credential_guard_trigger', EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'webauthn_credentials'
        AND t.tgname = 'trg_guard_webauthn_last_credential'
        AND NOT t.tgisinternal
        AND t.tgenabled <> 'D'
    )
  );

  SELECT bool_and(value::boolean)
    INTO healthy
    FROM jsonb_each(checks);

  RETURN jsonb_build_object(
    'ok', COALESCE(healthy, false),
    'checks', checks
  );
END;
$$;

REVOKE ALL ON FUNCTION public.passkey_deployment_health_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.passkey_deployment_health_check() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.passkey_deployment_health_check() IS
  'Read-only deploy gate for required passkey tables, columns, guard function, and trigger.';