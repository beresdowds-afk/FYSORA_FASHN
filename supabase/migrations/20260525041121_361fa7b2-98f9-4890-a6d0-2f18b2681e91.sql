
DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'eastforte2@gmail.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles
       SET access_status = 'active',
           access_status_notes = 'Permanent super admin access (locked)',
           access_status_reviewed_by = _uid,
           access_status_reviewed_at = now()
     WHERE id = _uid;

    UPDATE public.organizations o
       SET business_reg_verification_status = 'approved',
           business_reg_verified = true,
           business_reg_verified_at = COALESCE(business_reg_verified_at, now()),
           verification_notes = COALESCE(verification_notes, 'Permanent super admin organization (locked)'),
           verification_reviewed_by = _uid,
           verification_reviewed_at = now()
     WHERE EXISTS (
       SELECT 1 FROM public.org_members m
       WHERE m.org_id = o.id AND m.user_id = _uid AND m.is_active = true
     );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_eastforte_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _email text;
BEGIN
  SELECT lower(email) INTO _email FROM auth.users WHERE id = NEW.id;
  IF _email = 'eastforte2@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    NEW.access_status := 'active';
    NEW.access_status_notes := COALESCE(NEW.access_status_notes, 'Permanent super admin access (locked)');
    NEW.access_status_reviewed_at := COALESCE(NEW.access_status_reviewed_at, now());
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS enforce_eastforte_super_admin_trg ON public.profiles;
CREATE TRIGGER enforce_eastforte_super_admin_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_eastforte_super_admin();

CREATE OR REPLACE FUNCTION public.enforce_eastforte_org_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _has_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM public.org_members m
      JOIN auth.users u ON u.id = m.user_id
     WHERE m.org_id = NEW.id
       AND m.is_active = true
       AND lower(u.email) = 'eastforte2@gmail.com'
  ) INTO _has_owner;

  IF _has_owner THEN
    NEW.business_reg_verification_status := 'approved';
    NEW.business_reg_verified := true;
    NEW.business_reg_verified_at := COALESCE(NEW.business_reg_verified_at, now());
    NEW.verification_notes := COALESCE(NEW.verification_notes, 'Permanent super admin organization (locked)');
    NEW.verification_reviewed_at := COALESCE(NEW.verification_reviewed_at, now());
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS enforce_eastforte_org_verification_trg ON public.organizations;
CREATE TRIGGER enforce_eastforte_org_verification_trg
BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.enforce_eastforte_org_verification();
