
-- Fix 1: org_company_officers - prevent cross-org PII exposure
-- Drop overly broad public SELECT; restrict full row reads to org members & admins.
-- Anonymous/public website rendering of officers will use a SECURITY DEFINER RPC that returns safe columns only.

DROP POLICY IF EXISTS "Authenticated users can view public officers" ON public.org_company_officers;

CREATE POLICY "Org members and admins read officers"
ON public.org_company_officers
FOR SELECT
TO authenticated
USING (
  public.is_org_member(auth.uid(), org_id)
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'super_assistant')
);

-- Safe public projection (no email, no phone)
CREATE OR REPLACE FUNCTION public.get_public_org_officers(_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  full_name text,
  title text,
  bio text,
  photo_url text,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, org_id, full_name, title, bio, photo_url, display_order
    FROM public.org_company_officers
   WHERE org_id = _org_id AND is_public = true
   ORDER BY display_order;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_org_officers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_org_officers(uuid) TO anon, authenticated;

-- Fix 2: platform_bank_accounts - restrict broad authenticated read
DROP POLICY IF EXISTS "Authenticated users read active bank accounts" ON public.platform_bank_accounts;

CREATE POLICY "Users with pending transfer or admins read bank accounts"
ON public.platform_bank_accounts
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'super_assistant')
    OR EXISTS (
      SELECT 1 FROM public.bank_transfer_payments btp
       WHERE btp.user_id = auth.uid()
         AND btp.status IN ('pending', 'awaiting_verification', 'submitted')
    )
  )
);
