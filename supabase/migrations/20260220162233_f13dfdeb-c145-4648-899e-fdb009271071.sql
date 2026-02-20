-- Create website builder subscriptions table
CREATE TABLE public.website_builder_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  plan text NOT NULL DEFAULT 'lite', -- 'lite' or 'pro'
  status text NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'cancelled', 'expired'
  trial_start timestamp with time zone NOT NULL DEFAULT now(),
  trial_end timestamp with time zone NOT NULL DEFAULT (now() + interval '6 months'),
  activated_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  monthly_fee numeric NOT NULL DEFAULT 17,
  platform_fee numeric NOT NULL DEFAULT 10,
  payment_gateway text,
  gateway_reference text,
  gateway_checkout_url text,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create website builder pro requests table (for manual setup by super admin)
CREATE TABLE public.website_builder_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  plan text NOT NULL DEFAULT 'pro',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
  one_time_fee numeric NOT NULL DEFAULT 199,
  platform_fee numeric NOT NULL DEFAULT 140,
  monthly_maintenance numeric NOT NULL DEFAULT 7,
  payment_gateway text,
  gateway_reference text,
  gateway_checkout_url text,
  payment_status text NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid'
  paid_at timestamp with time zone,
  assigned_to text,
  assigned_at timestamp with time zone,
  completed_at timestamp with time zone,
  website_url text,
  notes text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_builder_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_builder_requests ENABLE ROW LEVEL SECURITY;

-- RLS: website_builder_subscriptions
CREATE POLICY "Org members can view their website subscription"
  ON public.website_builder_subscriptions FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can insert website subscription"
  ON public.website_builder_subscriptions FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can update website subscription"
  ON public.website_builder_subscriptions FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: website_builder_requests
CREATE POLICY "Org admins can view their website requests"
  ON public.website_builder_requests FOR SELECT
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can insert website requests"
  ON public.website_builder_requests FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins and super admins can update website requests"
  ON public.website_builder_requests FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete website requests"
  ON public.website_builder_requests FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_website_builder_subscriptions_updated_at
  BEFORE UPDATE ON public.website_builder_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_builder_requests_updated_at
  BEFORE UPDATE ON public.website_builder_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
