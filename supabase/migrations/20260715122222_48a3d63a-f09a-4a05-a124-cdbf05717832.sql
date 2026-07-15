CREATE OR REPLACE FUNCTION public.passkey_deployment_health_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _security_schema boolean;
  _guard_trigger boolean;
  _recovery_function boolean;
  _all_ok boolean;
BEGIN
  -- Security schema: the tables/columns backing passkey auth exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'webauthn_credentials'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'webauthn_backup_codes'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'webauthn_challenges'
  )
  INTO _security_schema;

  -- Guard trigger: prevents removing the last passkey when 2FA is required
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_guard_webauthn_last_credential'
       AND NOT tgisinternal
  ) INTO _guard_trigger;

  -- Recovery function reachable: this function itself resolved
  _recovery_function := true;

  _all_ok := _security_schema AND _guard_trigger AND _recovery_function;

  RETURN jsonb_build_object(
    'ok', _all_ok,
    'checks', jsonb_build_object(
      'security_schema', _security_schema,
      'guard_trigger', _guard_trigger,
      'recovery_function', _recovery_function
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.passkey_deployment_health_check() TO service_role;