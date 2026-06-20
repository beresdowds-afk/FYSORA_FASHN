
REVOKE EXECUTE ON FUNCTION public.get_claim_audit_timeline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_claim_audit_timeline(uuid) TO authenticated, service_role;
