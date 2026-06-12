
CREATE TABLE public.platform_category_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  slug_suggestion TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decision_notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  approved_category_id UUID REFERENCES public.platform_catalogue_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_category_requests TO authenticated;
GRANT ALL ON public.platform_category_requests TO service_role;

ALTER TABLE public.platform_category_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view own requests"
  ON public.platform_category_requests FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins create requests"
  ON public.platform_category_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) AND requested_by = auth.uid());

CREATE POLICY "Super admin updates requests"
  ON public.platform_category_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_pcr_updated BEFORE UPDATE ON public.platform_category_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
