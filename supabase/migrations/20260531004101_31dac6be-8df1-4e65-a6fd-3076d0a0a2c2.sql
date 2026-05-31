
-- Account health reports (Worker #3)
CREATE TABLE public.account_health_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('tailor','designer','organization','customer')),
  subject_id uuid NOT NULL,
  subject_label text,
  status text NOT NULL CHECK (status IN ('healthy','degraded','broken')),
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues text[] NOT NULL DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ahr_subject ON public.account_health_reports(subject_type, subject_id, checked_at DESC);
CREATE INDEX idx_ahr_status ON public.account_health_reports(status, checked_at DESC);

GRANT SELECT ON public.account_health_reports TO authenticated;
GRANT ALL ON public.account_health_reports TO service_role;

ALTER TABLE public.account_health_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view all health reports"
  ON public.account_health_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

CREATE POLICY "Service role manages health reports"
  ON public.account_health_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- User-level fee exemptions (for designers, tailors, customers)
CREATE TABLE public.user_fee_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exemption_type text NOT NULL,
  reason text,
  granted_by text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exemption_type)
);
CREATE INDEX idx_ufe_user ON public.user_fee_exemptions(user_id) WHERE is_active = true;

GRANT SELECT ON public.user_fee_exemptions TO authenticated;
GRANT ALL ON public.user_fee_exemptions TO service_role;

ALTER TABLE public.user_fee_exemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own exemptions"
  ON public.user_fee_exemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins manage user exemptions"
  ON public.user_fee_exemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Track invoice generation for exemptions (idempotency)
ALTER TABLE public.org_fee_exemptions
  ADD COLUMN IF NOT EXISTS invoice_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

ALTER TABLE public.user_fee_exemptions
  ADD COLUMN IF NOT EXISTS invoice_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- Allow 'exemption_grant' as a fee_type and 'waived' status (status already allowed)
ALTER TABLE public.platform_fee_ledger DROP CONSTRAINT IF EXISTS platform_fee_ledger_fee_type_check;
ALTER TABLE public.platform_fee_ledger ADD CONSTRAINT platform_fee_ledger_fee_type_check
  CHECK (fee_type = ANY (ARRAY[
    'customer_surcharge','org_admin_fee','website_builder_lite','website_builder_pro',
    'website_builder_pro_lite','subscription','registration',
    'messaging_sms','messaging_whatsapp','messaging_email','sentinel_seo_request',
    'exemption_grant','mobile_app','custom_domain_external'
  ]));
