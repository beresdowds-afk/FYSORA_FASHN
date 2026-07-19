
-- 1. Fix SECURITY DEFINER view (org_websites_public) by enabling security_invoker
ALTER VIEW public.org_websites_public SET (security_invoker = on);

-- 2. Remove broad org-assets storage policies (path-scoped policies remain)
DROP POLICY IF EXISTS "Org admins can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload assets" ON storage.objects;

-- 3. Remove broad tryon-images insert policy (path-scoped policy remains)
DROP POLICY IF EXISTS "Authenticated users can upload tryon images" ON storage.objects;

-- 4. Restrict anonymous access to organizations PII columns.
-- Keep anon SELECT policy for public browsing of active orgs, but revoke
-- column-level access to sensitive contact / invite fields.
REVOKE SELECT (
  email,
  phone,
  invite_code,
  address,
  invoice_address,
  invoice_notes,
  invoice_payment_terms,
  business_reg_number,
  business_reg_type,
  verification_notes
) ON public.organizations FROM anon;
