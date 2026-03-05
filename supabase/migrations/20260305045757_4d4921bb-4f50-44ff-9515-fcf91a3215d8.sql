
-- Enhance website_builder_requests with dashboard fields
ALTER TABLE public.website_builder_requests
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS launched_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS implementation_notes text,
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid;

-- Admin audit log for website requests
CREATE TABLE IF NOT EXISTS public.website_request_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.website_builder_requests(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_request_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage audit log"
  ON public.website_request_audit_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_wra_request_id ON public.website_request_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_wbr_status ON public.website_builder_requests(status);
CREATE INDEX IF NOT EXISTS idx_wbr_priority ON public.website_builder_requests(priority);
