-- 1. Gabulk: the branded domain is an alias of the FYSORA page, not an
-- external website. Custom integration mode created a redirect loop.
UPDATE public.org_websites
SET mode = 'auto_builder', webhook_url = NULL, updated_at = now()
WHERE org_id = '037ade55-eedb-46da-a8fb-3267e0434a8c';

-- 2. Security: remove the self-join-as-admin insert policy. Organizations are
-- created through the SECURITY DEFINER function create_organization_with_admin,
-- which inserts the admin membership itself, so this client-side path is not
-- needed and allowed racing/orphaned org_ids to be self-granted admin.
DROP POLICY IF EXISTS "Creator can self-join new org as admin" ON public.org_members;