
CREATE TABLE IF NOT EXISTS public.platform_dns_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  record_type TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '@',
  value TEXT NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 3600,
  priority INTEGER,
  purpose TEXT,
  provider_hint TEXT,
  is_managed BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_dns_records_domain ON public.platform_dns_records(domain);

ALTER TABLE public.platform_dns_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage platform DNS records"
ON public.platform_dns_records
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'super_assistant'));

CREATE TRIGGER update_platform_dns_records_updated_at
BEFORE UPDATE ON public.platform_dns_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
