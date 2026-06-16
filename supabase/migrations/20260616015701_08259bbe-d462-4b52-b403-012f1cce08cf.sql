
-- 1. org_api_keys: remove overly broad insert/update policies that allowed managers
DROP POLICY IF EXISTS "Super admins can insert api keys" ON public.org_api_keys;
DROP POLICY IF EXISTS "Super admins can update api keys" ON public.org_api_keys;

CREATE POLICY "Super admins insert api keys"
ON public.org_api_keys
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update api keys"
ON public.org_api_keys
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. org_outbound_webhooks: restrict to strict org admins (exclude managers)
DROP POLICY IF EXISTS "Org admins manage own webhooks" ON public.org_outbound_webhooks;

CREATE POLICY "Strict org admins manage own webhooks"
ON public.org_outbound_webhooks
FOR ALL TO authenticated
USING (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

-- 3. profiles: restrict sensitive identity columns from co-members
REVOKE SELECT (identity_number, identity_type, identity_verification_status) ON public.profiles FROM anon, authenticated;

-- Owner self-read RPC for identity (in case the owner UI needs to render their own number)
CREATE OR REPLACE FUNCTION public.get_my_identity()
RETURNS TABLE(identity_number text, identity_type text, identity_verification_status text, identity_verified boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.identity_number, p.identity_type, p.identity_verification_status, p.identity_verified
    FROM public.profiles p WHERE p.id = auth.uid();
END;$$;
REVOKE EXECUTE ON FUNCTION public.get_my_identity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_identity() TO authenticated;

-- Super-admin RPC for the invoicing/verification dashboard
CREATE OR REPLACE FUNCTION public.admin_list_identity_verifications()
RETURNS TABLE(id uuid, display_name text, identity_number text, identity_type text, identity_verified boolean, identity_verification_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant')) THEN
    PERFORM public.log_admin_access_violation('admin_list_identity_verifications');
    RAISE EXCEPTION 'super_admin role required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.identity_number, p.identity_type, p.identity_verified, p.identity_verification_status
    FROM public.profiles p
    WHERE p.identity_number IS NOT NULL;
END;$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_identity_verifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_identity_verifications() TO authenticated;
