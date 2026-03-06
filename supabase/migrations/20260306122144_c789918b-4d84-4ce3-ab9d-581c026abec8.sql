
-- Central platform fee configuration table
CREATE TABLE public.platform_fee_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_key text NOT NULL UNIQUE,
  fee_label text NOT NULL,
  fee_category text NOT NULL DEFAULT 'general',
  fee_value numeric NOT NULL DEFAULT 0,
  fee_unit text NOT NULL DEFAULT 'percent',
  currency text DEFAULT 'USD',
  description text,
  is_active boolean DEFAULT true,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Price change audit log
CREATE TABLE public.pricing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage
CREATE POLICY "Super admins can manage platform fees"
  ON public.platform_fee_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage pricing audit"
  ON public.pricing_audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed default platform fees
INSERT INTO public.platform_fee_config (fee_key, fee_label, fee_category, fee_value, fee_unit, description) VALUES
  ('customer_surcharge', 'Customer Surcharge', 'order_fees', 5, 'percent', 'Platform fee added to customer order total'),
  ('org_admin_fee', 'Organization Admin Fee', 'order_fees', 5, 'percent', 'Fee deducted from org revenue per order'),
  ('voip_rate_per_minute', 'VoIP Call Rate', 'communication', 0.5, 'credits_per_min', 'Credit cost per minute for VoIP calls'),
  ('ai_measurement_first_hour', 'AI Measurement - First Hour', 'ai_services', 15, 'flat_usd', 'Rate for first hour of AI measurement session'),
  ('ai_measurement_additional_hour', 'AI Measurement - Additional Hour', 'ai_services', 10, 'flat_usd', 'Rate for each additional hour'),
  ('virtual_tryon_per_use', 'Virtual Try-On Per Use', 'ai_services', 2, 'credits', 'Credits charged per virtual try-on session'),
  ('customer_registration_fee', 'Customer Registration Fee', 'registration', 500, 'flat_ngn', 'One-time registration fee for customers'),
  ('credit_bundle_small', 'Credit Bundle - Small (50)', 'credits', 10, 'flat_usd', 'Price for 50-credit bundle'),
  ('credit_bundle_medium', 'Credit Bundle - Medium (200)', 'credits', 35, 'flat_usd', 'Price for 200-credit bundle'),
  ('credit_bundle_large', 'Credit Bundle - Large (500)', 'credits', 75, 'flat_usd', 'Price for 500-credit bundle');
