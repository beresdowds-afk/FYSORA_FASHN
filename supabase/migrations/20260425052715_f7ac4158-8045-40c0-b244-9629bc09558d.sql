-- Platform-level subscription (FYSORA FASHN as non-fee-paying client)
CREATE TABLE public.sentinel_mcp_platform_subscription (
  id INTEGER PRIMARY KEY DEFAULT 1,
  client_name TEXT NOT NULL DEFAULT 'FYSORA FASHN (Fashion Stitches Africa)',
  contact_email TEXT NOT NULL DEFAULT 'sentinel-mcp@eastforte.org.ng',
  billing_tier TEXT NOT NULL DEFAULT 'non_fee_paying',
  is_active BOOLEAN NOT NULL DEFAULT true,
  cascades_to_users BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.sentinel_mcp_platform_subscription ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage platform subscription"
  ON public.sentinel_mcp_platform_subscription FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can read platform subscription"
  ON public.sentinel_mcp_platform_subscription FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_sentinel_mcp_platform_subscription_updated_at
  BEFORE UPDATE ON public.sentinel_mcp_platform_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sentinel_mcp_platform_subscription
  (id, client_name, contact_email, billing_tier, is_active, cascades_to_users, notes)
VALUES (
  1,
  'FYSORA FASHN (Fashion Stitches Africa)',
  'sentinel-mcp@eastforte.org.ng',
  'non_fee_paying',
  true,
  false,
  'Platform-level non-fee-paying client. Status does NOT extend to users (Tailors, Designers, Organizations) — native or non-native — who must subscribe to paid add-ons individually.'
);

-- Sentinel MCP paid add-ons catalog for users
CREATE TABLE public.sentinel_mcp_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_request_price_usd NUMERIC(10,2),
  available_to_roles TEXT[] NOT NULL DEFAULT ARRAY['tailor','designer','org_admin'],
  mcp_tool_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sentinel_mcp_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view active addons"
  ON public.sentinel_mcp_addons FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins manage addons"
  ON public.sentinel_mcp_addons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_sentinel_mcp_addons_updated_at
  BEFORE UPDATE ON public.sentinel_mcp_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sentinel_mcp_addons
  (addon_key, name, description, category, monthly_price_usd, per_request_price_usd, mcp_tool_name)
VALUES
  ('seo_optimization', 'SEO Optimization Suite', 'Continuous on-page SEO analysis, keyword targeting, schema generation, and Sentinel-driven content optimization for your storefront and product pages.', 'growth', 19.00, 2.50, 'sentinel_seo_optimize'),
  ('observability_pro', 'Observability Pro', 'Distributed tracing, uptime monitoring, and performance insights across your storefront and order flows via Sentinel OpenTelemetry.', 'reliability', 12.00, NULL, 'sentinel_observability'),
  ('security_scans', 'Continuous Security Scans', 'Weekly vulnerability scans, RASP runtime protection hooks, and SIEM-forwarded audit alerts powered by Sentinel CySaaS.', 'security', 15.00, NULL, 'sentinel_security_scan'),
  ('content_intelligence', 'Content Intelligence', 'AI-generated product descriptions, alt text, and social captions tuned for African fashion markets.', 'growth', 9.00, 0.50, 'sentinel_content_gen'),
  ('domain_reputation', 'Domain & Brand Reputation Monitor', 'Tracks brand mentions, backlink health, and DNS reputation across the web via Sentinel intelligence feeds.', 'growth', 7.00, NULL, 'sentinel_brand_monitor');

-- User-level subscriptions to paid add-ons
CREATE TABLE public.sentinel_mcp_user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id UUID NOT NULL REFERENCES public.sentinel_mcp_addons(id) ON DELETE RESTRICT,
  user_id UUID,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  last_invoice_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriber_present CHECK (user_id IS NOT NULL OR org_id IS NOT NULL)
);

CREATE INDEX idx_smus_user ON public.sentinel_mcp_user_subscriptions(user_id);
CREATE INDEX idx_smus_org ON public.sentinel_mcp_user_subscriptions(org_id);
CREATE INDEX idx_smus_status ON public.sentinel_mcp_user_subscriptions(status);

ALTER TABLE public.sentinel_mcp_user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscriptions"
  ON public.sentinel_mcp_user_subscriptions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users create own subscriptions"
  ON public.sentinel_mcp_user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
  );

CREATE POLICY "Users cancel own subscriptions"
  ON public.sentinel_mcp_user_subscriptions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins manage subscriptions"
  ON public.sentinel_mcp_user_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_sentinel_mcp_user_subscriptions_updated_at
  BEFORE UPDATE ON public.sentinel_mcp_user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEO optimization request queue (always routed via Sentinel MCP)
CREATE TABLE public.seo_optimization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'page',
  keywords TEXT[],
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  routed_to TEXT NOT NULL DEFAULT 'sentinel_mcp',
  mcp_event_id UUID,
  mcp_response JSONB,
  billing_status TEXT NOT NULL DEFAULT 'pending',
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_seo_requests_requester ON public.seo_optimization_requests(requester_id);
CREATE INDEX idx_seo_requests_org ON public.seo_optimization_requests(org_id);
CREATE INDEX idx_seo_requests_status ON public.seo_optimization_requests(status);

ALTER TABLE public.seo_optimization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters see own SEO requests"
  ON public.seo_optimization_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Authenticated users create SEO requests"
  ON public.seo_optimization_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Super admins manage SEO requests"
  ON public.seo_optimization_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_seo_optimization_requests_updated_at
  BEFORE UPDATE ON public.seo_optimization_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();