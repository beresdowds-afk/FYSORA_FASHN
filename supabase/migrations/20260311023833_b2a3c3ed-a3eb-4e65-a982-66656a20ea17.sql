
-- 1. COMMS TOKEN RATES (tiered billing)
CREATE TABLE public.comms_token_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  provider TEXT,
  tokens_per_unit NUMERIC NOT NULL DEFAULT 1,
  unit_label TEXT NOT NULL DEFAULT 'message',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel, provider)
);
ALTER TABLE public.comms_token_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage token rates" ON public.comms_token_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated read token rates" ON public.comms_token_rates FOR SELECT TO authenticated USING (true);

INSERT INTO public.comms_token_rates (channel, provider, tokens_per_unit, unit_label, description) VALUES
  ('sms', 'termii', 1, 'message', '1 token per SMS (Africa via Termii)'),
  ('sms', 'twilio', 2, 'message', '2 tokens per SMS (International via Twilio)'),
  ('whatsapp', 'whatchimp', 2, 'message', '2 tokens per WhatsApp message'),
  ('whatsapp', 'termii', 2, 'message', '2 tokens per WhatsApp (Africa fallback)'),
  ('voip', 'twilio', 5, 'minute', '5 tokens per VoIP minute'),
  ('video_upload', NULL, 10, 'upload', '10 tokens per 5-second video upload');

-- 2. COMMS TOKEN USAGE LOG
CREATE TABLE public.comms_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.credit_wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  provider TEXT,
  tokens_consumed NUMERIC NOT NULL DEFAULT 0,
  units_used NUMERIC NOT NULL DEFAULT 1,
  rate_applied NUMERIC NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comms_token_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own usage" ON public.comms_token_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "System inserts usage" ON public.comms_token_usage FOR INSERT TO authenticated WITH CHECK (true);

-- 3. AUTO TOP-UP SETTINGS
CREATE TABLE public.wallet_auto_topup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.credit_wallets(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  threshold_balance NUMERIC DEFAULT 50,
  topup_amount NUMERIC DEFAULT 200,
  max_monthly_topups INTEGER DEFAULT 5,
  topups_this_month INTEGER DEFAULT 0,
  month_reset_at TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.wallet_auto_topup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wallet owners manage auto topup" ON public.wallet_auto_topup FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.credit_wallets w WHERE w.id = wallet_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.credit_wallets w WHERE w.id = wallet_id AND w.owner_id = auth.uid()));
CREATE POLICY "Super admins manage all auto topup" ON public.wallet_auto_topup FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. VIDEO BILLING
CREATE TABLE public.video_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  duration_seconds NUMERIC DEFAULT 5,
  tokens_charged NUMERIC NOT NULL DEFAULT 10,
  wallet_id UUID REFERENCES public.credit_wallets(id),
  catalogue_item_id UUID,
  media_group_id UUID,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own videos" ON public.video_uploads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
    OR (org_id IS NOT NULL AND public.is_org_member(auth.uid(), org_id)));
CREATE POLICY "Users insert own videos" ON public.video_uploads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own videos" ON public.video_uploads FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- 5. MEDIA GROUPS
CREATE TABLE public.media_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  catalogue_item_id UUID,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.media_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own groups" ON public.media_groups FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
    OR (org_id IS NOT NULL AND public.is_org_member(auth.uid(), org_id)))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.media_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.media_groups(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL,
  media_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  caption TEXT,
  video_upload_id UUID REFERENCES public.video_uploads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.media_group_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own group items" ON public.media_group_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.media_groups g WHERE g.id = group_id AND (g.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.media_groups g WHERE g.id = group_id AND g.user_id = auth.uid()));

-- 6. DOMAIN MANAGEMENT
CREATE TABLE public.domain_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  domain_type TEXT NOT NULL DEFAULT 'native',
  vendor TEXT DEFAULT 'platform',
  vendor_price NUMERIC DEFAULT 0,
  platform_price NUMERIC DEFAULT 15,
  annual_renewal_fee NUMERIC DEFAULT 15,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  gateway_reference TEXT,
  dns_records JSONB DEFAULT '[]'::jsonb,
  ssl_status TEXT DEFAULT 'pending',
  consent_given BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  provisioned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.domain_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own domain requests" ON public.domain_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id)));
CREATE POLICY "Users create own domain requests" ON public.domain_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage domains" ON public.domain_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());
CREATE POLICY "Admins delete domains" ON public.domain_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.domain_vendor_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  api_base_url TEXT,
  is_active BOOLEAN DEFAULT false,
  markup_percent NUMERIC DEFAULT 30,
  min_price NUMERIC DEFAULT 15,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.domain_vendor_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage vendor configs" ON public.domain_vendor_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated read vendor configs" ON public.domain_vendor_configs FOR SELECT TO authenticated USING (true);

INSERT INTO public.domain_vendor_configs (vendor_name, api_base_url, markup_percent, min_price, config)
VALUES ('namecheap', 'https://api.namecheap.com/xml.response', 30, 15, '{"sandbox": true}'::jsonb);

-- 7. PROVIDER ROUTING CONFIG
CREATE TABLE public.provider_routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  phone_number_id UUID REFERENCES public.platform_phone_numbers(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel)
);
ALTER TABLE public.provider_routing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage routing" ON public.provider_routing_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated read routing" ON public.provider_routing_config FOR SELECT TO authenticated USING (true);

INSERT INTO public.provider_routing_config (channel, provider, notes) VALUES
  ('whatsapp', 'whatchimp', 'Uses same local carrier number submitted to Twilio for SMS/OTP'),
  ('sms', 'termii', 'Separate number for SMS delivery'),
  ('voip', 'twilio', 'Different number from WhatsApp/SMS; used for voice calls');
