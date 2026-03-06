
-- VoIP Call Billing Records
CREATE TABLE public.call_billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  caller_user_id UUID NOT NULL,
  caller_type TEXT NOT NULL DEFAULT 'customer', -- customer, tailor
  wallet_id UUID REFERENCES public.credit_wallets(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  rate_per_minute NUMERIC NOT NULL DEFAULT 0.50,
  total_credits_charged NUMERIC NOT NULL DEFAULT 0,
  billing_status TEXT NOT NULL DEFAULT 'pending', -- pending, charged, failed, refunded
  call_type TEXT NOT NULL DEFAULT 'voip', -- voip, video, conference
  charged_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view call billing" ON public.call_billing_records
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage call billing" ON public.call_billing_records
  FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Callers can view own billing" ON public.call_billing_records
  FOR SELECT TO authenticated
  USING (caller_user_id = auth.uid());

-- Meeting Documents (assistant documentation)
CREATE TABLE public.meeting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'transcript', -- transcript, summary, action_items, notes
  content TEXT,
  ai_generated BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  duration_seconds INTEGER,
  participants JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meeting docs" ON public.meeting_documents
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can create meeting docs" ON public.meeting_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Creators and admins can update meeting docs" ON public.meeting_documents
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_org_admin(auth.uid(), org_id));

-- Platform Call Archives (central archive)
CREATE TABLE public.platform_call_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  billing_record_id UUID REFERENCES public.call_billing_records(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL,
  caller_type TEXT NOT NULL DEFAULT 'customer',
  call_type TEXT NOT NULL DEFAULT 'voip',
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_number TEXT,
  to_number TEXT,
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript_url TEXT,
  meeting_doc_id UUID REFERENCES public.meeting_documents(id) ON DELETE SET NULL,
  credits_charged NUMERIC DEFAULT 0,
  quality_score INTEGER, -- 1-5
  feedback_notes TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_call_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view archives" ON public.platform_call_archives
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Super admins can view all archives" ON public.platform_call_archives
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert archives" ON public.platform_call_archives
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- Triggers for updated_at
CREATE TRIGGER update_call_billing_records_updated_at
  BEFORE UPDATE ON public.call_billing_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_documents_updated_at
  BEFORE UPDATE ON public.meeting_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
