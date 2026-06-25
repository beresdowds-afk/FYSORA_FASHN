
ALTER TABLE public.org_custom_hostnames
  ADD COLUMN IF NOT EXISTS cf_hostname_id text,
  ADD COLUMN IF NOT EXISTS cf_status text,
  ADD COLUMN IF NOT EXISTS cf_ssl_status text,
  ADD COLUMN IF NOT EXISTS cf_ownership_verification jsonb,
  ADD COLUMN IF NOT EXISTS cf_validation_records jsonb,
  ADD COLUMN IF NOT EXISTS cf_verification_errors jsonb,
  ADD COLUMN IF NOT EXISTS cf_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS cf_last_synced_at timestamptz;

-- Defensive cleanup: drop any remaining unscoped legacy storage policies
DROP POLICY IF EXISTS "Org members can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete assets" ON storage.objects;
