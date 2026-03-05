
-- Feature access requests table for billed platform features
CREATE TABLE public.feature_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  description text,
  billing_type text NOT NULL DEFAULT 'one_time',
  price_amount numeric NOT NULL DEFAULT 0,
  price_currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  paid_at timestamptz,
  gateway_reference text,
  gateway_checkout_url text,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own requests" ON public.feature_access_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id)) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id)) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add region/description to organizations for browsing
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}';
