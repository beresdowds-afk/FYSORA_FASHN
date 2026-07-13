-- 1) Backup codes table
CREATE TABLE IF NOT EXISTS public.webauthn_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_webauthn_backup_codes_user ON public.webauthn_backup_codes(user_id);

GRANT SELECT, DELETE ON public.webauthn_backup_codes TO authenticated;
GRANT ALL ON public.webauthn_backup_codes TO service_role;

ALTER TABLE public.webauthn_backup_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own backup codes" ON public.webauthn_backup_codes;
CREATE POLICY "Users can view own backup codes"
  ON public.webauthn_backup_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own backup codes" ON public.webauthn_backup_codes;
CREATE POLICY "Users can delete own backup codes"
  ON public.webauthn_backup_codes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) Lockout guard: block deleting the last passkey when 2FA is required and no unused backup codes exist
CREATE OR REPLACE FUNCTION public.guard_webauthn_last_credential()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requires_2fa boolean;
  remaining int;
  unused_codes int;
BEGIN
  SELECT COALESCE(passkey_second_factor_required, false)
    INTO requires_2fa
    FROM public.profiles
   WHERE id = OLD.user_id;

  IF NOT COALESCE(requires_2fa, false) THEN
    RETURN OLD;
  END IF;

  SELECT count(*) INTO remaining
    FROM public.webauthn_credentials
   WHERE user_id = OLD.user_id
     AND id <> OLD.id;

  IF remaining > 0 THEN
    RETURN OLD;
  END IF;

  SELECT count(*) INTO unused_codes
    FROM public.webauthn_backup_codes
   WHERE user_id = OLD.user_id
     AND used_at IS NULL;

  IF unused_codes > 0 THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Cannot remove the last passkey while passkey second factor is required. Turn off 2FA or generate backup codes first.'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_webauthn_last_credential ON public.webauthn_credentials;
CREATE TRIGGER trg_guard_webauthn_last_credential
  BEFORE DELETE ON public.webauthn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_webauthn_last_credential();