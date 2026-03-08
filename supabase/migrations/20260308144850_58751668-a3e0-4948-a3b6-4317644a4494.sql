
-- ══════════════════════════════════════════════════════════════
-- TAX SYSTEM SCHEMA FOR GLOBAL SaaS (DUAL-ENTITY: NG + US LLC)
-- ══════════════════════════════════════════════════════════════

-- 1. Platform tax configuration (dual-entity settings)
CREATE TABLE public.tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage tax config"
  ON public.tax_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can read tax config"
  ON public.tax_config FOR SELECT TO authenticated
  USING (true);

-- 2. Tax jurisdictions and rates
CREATE TABLE public.tax_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL UNIQUE,
  jurisdiction_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'US',
  jurisdiction_type TEXT NOT NULL DEFAULT 'state',
  tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  tax_name TEXT NOT NULL DEFAULT 'Sales Tax',
  applies_to_saas BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  nexus_revenue_threshold NUMERIC(12,2) DEFAULT 100000,
  nexus_transaction_threshold INTEGER DEFAULT 200,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_jurisdictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage jurisdictions"
  ON public.tax_jurisdictions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can read jurisdictions"
  ON public.tax_jurisdictions FOR SELECT TO authenticated
  USING (true);

-- 3. Nexus tracking per jurisdiction
CREATE TABLE public.nexus_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID NOT NULL REFERENCES public.tax_jurisdictions(id) ON DELETE CASCADE,
  tracking_period TEXT NOT NULL,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  nexus_triggered BOOLEAN NOT NULL DEFAULT false,
  nexus_triggered_at TIMESTAMPTZ,
  threshold_revenue_pct NUMERIC(5,2) DEFAULT 0,
  threshold_transaction_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jurisdiction_id, tracking_period)
);

ALTER TABLE public.nexus_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage nexus tracking"
  ON public.nexus_tracking FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. Tax ledger (every tax event recorded)
CREATE TABLE public.tax_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'platform',
  entity_id UUID,
  org_id UUID REFERENCES public.organizations(id),
  jurisdiction_id UUID REFERENCES public.tax_jurisdictions(id),
  tax_type TEXT NOT NULL,
  taxable_amount NUMERIC(14,2) NOT NULL,
  tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  reference_type TEXT,
  reference_id UUID,
  customer_country TEXT,
  customer_state TEXT,
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  exemption_reason TEXT,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'calculated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage tax ledger"
  ON public.tax_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can view their tax ledger"
  ON public.tax_ledger FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id)
  );

-- 5. Org-level tax settings
CREATE TABLE public.org_tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  tax_enabled BOOLEAN NOT NULL DEFAULT false,
  tax_id_number TEXT,
  tax_id_type TEXT,
  default_tax_rate NUMERIC(6,4) DEFAULT 0,
  tax_inclusive_pricing BOOLEAN NOT NULL DEFAULT false,
  country_code TEXT NOT NULL DEFAULT 'NG',
  state_province TEXT,
  collect_customer_tax_id BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage their tax settings"
  ON public.org_tax_settings FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Super admins can manage all tax settings"
  ON public.org_tax_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Indexes
CREATE INDEX idx_tax_ledger_period ON public.tax_ledger(period);
CREATE INDEX idx_tax_ledger_org ON public.tax_ledger(org_id);
CREATE INDEX idx_tax_ledger_jurisdiction ON public.tax_ledger(jurisdiction_id);
CREATE INDEX idx_nexus_tracking_period ON public.nexus_tracking(tracking_period);
CREATE INDEX idx_tax_jurisdictions_country ON public.tax_jurisdictions(country_code);

-- Triggers for updated_at
CREATE TRIGGER update_tax_config_updated_at BEFORE UPDATE ON public.tax_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_jurisdictions_updated_at BEFORE UPDATE ON public.tax_jurisdictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nexus_tracking_updated_at BEFORE UPDATE ON public.nexus_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_org_tax_settings_updated_at BEFORE UPDATE ON public.org_tax_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
