
-- Add trial support to org_subscriptions
ALTER TABLE public.org_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;

-- Add fee columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_fee_percent numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS admin_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_total numeric NOT NULL DEFAULT 0;

-- Add fee tracking to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_fee_amount numeric NOT NULL DEFAULT 0;

-- Platform fee ledger - tracks all fees owed to Fashion Stitches Africa
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  order_id uuid REFERENCES public.orders(id),
  payment_id uuid REFERENCES public.payments(id),
  fee_type text NOT NULL CHECK (fee_type IN ('customer_surcharge', 'org_admin_fee')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'settled')),
  settled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage fee ledger"
  ON public.platform_fee_ledger FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can view their fee ledger"
  ON public.platform_fee_ledger FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

-- Update subscription_plans: add trial_days column
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 30;

-- Add supported_gateways to track which gateways each org has configured
-- (org_api_keys already stores keys, this is just a convenience view)
