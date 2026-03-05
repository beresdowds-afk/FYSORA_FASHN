
-- =============================================
-- 1. Embed Configurations (widget config per org)
-- =============================================
CREATE TABLE public.embed_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  widget_key text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_enabled boolean NOT NULL DEFAULT true,
  allowed_domains text[] NOT NULL DEFAULT '{}',
  enabled_features text[] NOT NULL DEFAULT ARRAY['measurements', 'tryon', 'appointments'],
  theme_config jsonb NOT NULL DEFAULT '{"primaryColor": "#000000", "borderRadius": "8px", "position": "bottom-right"}'::jsonb,
  branding_text text DEFAULT 'Powered by Fashion Stitches Africa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.embed_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage embed config" ON public.embed_configurations
  FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Public can read enabled configs by widget_key" ON public.embed_configurations
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true);

-- =============================================
-- 2. Customer Opt-Outs (selective per org)
-- =============================================
CREATE TABLE public.customer_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  opt_out_type text NOT NULL DEFAULT 'all',
  opted_out_features text[] NOT NULL DEFAULT '{}',
  reason text,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  opted_back_in_at timestamptz,
  status text NOT NULL DEFAULT 'opted_out',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, customer_id, opt_out_type)
);

ALTER TABLE public.customer_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage own opt-outs" ON public.customer_opt_outs
  FOR ALL TO authenticated
  USING (customer_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (customer_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- =============================================
-- 3. Tailor Contracts (subcontract agreements)
-- =============================================
CREATE TABLE public.tailor_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tailor_id uuid NOT NULL,
  contract_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  contract_type text NOT NULL DEFAULT 'per_order',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  payment_terms text NOT NULL DEFAULT 'per_completion',
  tailor_rate_type text NOT NULL DEFAULT 'percentage',
  tailor_rate_value numeric NOT NULL DEFAULT 70,
  agency_fee_percent numeric NOT NULL DEFAULT 10,
  max_concurrent_orders integer DEFAULT 5,
  auto_renew boolean NOT NULL DEFAULT false,
  notes text,
  terminated_at timestamptz,
  terminated_by uuid,
  termination_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, contract_number)
);

ALTER TABLE public.tailor_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage contracts" ON public.tailor_contracts
  FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tailors can view own contracts" ON public.tailor_contracts
  FOR SELECT TO authenticated
  USING (tailor_id = auth.uid());

-- =============================================
-- 4. Contract Payments (agency billing ledger)
-- =============================================
CREATE TABLE public.contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.tailor_contracts(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  tailor_id uuid NOT NULL,
  customer_paid_amount numeric NOT NULL DEFAULT 0,
  tailor_payout_amount numeric NOT NULL DEFAULT 0,
  agency_fee_amount numeric NOT NULL DEFAULT 0,
  org_net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage contract payments" ON public.contract_payments
  FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tailors can view own payments" ON public.contract_payments
  FOR SELECT TO authenticated
  USING (tailor_id = auth.uid());

-- =============================================
-- 5. Order Delegations (order assignment tracking)
-- =============================================
CREATE TABLE public.order_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.tailor_contracts(id),
  tailor_id uuid NOT NULL,
  delegated_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  priority text NOT NULL DEFAULT 'normal',
  deadline date,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  tailor_notes text,
  admin_notes text,
  quality_rating integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage delegations" ON public.order_delegations
  FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tailors can view and update own delegations" ON public.order_delegations
  FOR ALL TO authenticated
  USING (tailor_id = auth.uid())
  WITH CHECK (tailor_id = auth.uid());

-- Add updated_at triggers
CREATE TRIGGER update_embed_configurations_updated_at BEFORE UPDATE ON public.embed_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tailor_contracts_updated_at BEFORE UPDATE ON public.tailor_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_payments_updated_at BEFORE UPDATE ON public.contract_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_delegations_updated_at BEFORE UPDATE ON public.order_delegations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
