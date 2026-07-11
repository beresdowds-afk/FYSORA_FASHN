
-- Column-level lockdown: revoke SELECT on identity PII from the two roles that
-- reach the table via PostgREST. RLS row policies remain unchanged; owners and
-- admins still access these fields through SECURITY DEFINER RPCs
-- (get_my_identity, admin_list_identity_verifications).
REVOKE SELECT (identity_number, identity_type, identity_verification_status)
  ON public.profiles FROM authenticated;
REVOKE SELECT (identity_number, identity_type, identity_verification_status)
  ON public.profiles FROM anon;

-- Service role keeps full access (edge functions, admin tooling)
GRANT SELECT (identity_number, identity_type, identity_verification_status)
  ON public.profiles TO service_role;
