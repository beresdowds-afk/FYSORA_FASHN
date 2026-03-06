
CREATE TABLE public.subscription_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type TEXT NOT NULL DEFAULT 'customer',
  plan_name TEXT NOT NULL,
  price_amount NUMERIC NOT NULL DEFAULT 0,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL DEFAULT 'yearly',
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_rates ENABLE ROW LEVEL SECURITY;

-- Public read for active rates (used on landing page)
CREATE POLICY "Anyone can read active rates"
  ON public.subscription_rates FOR SELECT
  USING (is_active = true);

-- Super admins full access
CREATE POLICY "Super admins can manage rates"
  ON public.subscription_rates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed default rates
INSERT INTO public.subscription_rates (role_type, plan_name, price_amount, price_currency, billing_cycle, description, features, sort_order) VALUES
('customer', 'Premium Access', 10, 'USD', 'yearly', 'Full access to all customer platform features', '["AI Body Measurements", "Virtual Try-On", "Video Consultations", "Smart Notifications", "Priority Order Tracking", "Premium Catalogue Access", "Direct Messaging", "Dispute Resolution"]'::jsonb, 1),
('tailor', 'Starter', 29, 'USD', 'monthly', 'Perfect for individual tailors getting started', '["1 Team Member", "100 Orders/month", "Basic Analytics", "Email Support", "1 Currency"]'::jsonb, 1),
('tailor', 'Professional', 79, 'USD', 'monthly', 'For growing fashion businesses ready to scale', '["10 Team Members", "Unlimited Orders", "Advanced Analytics", "Priority Support", "Multi-Currency", "AI Measurements", "WhatsApp Integration"]'::jsonb, 2),
('organization', 'Business', 79, 'USD', 'monthly', 'Full-featured plan for fashion organizations', '["10 Team Members", "Unlimited Orders", "Advanced Analytics", "Custom Domain", "AI Measurements", "Communications Suite"]'::jsonb, 1),
('organization', 'Enterprise', 199, 'USD', 'monthly', 'For established businesses with complex needs', '["Unlimited Team", "Unlimited Everything", "Custom Analytics", "Dedicated Support", "All Currencies", "White-label Solution", "API Access", "VoIP & SMS"]'::jsonb, 2);
