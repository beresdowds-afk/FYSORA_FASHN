REVOKE ALL ON FUNCTION public.passkey_deployment_health_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_deployment_health_check() TO service_role;