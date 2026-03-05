
-- Table to store per-org app generation configs and fees
CREATE TABLE public.org_app_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  app_name text NOT NULL DEFAULT 'My Fashion App',
  app_description text,
  theme_color text DEFAULT '#C8963E',
  icon_url text,
  is_generated boolean DEFAULT false,
  is_published boolean DEFAULT false,
  generation_fee numeric NOT NULL DEFAULT 49.99,
  generation_currency text NOT NULL DEFAULT 'USD',
  monthly_maintenance_fee numeric NOT NULL DEFAULT 9.99,
  payment_status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  gateway_reference text,
  download_count integer DEFAULT 0,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_app_configs ENABLE ROW LEVEL SECURITY;

-- Org admins can manage their own app config
CREATE POLICY "Org admins can manage own app config"
  ON public.org_app_configs FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can view published app configs (for download pages)
CREATE POLICY "Public can view published app configs"
  ON public.org_app_configs FOR SELECT TO authenticated
  USING (is_published = true);

-- Super admin fee configuration table
CREATE TABLE public.app_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type text NOT NULL UNIQUE DEFAULT 'org_app_generation',
  generation_fee numeric NOT NULL DEFAULT 49.99,
  monthly_fee numeric NOT NULL DEFAULT 9.99,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean DEFAULT true,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage fee settings"
  ON public.app_fee_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users can view fee settings"
  ON public.app_fee_settings FOR SELECT TO authenticated
  USING (true);

-- Insert default fee settings
INSERT INTO public.app_fee_settings (fee_type, generation_fee, monthly_fee, currency, description)
VALUES 
  ('org_app_generation', 49.99, 9.99, 'USD', 'Fee for generating a branded organization app'),
  ('org_app_premium', 99.99, 19.99, 'USD', 'Premium app with advanced features and custom domain');
