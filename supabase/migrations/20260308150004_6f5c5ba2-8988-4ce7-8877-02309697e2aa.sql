
-- Regional operations: per-region activation & feature toggles
CREATE TABLE public.regional_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  country_codes TEXT[] NOT NULL DEFAULT '{}',
  flag_emoji TEXT DEFAULT '🌍',
  is_active BOOLEAN NOT NULL DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  
  -- Operation toggles
  payments_enabled BOOLEAN NOT NULL DEFAULT false,
  subscriptions_enabled BOOLEAN NOT NULL DEFAULT false,
  marketplace_enabled BOOLEAN NOT NULL DEFAULT false,
  logistics_enabled BOOLEAN NOT NULL DEFAULT false,
  communications_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_features_enabled BOOLEAN NOT NULL DEFAULT false,
  virtual_tryon_enabled BOOLEAN NOT NULL DEFAULT false,
  video_calls_enabled BOOLEAN NOT NULL DEFAULT false,
  website_builder_enabled BOOLEAN NOT NULL DEFAULT false,
  mobile_app_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Payment gateways available in this region
  available_gateways TEXT[] NOT NULL DEFAULT '{}',
  -- Logistics providers available
  available_carriers TEXT[] NOT NULL DEFAULT '{}',
  -- Messaging providers available
  available_messaging_providers TEXT[] NOT NULL DEFAULT '{}',

  notes TEXT,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(region_code)
);

ALTER TABLE public.regional_operations ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage regional operations
CREATE POLICY "Super admins can manage regional operations"
  ON public.regional_operations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Allow super assistants to view
CREATE POLICY "Super assistants can view regional operations"
  ON public.regional_operations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_assistant'));

-- Seed initial regions
INSERT INTO public.regional_operations (region_code, region_name, country_codes, flag_emoji, is_active, currency, timezone, payments_enabled, subscriptions_enabled, marketplace_enabled, logistics_enabled, communications_enabled, ai_features_enabled, virtual_tryon_enabled, video_calls_enabled, website_builder_enabled, mobile_app_enabled, available_gateways, available_carriers, available_messaging_providers, notes) VALUES
  ('NG', 'Nigeria', ARRAY['NG'], '🇳🇬', true, 'NGN', 'Africa/Lagos', true, true, true, true, true, true, true, true, true, true, ARRAY['paystack', 'flutterwave', 'bank_transfer'], ARRAY['terminal_africa', 'gig_logistics'], ARRAY['termii', 'twilio'], 'Primary operating region — full features active'),
  ('US', 'United States', ARRAY['US'], '🇺🇸', true, 'USD', 'America/New_York', true, true, true, true, true, true, true, true, true, false, ARRAY['stripe', 'paystack'], ARRAY['fedex', 'ups', 'usps'], ARRAY['twilio'], 'US LLC payment entity — SaaS tax nexus tracking active'),
  ('GB', 'United Kingdom', ARRAY['GB'], '🇬🇧', false, 'GBP', 'Europe/London', false, false, false, false, false, false, false, false, false, false, ARRAY['stripe'], ARRAY['royal_mail', 'dhl'], ARRAY['twilio'], 'Planned expansion — awaiting VAT registration'),
  ('CA', 'Canada', ARRAY['CA'], '🇨🇦', false, 'CAD', 'America/Toronto', false, false, false, false, false, false, false, false, false, false, ARRAY['stripe'], ARRAY['canada_post', 'fedex'], ARRAY['twilio'], 'Planned expansion — GST/HST registration pending'),
  ('KE', 'Kenya', ARRAY['KE'], '🇰🇪', false, 'KES', 'Africa/Nairobi', false, false, false, false, false, false, false, false, false, false, ARRAY['mpesa', 'flutterwave'], ARRAY['sendy'], ARRAY['termii', 'twilio'], 'East Africa hub — DST compliance needed'),
  ('ZA', 'South Africa', ARRAY['ZA'], '🇿🇦', false, 'ZAR', 'Africa/Johannesburg', false, false, false, false, false, false, false, false, false, false, ARRAY['paystack', 'flutterwave'], ARRAY['the_courier_guy', 'dhl'], ARRAY['twilio'], 'Southern Africa market — e-services VAT registration needed'),
  ('GH', 'Ghana', ARRAY['GH'], '🇬🇭', false, 'GHS', 'Africa/Accra', false, false, false, false, false, false, false, false, false, false, ARRAY['paystack', 'flutterwave'], ARRAY['terminal_africa'], ARRAY['termii'], 'West Africa expansion — VAT/NHIL compliance needed'),
  ('AE', 'UAE', ARRAY['AE'], '🇦🇪', false, 'AED', 'Asia/Dubai', false, false, false, false, false, false, false, false, false, false, ARRAY['stripe'], ARRAY['aramex', 'dhl'], ARRAY['twilio'], 'Middle East hub — free zone entity possible');
