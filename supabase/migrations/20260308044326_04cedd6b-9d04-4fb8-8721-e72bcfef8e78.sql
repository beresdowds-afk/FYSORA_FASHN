
-- Featured product slots table
CREATE TABLE public.featured_product_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'org_admin',
  catalogue_item_id UUID REFERENCES public.org_catalogue_items(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  slot_type TEXT NOT NULL DEFAULT 'free', -- 'free' or 'paid'
  amount_paid NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  payment_status TEXT DEFAULT 'paid',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.featured_product_slots ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view their org's featured slots
CREATE POLICY "Org members can view featured slots"
  ON public.featured_product_slots FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- RLS: org admins/managers/designers can insert
CREATE POLICY "Org roles can insert featured slots"
  ON public.featured_product_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), org_id)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- RLS: org admins/managers can update
CREATE POLICY "Org roles can update featured slots"
  ON public.featured_product_slots FOR UPDATE
  TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- RLS: org admins can delete
CREATE POLICY "Org roles can delete featured slots"
  ON public.featured_product_slots FOR DELETE
  TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id)
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Public can view active featured products
CREATE POLICY "Public can view active featured products"
  ON public.featured_product_slots FOR SELECT
  TO anon
  USING (is_active = true);

-- Featured slot entitlements config table (free slots per role)
CREATE TABLE public.featured_slot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE,
  free_slots_per_period INT NOT NULL DEFAULT 1,
  period_weeks INT NOT NULL DEFAULT 4,
  paid_slot_price NUMERIC NOT NULL DEFAULT 8,
  paid_slot_currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.featured_slot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read slot config"
  ON public.featured_slot_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage slot config"
  ON public.featured_slot_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default config
INSERT INTO public.featured_slot_config (role, free_slots_per_period, period_weeks, paid_slot_price)
VALUES
  ('designer', 1, 4, 8),
  ('org_admin', 3, 4, 8);
