
-- Platform Feature Flags table
CREATE TABLE public.platform_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  api_provider text,
  is_enabled boolean NOT NULL DEFAULT false,
  toggle_mechanism text NOT NULL DEFAULT 'feature_flag',
  mvp_default boolean NOT NULL DEFAULT false,
  full_platform_default boolean NOT NULL DEFAULT true,
  requires_api_key boolean NOT NULL DEFAULT false,
  required_secret_names text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (needed for gating)
CREATE POLICY "Anyone can read feature flags"
  ON public.platform_feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can manage
CREATE POLICY "Super admins can manage feature flags"
  ON public.platform_feature_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed the MVP feature toggle matrix
INSERT INTO public.platform_feature_flags (feature_key, feature_name, description, category, api_provider, is_enabled, toggle_mechanism, mvp_default, full_platform_default, requires_api_key, required_secret_names) VALUES
  -- Payments
  ('basic_payments', 'Basic Payments', 'Stripe payment processing', 'payments', 'Stripe', true, 'feature_flag', true, true, true, ARRAY['STRIPE_SECRET_KEY']),
  ('advanced_payments', 'Advanced Payments', 'Paystack payment gateway for Africa', 'payments', 'Paystack', false, 'api_gateway', false, true, true, ARRAY['PAYSTACK_SECRET_KEY']),
  ('pan_african_payments', 'Pan-African Payments', 'Flutterwave multi-currency payments', 'payments', 'Flutterwave', false, 'api_gateway', false, true, true, ARRAY['FLW_SECRET_KEY']),

  -- Logistics
  ('local_logistics', 'Local Logistics', 'Terminal Africa shipping for African regions', 'logistics', 'Terminal Africa', true, 'feature_flag', true, true, true, ARRAY['TERMINAL_AFRICA_API_KEY']),
  ('global_logistics', 'Global Logistics', 'FedEx/DHL international shipping', 'logistics', 'FedEx/DHL', false, 'api_gateway', false, true, true, ARRAY['FEDEX_API_KEY', 'DHL_API_KEY']),

  -- Measurements & Try-On
  ('basic_measurement', 'Basic Measurement', '360° body scanning via 3DLOOK', 'measurements', '3DLOOK/360°', true, 'feature_flag', true, true, true, ARRAY['MEASUREMENT_API_KEY']),
  ('pro_measurement', 'Pro Measurement', 'Advanced body scanning via Netvirta', 'measurements', 'Netvirta', false, 'api_gateway', false, true, true, ARRAY['NETVIRTA_API_KEY']),
  ('virtual_tryon', 'Virtual Try-On', 'AI-powered virtual try-on via FASHN', 'measurements', 'FASHN', true, 'feature_flag', true, true, true, ARRAY['FASHN_API_KEY']),

  -- Communications
  ('email_notifications', 'Email Notifications', 'Transactional email via Resend', 'communications', 'Resend', true, 'feature_flag', true, true, true, ARRAY['RESEND_API_KEY']),
  ('whatsapp_messaging', 'WhatsApp Messaging', 'WhatsApp via Twilio/Termii', 'communications', 'Twilio', true, 'feature_flag', true, true, true, ARRAY['TWILIO_AUTH_TOKEN']),
  ('sms_messaging', 'SMS Messaging', 'SMS notifications via Twilio/Termii', 'communications', 'Twilio', false, 'feature_flag', false, true, true, ARRAY['TWILIO_AUTH_TOKEN']),
  ('video_calls', 'Video Calls', 'WebRTC video consultations', 'communications', 'Twilio', true, 'feature_flag', true, true, false, '{}'),
  ('call_recording', 'Call Recording', 'Record video/voice calls', 'communications', 'Twilio', false, 'feature_flag', false, true, true, ARRAY['TWILIO_AUTH_TOKEN']),
  ('multi_party_video', 'Multi-Party Video', 'Group video calls (3+ participants)', 'communications', 'Twilio', false, 'feature_flag', false, true, true, ARRAY['TWILIO_AUTH_TOKEN']),

  -- Calendar
  ('calendar_integration', 'Calendar Integration', 'Google Calendar scheduling', 'integrations', 'Google', true, 'feature_flag', true, true, true, ARRAY['GOOGLE_CALENDAR_API_KEY']),

  -- Website & E-commerce
  ('website_builder_pro', 'Website Builder Pro', 'Advanced website builder with custom domains', 'website', 'In-house', false, 'feature_flag', false, true, false, '{}'),
  ('ecommerce', 'E-commerce Module', 'Online store with checkout', 'website', 'In-house', false, 'feature_flag', false, true, false, '{}'),

  -- AI & Automation
  ('ai_disputes', 'AI Dispute Resolution', 'Gemini-powered dispute classification', 'ai', 'In-house', false, 'feature_flag', false, true, false, '{}'),
  ('auto_backup', 'Auto Backup', 'Automated Google Drive/Sheets backup', 'backup', 'Google Drive', false, 'feature_flag', false, true, false, '{}');
