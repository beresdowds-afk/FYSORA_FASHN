
-- =========================================================================
-- 1) Custom hostnames for organizations
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.org_custom_hostnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_custom_hostnames_host
  ON public.org_custom_hostnames (lower(hostname));
CREATE INDEX IF NOT EXISTS idx_org_custom_hostnames_org
  ON public.org_custom_hostnames(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_custom_hostnames TO authenticated;
GRANT ALL ON public.org_custom_hostnames TO service_role;
ALTER TABLE public.org_custom_hostnames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage own hostnames"
  ON public.org_custom_hostnames
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_custom_hostnames.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('org_admin','manager')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_custom_hostnames.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('org_admin','manager')
    )
  );

CREATE POLICY "Super admins read all hostnames"
  ON public.org_custom_hostnames
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.resolve_org_by_hostname(_host TEXT)
RETURNS TABLE (org_id UUID, slug TEXT, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.slug, o.name
  FROM public.org_custom_hostnames h
  JOIN public.organizations o ON o.id = h.org_id
  WHERE lower(h.hostname) = lower(_host)
    AND h.is_verified = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_org_by_hostname(TEXT) TO anon, authenticated;

-- =========================================================================
-- 2) Hero media + layout pref on org_websites
-- =========================================================================
ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS hero_media JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_position TEXT NOT NULL DEFAULT 'below_catalogue'
    CHECK (hero_position IN ('above_catalogue','below_catalogue')),
  ADD COLUMN IF NOT EXISTS hero_overlay_opacity NUMERIC NOT NULL DEFAULT 0.4
    CHECK (hero_overlay_opacity >= 0 AND hero_overlay_opacity <= 1),
  ADD COLUMN IF NOT EXISTS hero_media_autoplay BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hero_media_loop BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hero_media_muted BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hero_media_interval_ms INTEGER NOT NULL DEFAULT 6000;

-- =========================================================================
-- 3) Image capacity tracking + request workflow
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.org_website_image_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  website_id UUID REFERENCES public.org_websites(id) ON DELETE CASCADE,
  base_limit INTEGER NOT NULL DEFAULT 50,
  granted_packs INTEGER NOT NULL DEFAULT 0,
  image_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, website_id)
);

GRANT SELECT, INSERT, UPDATE ON public.org_website_image_capacity TO authenticated;
GRANT ALL ON public.org_website_image_capacity TO service_role;
ALTER TABLE public.org_website_image_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read capacity"
  ON public.org_website_image_capacity
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_website_image_capacity.org_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins manage capacity"
  ON public.org_website_image_capacity
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.image_capacity_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  website_id UUID REFERENCES public.org_websites(id) ON DELETE SET NULL,
  packs_requested INTEGER NOT NULL CHECK (packs_requested > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','awaiting_payment','active','rejected','cancelled')),
  price_total NUMERIC,
  currency TEXT DEFAULT 'NGN',
  invoice_id UUID REFERENCES public.custom_invoices(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_capacity_requests_org
  ON public.image_capacity_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_image_capacity_requests_status
  ON public.image_capacity_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.image_capacity_requests TO authenticated;
GRANT ALL ON public.image_capacity_requests TO service_role;
ALTER TABLE public.image_capacity_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage own requests"
  ON public.image_capacity_requests
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = image_capacity_requests.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('org_admin','manager')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = image_capacity_requests.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('org_admin','manager')
    )
  );

CREATE POLICY "Super admins manage all requests"
  ON public.image_capacity_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.apply_capacity_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    INSERT INTO public.org_website_image_capacity(org_id, website_id, granted_packs)
    VALUES (NEW.org_id, NEW.website_id, NEW.packs_requested)
    ON CONFLICT (org_id, website_id)
    DO UPDATE SET
      granted_packs = public.org_website_image_capacity.granted_packs + NEW.packs_requested,
      updated_at = now();
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_capacity_grant ON public.image_capacity_requests;
CREATE TRIGGER trg_apply_capacity_grant
  BEFORE UPDATE ON public.image_capacity_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_capacity_grant();

-- =========================================================================
-- 4) Pricing knob for the 50-image pack
-- =========================================================================
ALTER TABLE public.website_pricing_config
  ADD COLUMN IF NOT EXISTS image_pack_price_ngn NUMERIC NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS image_pack_price_usd NUMERIC NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS image_pack_size INTEGER NOT NULL DEFAULT 50;

-- =========================================================================
-- 5) Platform catalogue feed (unified mirror for PWA sync)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.platform_catalogue_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL CHECK (source_table IN ('org_catalogue_items','tailor_catalogue_items','garment_catalog')),
  source_id UUID NOT NULL,
  org_id UUID,
  owner_user_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'NGN',
  category TEXT,
  tags TEXT[],
  is_available BOOLEAN NOT NULL DEFAULT true,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_catalogue_feed_available
  ON public.platform_catalogue_feed(is_available, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_catalogue_feed_org
  ON public.platform_catalogue_feed(org_id);

GRANT SELECT ON public.platform_catalogue_feed TO anon, authenticated;
GRANT ALL ON public.platform_catalogue_feed TO service_role;
ALTER TABLE public.platform_catalogue_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available feed"
  ON public.platform_catalogue_feed
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

CREATE POLICY "Service role writes feed"
  ON public.platform_catalogue_feed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_catalogue_feed;
