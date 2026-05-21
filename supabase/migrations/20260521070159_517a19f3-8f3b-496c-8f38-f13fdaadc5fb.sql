
-- profiles.access_status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'active'
    CHECK (access_status IN ('pending','active','suspended'));

-- organizations.verification_submitted_at
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- deployment_jobs
CREATE TABLE IF NOT EXISTS public.deployment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('github_push','pwa_sync','site_publish')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','dead','cancelled')),
  attempt int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deployment_jobs_org_idx ON public.deployment_jobs(org_id);
CREATE INDEX IF NOT EXISTS deployment_jobs_status_idx ON public.deployment_jobs(status, next_attempt_at);
ALTER TABLE public.deployment_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins manage deployment jobs" ON public.deployment_jobs;
CREATE POLICY "Super admins manage deployment jobs" ON public.deployment_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));
DROP POLICY IF EXISTS "Org admins view own deployment jobs" ON public.deployment_jobs;
CREATE POLICY "Org admins view own deployment jobs" ON public.deployment_jobs
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id));
DROP POLICY IF EXISTS "Org admins enqueue own deployment jobs" ON public.deployment_jobs;
CREATE POLICY "Org admins enqueue own deployment jobs" ON public.deployment_jobs
  FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id));
CREATE TRIGGER deployment_jobs_set_updated_at
  BEFORE UPDATE ON public.deployment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- dns_record_audit
CREATE TABLE IF NOT EXISTS public.dns_record_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid,
  domain text NOT NULL,
  record_type text NOT NULL,
  name text NOT NULL,
  old_value text,
  new_value text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dns_record_audit_record_idx ON public.dns_record_audit(record_id);
ALTER TABLE public.dns_record_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins read dns audit" ON public.dns_record_audit;
CREATE POLICY "Super admins read dns audit" ON public.dns_record_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

-- dns_propagation_checks
CREATE TABLE IF NOT EXISTS public.dns_propagation_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid,
  resolver text NOT NULL,
  resolver_label text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  found_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  matched boolean NOT NULL DEFAULT false,
  latency_ms int,
  error text
);
CREATE INDEX IF NOT EXISTS dns_prop_record_idx ON public.dns_propagation_checks(record_id, checked_at DESC);
ALTER TABLE public.dns_propagation_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins read dns prop" ON public.dns_propagation_checks;
CREATE POLICY "Super admins read dns prop" ON public.dns_propagation_checks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

-- verification_provider_test_log
CREATE TABLE IF NOT EXISTS public.verification_provider_test_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  environment text,
  success boolean NOT NULL,
  status_code int,
  latency_ms int,
  message text,
  tested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_provider_test_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins read provider tests" ON public.verification_provider_test_log;
CREATE POLICY "Super admins read provider tests" ON public.verification_provider_test_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));
DROP POLICY IF EXISTS "Super admins insert provider tests" ON public.verification_provider_test_log;
CREATE POLICY "Super admins insert provider tests" ON public.verification_provider_test_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));
