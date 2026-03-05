
-- 1. Audit Logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can view org audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 2. Availability Slots
CREATE TABLE public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  max_bookings_per_slot integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active slots" ON public.availability_slots
  FOR SELECT USING (is_active = true OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage slots" ON public.availability_slots
  FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked dates" ON public.blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Org admins can manage blocked dates" ON public.blocked_dates
  FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

-- 3. Customer Wishlists
CREATE TABLE public.customer_wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalogue_item_id uuid NOT NULL REFERENCES public.org_catalogue_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, catalogue_item_id)
);

ALTER TABLE public.customer_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlists" ON public.customer_wishlists
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid());

-- 4. Customer Reviews
CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalogue_item_id uuid REFERENCES public.org_catalogue_items(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published reviews" ON public.customer_reviews
  FOR SELECT USING (is_published = true OR user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can create reviews" ON public.customer_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews" ON public.customer_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete reviews" ON public.customer_reviews
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'));
