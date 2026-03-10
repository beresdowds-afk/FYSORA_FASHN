
-- WhatChimp API keys per org and per tailor
CREATE TABLE public.whatchimp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'organization' CHECK (owner_type IN ('organization', 'tailor')),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  whatsapp_number TEXT,
  is_active BOOLEAN DEFAULT true,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, owner_type)
);

ALTER TABLE public.whatchimp_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all whatchimp keys"
  ON public.whatchimp_api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage org whatchimp keys"
  ON public.whatchimp_api_keys FOR ALL TO authenticated
  USING (
    owner_type = 'organization' AND org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id)
  );

CREATE POLICY "Tailors can manage own whatchimp keys"
  ON public.whatchimp_api_keys FOR ALL TO authenticated
  USING (owner_type = 'tailor' AND owner_id = auth.uid());

-- Platform phone numbers (linked to admin asset management)
CREATE TABLE public.platform_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_label TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '+234 XX XXX XXXX',
  provider TEXT NOT NULL DEFAULT 'termii' CHECK (provider IN ('termii', 'twilio', 'carrier', 'whatchimp')),
  number_type TEXT NOT NULL DEFAULT 'sms' CHECK (number_type IN ('sms', 'voice', 'whatsapp', 'all')),
  country_code TEXT DEFAULT 'NG',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  forwarding_config JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage phone numbers"
  ON public.platform_phone_numbers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view active phone numbers"
  ON public.platform_phone_numbers FOR SELECT TO authenticated
  USING (is_active = true);

-- Termii campaigns
CREATE TABLE public.termii_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'sms' CHECK (campaign_type IN ('sms', 'whatsapp', 'voice')),
  message_template TEXT NOT NULL,
  sender_id TEXT,
  phonebook_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  cost_amount NUMERIC(10,2) DEFAULT 0,
  cost_currency TEXT DEFAULT 'NGN',
  termii_campaign_id TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.termii_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaigns"
  ON public.termii_campaigns FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage campaigns"
  ON public.termii_campaigns FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- Termii contacts/phonebooks
CREATE TABLE public.termii_phonebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  phonebook_name TEXT NOT NULL,
  termii_phonebook_id TEXT,
  contact_count INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.termii_phonebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view phonebooks"
  ON public.termii_phonebooks FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage phonebooks"
  ON public.termii_phonebooks FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- Comms health/monitoring
CREATE TABLE public.comms_provider_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('termii', 'twilio', 'whatchimp', 'carrier')),
  status TEXT DEFAULT 'unknown' CHECK (status IN ('connected', 'disconnected', 'degraded', 'unknown')),
  latency_ms INTEGER,
  balance_amount NUMERIC(12,2),
  balance_currency TEXT DEFAULT 'NGN',
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider)
);

ALTER TABLE public.comms_provider_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage provider status"
  ON public.comms_provider_status FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view provider status"
  ON public.comms_provider_status FOR SELECT TO authenticated
  USING (true);

-- Seed initial provider status rows
INSERT INTO public.comms_provider_status (provider, status) VALUES
  ('termii', 'unknown'),
  ('twilio', 'unknown'),
  ('whatchimp', 'unknown'),
  ('carrier', 'unknown');

-- Seed placeholder phone numbers
INSERT INTO public.platform_phone_numbers (number_label, phone_number, provider, number_type, country_code, is_primary, notes) VALUES
  ('Termii Primary SMS Line', '+234 XX XXX XXXX', 'termii', 'sms', 'NG', true, 'Primary SMS gateway — update in Platform Assets'),
  ('Nigerian Carrier (WhatsApp)', '+234 80X XXX XXXX', 'carrier', 'whatsapp', 'NG', false, 'WhatsApp Business line — update in Platform Assets'),
  ('Twilio Voice Line', '+1 XXX XXX XXXX', 'twilio', 'voice', 'US', false, 'International VoIP line — update in Platform Assets'),
  ('WhatChimp WhatsApp', '+234 XX XXX XXXX', 'whatchimp', 'whatsapp', 'NG', false, 'WhatChimp managed WhatsApp — update in Platform Assets');
