
-- Archive table for deactivated/deleted accounts with 365-day retention
CREATE TABLE public.account_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type text NOT NULL CHECK (account_type IN ('customer', 'tailor', 'organization')),
  account_id text NOT NULL,
  account_name text,
  account_email text,
  action text NOT NULL CHECK (action IN ('deactivated', 'deleted')),
  reason text,
  archived_data jsonb DEFAULT '{}'::jsonb,
  archived_by uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  org_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage archives"
  ON public.account_archives
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Add is_deactivated to profiles for soft-deleting user accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deactivated boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
