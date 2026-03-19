
CREATE TABLE public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invoice_number text NOT NULL,
  invoice_type text NOT NULL DEFAULT 'subscription',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  gateway_reference text,
  related_entity_type text,
  related_entity_id uuid,
  waiver_reason text,
  paid_at timestamptz,
  due_date timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invoices"
  ON public.subscription_invoices FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage invoices"
  ON public.subscription_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can insert invoices"
  ON public.subscription_invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE SEQUENCE IF NOT EXISTS subscription_invoice_seq START 1001;

CREATE TRIGGER update_subscription_invoices_updated_at
  BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
