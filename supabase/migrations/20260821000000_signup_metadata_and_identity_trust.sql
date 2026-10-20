-- 1) handle_new_user: apply the role chosen at signup (allow-listed) and seed a
--    PENDING identity record from signup metadata. This works even when email
--    confirmation is on (no session exists at signUp time).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_display_name TEXT;
  requested_role TEXT;
  id_type TEXT;
  id_number TEXT;
  r RECORD;
BEGIN
  clean_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );
  clean_display_name := LEFT(clean_display_name, 100);
  clean_display_name := REGEXP_REPLACE(clean_display_name, '[[:cntrl:]]', '', 'g');
  clean_display_name := TRANSLATE(clean_display_name, '<>"' || chr(39) || ';\', '');

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, clean_display_name)
  ON CONFLICT (id) DO NOTHING;

  -- Role requested at signup: strict allow-list, never privileged roles.
  requested_role := NEW.raw_user_meta_data->>'signup_role';
  IF requested_role IN ('customer', 'designer', 'tailor', 'org_admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, requested_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Identity details are stored as PENDING only; verification is done server-side
  -- by the verify-identity edge function after the user signs in.
  id_type := LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'identity_type'), ''), 40);
  id_number := LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'identity_number'), ''), 40);
  IF id_number IS NOT NULL AND id_type IS NOT NULL THEN
    INSERT INTO public.profile_identity (id, identity_number, identity_type, identity_verification_status)
    VALUES (NEW.id, id_number, id_type, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Apply any reserved role assignments for this email.
  FOR r IN
    SELECT role FROM public.reserved_role_assignments
    WHERE lower(email) = lower(NEW.email)
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, r.role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 2) Identity verification flags are server-owned. Direct client writes
--    (role 'authenticated') cannot set or change them; only service_role
--    (verify-identity) and platform admins can.
CREATE OR REPLACE FUNCTION public.protect_identity_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant')) THEN
    IF TG_TABLE_NAME = 'profile_identity' THEN
      IF TG_OP = 'INSERT' THEN
        NEW.identity_verification_status := 'pending';
      ELSE
        NEW.identity_verification_status := OLD.identity_verification_status;
        -- Changing the number invalidates a prior verification.
        IF NEW.identity_number IS DISTINCT FROM OLD.identity_number
           OR NEW.identity_type IS DISTINCT FROM OLD.identity_type THEN
          NEW.identity_verification_status := 'pending';
        END IF;
      END IF;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      IF TG_OP = 'INSERT' THEN
        NEW.identity_verified := false;
        NEW.identity_verified_at := NULL;
      ELSE
        NEW.identity_verified := OLD.identity_verified;
        NEW.identity_verified_at := OLD.identity_verified_at;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_identity ON public.profile_identity;
CREATE TRIGGER trg_protect_profile_identity
  BEFORE INSERT OR UPDATE ON public.profile_identity
  FOR EACH ROW EXECUTE FUNCTION public.protect_identity_verification();

DROP TRIGGER IF EXISTS trg_protect_profiles_identity ON public.profiles;
CREATE TRIGGER trg_protect_profiles_identity
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_identity_verification();
