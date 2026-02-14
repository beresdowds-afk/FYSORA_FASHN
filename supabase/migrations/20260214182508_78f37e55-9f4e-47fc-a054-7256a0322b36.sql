
-- Subscription Plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- Basic, Pro, Enterprise
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  max_orders INTEGER, -- null = unlimited
  max_members INTEGER, -- null = unlimited
  max_customers INTEGER, -- null = unlimited
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view plans
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- Only super admins can manage plans
CREATE POLICY "Super admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Org Subscriptions table
CREATE TABLE public.org_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  payment_gateway TEXT CHECK (payment_gateway IN ('stripe', 'paypal', 'paystack')),
  gateway_subscription_id TEXT, -- external subscription ID
  gateway_customer_id TEXT, -- external customer ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their subscription"
  ON public.org_subscriptions FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can manage subscription"
  ON public.org_subscriptions FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can update subscription"
  ON public.org_subscriptions FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Payments table (for order payments)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_type TEXT NOT NULL DEFAULT 'full' CHECK (payment_type IN ('deposit', 'partial', 'full', 'balance')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_gateway TEXT CHECK (payment_gateway IN ('stripe', 'paypal', 'paystack')),
  gateway_payment_id TEXT, -- external transaction reference
  gateway_checkout_url TEXT, -- payment link URL
  payment_method TEXT, -- card, bank_transfer, etc.
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view payments"
  ON public.payments FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org members can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can update payments"
  ON public.payments FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can delete payments"
  ON public.payments FOR DELETE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add payment tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'partially_paid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_subscriptions_updated_at
  BEFORE UPDATE ON public.org_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Seed the 3 subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_orders, max_members, max_customers, features, sort_order) VALUES
('Basic', 'basic', 'Perfect for solo tailors getting started', 5000, 50000, 50, 2, 50, '["Order management", "Invoice generation", "1 payment gateway", "Email support"]'::jsonb, 1),
('Pro', 'pro', 'For growing tailoring businesses', 15000, 150000, 500, 10, 500, '["Everything in Basic", "All payment gateways", "Measurement profiles", "Priority support", "CSV export"]'::jsonb, 2),
('Enterprise', 'enterprise', 'For large tailoring operations', 35000, 350000, NULL, NULL, NULL, '["Everything in Pro", "Unlimited orders", "Unlimited members", "Custom branding", "API access", "Dedicated support"]'::jsonb, 3);
