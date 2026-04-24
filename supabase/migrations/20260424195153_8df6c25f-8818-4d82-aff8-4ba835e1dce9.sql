-- 1. Drop permissive INSERT policy on shipment_tracking_events
DROP POLICY IF EXISTS "System can insert tracking" ON public.shipment_tracking_events;

-- 2. Restrict mcp_tenant_usage INSERT to super_admin only (service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service can insert usage" ON public.mcp_tenant_usage;
CREATE POLICY "Super admins can insert usage"
ON public.mcp_tenant_usage
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Restrict public-officer visibility: hide email/phone from anon, keep authenticated access
DROP POLICY IF EXISTS "Anyone can view public officers" ON public.org_company_officers;
CREATE POLICY "Authenticated users can view public officers"
ON public.org_company_officers
FOR SELECT
TO authenticated
USING (is_public = true OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Make views security_invoker to satisfy the SECURITY DEFINER view linter
ALTER VIEW public.organizations_summary SET (security_invoker = true);
ALTER VIEW public.organizations_public SET (security_invoker = true);

-- 5. Set search_path on pgmq helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;