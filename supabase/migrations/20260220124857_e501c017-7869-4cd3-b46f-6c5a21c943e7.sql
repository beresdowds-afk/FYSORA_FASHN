
-- ============================================================
-- Org Website Builder Schema
-- ============================================================

-- 1. org_websites: stores the website configuration per org
CREATE TABLE public.org_websites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'auto_builder' CHECK (mode IN ('auto_builder', 'custom_integration')),
  -- Auto-builder content
  tagline text,
  hero_description text,
  hero_image_url text,
  brand_color text DEFAULT '#8B5CF6',
  accent_color text DEFAULT '#D4AF37',
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  -- Custom integration
  api_key text,
  api_secret text,
  webhook_url text,
  -- Social / contact
  instagram_url text,
  facebook_url text,
  whatsapp_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.org_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage their website"
  ON public.org_websites FOR ALL
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view enabled org websites"
  ON public.org_websites FOR SELECT
  USING (is_enabled = true);

-- 2. org_catalogue_items: products/services displayed in the catalogue
CREATE TABLE public.org_catalogue_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  image_url text,
  price numeric,
  currency text DEFAULT 'NGN',
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  tags text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.org_catalogue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available catalogue items"
  ON public.org_catalogue_items FOR SELECT
  USING (is_available = true);

CREATE POLICY "Org admins can manage catalogue items"
  ON public.org_catalogue_items FOR ALL
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. org_consultations: appointment/consultation bookings from public website
CREATE TABLE public.org_consultations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  service_type text NOT NULL DEFAULT 'consultation',
  preferred_date date,
  preferred_time text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.org_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can book a consultation"
  ON public.org_consultations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org admins can manage consultations"
  ON public.org_consultations FOR ALL
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_org_websites_updated_at
  BEFORE UPDATE ON public.org_websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_catalogue_items_updated_at
  BEFORE UPDATE ON public.org_catalogue_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_consultations_updated_at
  BEFORE UPDATE ON public.org_consultations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
