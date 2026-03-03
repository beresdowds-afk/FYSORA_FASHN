
-- Shipping carriers configuration
CREATE TABLE public.shipping_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  api_base_url text,
  is_active boolean NOT NULL DEFAULT true,
  supported_regions text[] DEFAULT '{}',
  carrier_type text NOT NULL DEFAULT 'international',
  tracking_url_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Org carrier settings (which carriers an org uses + credentials reference)
CREATE TABLE public.org_carrier_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.shipping_carriers(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  markup_type text NOT NULL DEFAULT 'percentage',
  markup_value numeric NOT NULL DEFAULT 0,
  credentials_key_id uuid REFERENCES public.org_api_keys(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, carrier_id)
);

-- Shipments
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  carrier_id uuid REFERENCES public.shipping_carriers(id),
  tracking_number text,
  status text NOT NULL DEFAULT 'draft',
  label_url text,
  label_format text DEFAULT 'pdf',
  sender_name text,
  sender_address jsonb DEFAULT '{}',
  sender_phone text,
  recipient_name text,
  recipient_address jsonb DEFAULT '{}',
  recipient_phone text,
  recipient_email text,
  package_weight numeric,
  package_dimensions jsonb,
  package_description text,
  declared_value numeric,
  currency text NOT NULL DEFAULT 'NGN',
  shipping_cost numeric DEFAULT 0,
  carrier_cost numeric DEFAULT 0,
  markup_amount numeric DEFAULT 0,
  insurance_amount numeric DEFAULT 0,
  estimated_delivery_date date,
  actual_delivery_date date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  carrier_reference text,
  metadata jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tracking events
CREATE TABLE public.shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  description text,
  location text,
  carrier_status_code text,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rate quotes (cached)
CREATE TABLE public.shipping_rate_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.shipping_carriers(id),
  origin_address jsonb NOT NULL,
  destination_address jsonb NOT NULL,
  package_weight numeric,
  package_dimensions jsonb,
  carrier_rate numeric NOT NULL,
  final_rate numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  estimated_days integer,
  service_type text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery flags / exceptions
CREATE TABLE public.delivery_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flag_type text NOT NULL DEFAULT 'exception',
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  shipment_id uuid REFERENCES public.shipments(id),
  filed_by uuid NOT NULL,
  filed_against uuid,
  dispute_type text NOT NULL DEFAULT 'quality',
  category text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  subject text NOT NULL,
  description text,
  evidence_urls text[] DEFAULT '{}',
  ai_classification jsonb,
  ai_sentiment text,
  ai_recommendation text,
  ai_auto_resolved boolean DEFAULT false,
  resolution_type text,
  resolution_notes text,
  compensation_amount numeric DEFAULT 0,
  compensation_currency text DEFAULT 'NGN',
  compensation_type text,
  resolved_by uuid,
  resolved_at timestamptz,
  escalated_at timestamptz,
  escalation_level integer DEFAULT 0,
  mediation_scheduled_at timestamptz,
  mediation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_carrier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rate_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Shipping carriers: anyone can view active carriers
CREATE POLICY "Anyone can view active carriers" ON public.shipping_carriers FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage carriers" ON public.shipping_carriers FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Org carrier settings
CREATE POLICY "Org members can view carrier settings" ON public.org_carrier_settings FOR SELECT USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org admins can manage carrier settings" ON public.org_carrier_settings FOR ALL USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin')) WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

-- Shipments
CREATE POLICY "Org members can view shipments" ON public.shipments FOR SELECT USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org members can create shipments" ON public.shipments FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org admins can update shipments" ON public.shipments FOR UPDATE USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org admins can delete shipments" ON public.shipments FOR DELETE USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

-- Tracking events
CREATE POLICY "Org members can view tracking" ON public.shipment_tracking_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND (is_org_member(auth.uid(), s.org_id) OR has_role(auth.uid(), 'super_admin'))));
CREATE POLICY "System can insert tracking" ON public.shipment_tracking_events FOR INSERT WITH CHECK (true);

-- Rate quotes
CREATE POLICY "Org members can view quotes" ON public.shipping_rate_quotes FOR SELECT USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org members can create quotes" ON public.shipping_rate_quotes FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

-- Delivery flags
CREATE POLICY "Org members can view flags" ON public.delivery_flags FOR SELECT USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org members can create flags" ON public.delivery_flags FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Org admins can manage flags" ON public.delivery_flags FOR UPDATE USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

-- Disputes
CREATE POLICY "Parties can view disputes" ON public.disputes FOR SELECT USING (filed_by = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can file disputes" ON public.disputes FOR INSERT WITH CHECK (filed_by = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage disputes" ON public.disputes FOR UPDATE USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

-- Seed default carriers
INSERT INTO public.shipping_carriers (name, slug, carrier_type, supported_regions, tracking_url_template) VALUES
('FedEx', 'fedex', 'international', ARRAY['global'], 'https://www.fedex.com/fedextrack/?trknbr={tracking_number}'),
('DHL', 'dhl', 'international', ARRAY['global'], 'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}'),
('UPS', 'ups', 'international', ARRAY['global'], 'https://www.ups.com/track?tracknum={tracking_number}'),
('Aramex', 'aramex', 'regional', ARRAY['ME','AF'], 'https://www.aramex.com/track/results?ShipmentNumber={tracking_number}'),
('Terminal Africa', 'terminal-africa', 'regional', ARRAY['NG','GH','KE','ZA','UG','TZ','RW','SN'], null),
('GIG Logistics', 'gig-logistics', 'local', ARRAY['NG'], null),
('Flip Delivery', 'flip-delivery', 'local', ARRAY['NG','GH','KE'], null),
('Sendcloud', 'sendcloud', 'international', ARRAY['EU'], 'https://tracking.sendcloud.sc/{tracking_number}');

-- Enable realtime for shipments and tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_tracking_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
