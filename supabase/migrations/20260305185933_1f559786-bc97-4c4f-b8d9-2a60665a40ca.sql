
-- Credit wallet for organizations and users
CREATE TABLE public.credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL DEFAULT 'org' CHECK (owner_type IN ('org', 'user')),
  owner_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  lifetime_purchased numeric NOT NULL DEFAULT 0,
  lifetime_used numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_type, owner_id)
);

-- Individual credit transactions with expiry (365 days per FASHN policy)
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.credit_wallets(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'purchase' CHECK (type IN ('purchase', 'deduction', 'refund', 'expiry', 'bonus')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  feature_type text,
  session_id uuid,
  description text,
  expires_at timestamptz DEFAULT (now() + interval '365 days'),
  expired boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI processing job queue
CREATE TABLE public.ai_job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('virtual_tryon', 'ai_measurement', 'garment_catalog_sync')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority integer NOT NULL DEFAULT 5,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_data jsonb,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  credits_cost numeric NOT NULL DEFAULT 0,
  credits_deducted boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tailor garment catalog for try-on
CREATE TABLE public.garment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  image_url text,
  price numeric,
  currency text DEFAULT 'NGN',
  tags text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  sync_to_website boolean NOT NULL DEFAULT false,
  sync_to_catalogue boolean NOT NULL DEFAULT false,
  tryon_enabled boolean NOT NULL DEFAULT true,
  tryon_count integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Download tracking
CREATE TABLE public.download_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('tryon_result', 'measurement_report', 'garment_image')),
  resource_id uuid,
  file_url text,
  credits_charged numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: credit_wallets
CREATE POLICY "Users can view own wallet" ON public.credit_wallets FOR SELECT
  USING (owner_id = auth.uid() OR (org_id IS NOT NULL AND is_org_member(auth.uid(), org_id)) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "System can manage wallets" ON public.credit_wallets FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id)));

-- RLS: credit_transactions  
CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.credit_wallets w WHERE w.id = wallet_id AND (w.owner_id = auth.uid() OR (w.org_id IS NOT NULL AND is_org_member(auth.uid(), w.org_id)) OR has_role(auth.uid(), 'super_admin'::app_role))));
CREATE POLICY "Admins can insert transactions" ON public.credit_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.credit_wallets w WHERE w.id = wallet_id AND (has_role(auth.uid(), 'super_admin'::app_role) OR (w.org_id IS NOT NULL AND is_org_admin(auth.uid(), w.org_id)))));

-- RLS: ai_job_queue
CREATE POLICY "Users can view own jobs" ON public.ai_job_queue FOR SELECT
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can create jobs" ON public.ai_job_queue FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "System can update jobs" ON public.ai_job_queue FOR UPDATE
  USING (user_id = auth.uid() OR is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: garment_catalog
CREATE POLICY "Anyone can view published garments" ON public.garment_catalog FOR SELECT
  USING (is_published = true OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Org members can manage garments" ON public.garment_catalog FOR ALL
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: download_tracking
CREATE POLICY "Users can view own downloads" ON public.download_tracking FOR SELECT
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "System can insert downloads" ON public.download_tracking FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create storage bucket for garment images
INSERT INTO storage.buckets (id, name, public) VALUES ('garment-images', 'garment-images', true) ON CONFLICT DO NOTHING;

-- Enable realtime for job queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_job_queue;
