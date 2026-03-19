
-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Org admins can add members" ON public.org_members;

-- Admins and super admins can add members with any role
CREATE POLICY "Org admins can add members"
  ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), org_id)
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Self-join as customer (for joining an existing org)
CREATE POLICY "Users can self-join as customer"
  ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'customer'
  );

-- Self-join as org_admin ONLY when creating a new org (no existing members)
CREATE POLICY "Creator can self-join new org as admin"
  ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'org_admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
    )
  );
