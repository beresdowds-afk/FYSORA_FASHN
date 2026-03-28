
-- Custom invoices table
CREATE TABLE public.custom_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'customer',
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_org_id UUID REFERENCES public.organizations(id),
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  due_date TIMESTAMPTZ,
  notes TEXT,
  payment_terms TEXT,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom invoice line items
CREATE TABLE public.custom_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.custom_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS: org admins and super admins can manage invoices for their org
CREATE POLICY "Org admins can manage their invoices"
  ON public.custom_invoices
  FOR ALL
  TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id)
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.is_org_admin(auth.uid(), org_id)
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Super admins can manage platform-level invoices (org_id IS NULL)
CREATE POLICY "Super admins can manage platform invoices"
  ON public.custom_invoices
  FOR ALL
  TO authenticated
  USING (
    org_id IS NULL AND public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    org_id IS NULL AND public.has_role(auth.uid(), 'super_admin')
  );

-- RLS for invoice items: same access as parent invoice
CREATE POLICY "Users can manage invoice items via invoice access"
  ON public.custom_invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_invoices ci
      WHERE ci.id = invoice_id
      AND (
        public.is_org_admin(auth.uid(), ci.org_id)
        OR public.has_role(auth.uid(), 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_invoices ci
      WHERE ci.id = invoice_id
      AND (
        public.is_org_admin(auth.uid(), ci.org_id)
        OR public.has_role(auth.uid(), 'super_admin')
      )
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_custom_invoices_updated_at
  BEFORE UPDATE ON public.custom_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for quick lookups
CREATE INDEX idx_custom_invoices_org_id ON public.custom_invoices(org_id);
CREATE INDEX idx_custom_invoices_status ON public.custom_invoices(status);
CREATE INDEX idx_custom_invoice_items_invoice_id ON public.custom_invoice_items(invoice_id);
