
-- Customer registration fee tracking
CREATE TABLE public.customer_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  fee_amount numeric NOT NULL DEFAULT 5,
  fee_currency text NOT NULL DEFAULT 'USD',
  local_amount numeric DEFAULT NULL,
  local_currency text DEFAULT NULL,
  
  payment_gateway text DEFAULT NULL, -- 'paystack', 'stripe', etc.
  gateway_reference text DEFAULT NULL,
  gateway_checkout_url text DEFAULT NULL,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'waived')),
  paid_at timestamptz DEFAULT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, org_id)
);

ALTER TABLE public.customer_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own registration"
  ON public.customer_registrations FOR SELECT
  USING (user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert their own registration"
  ON public.customer_registrations FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update registrations"
  ON public.customer_registrations FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role) OR user_id = auth.uid());

CREATE TRIGGER update_customer_registrations_updated_at
  BEFORE UPDATE ON public.customer_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
