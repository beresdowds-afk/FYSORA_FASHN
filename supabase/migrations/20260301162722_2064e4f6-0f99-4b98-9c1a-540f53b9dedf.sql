
-- Create call_logs table for VoIP call tracking
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  direction TEXT NOT NULL DEFAULT 'inbound', -- inbound | outbound
  call_sid TEXT,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated, ringing, in-progress, completed, busy, no-answer, canceled, failed
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_sid TEXT,
  ivr_path TEXT[], -- tracks which IVR menu options the caller navigated
  forwarded_to TEXT, -- number or member the call was forwarded to
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  caller_name TEXT,
  thread_id UUID REFERENCES public.message_threads(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view call logs"
  ON public.call_logs FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can update call logs"
  ON public.call_logs FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert call logs"
  ON public.call_logs FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_call_logs_org_id ON public.call_logs(org_id);
CREATE INDEX idx_call_logs_call_sid ON public.call_logs(call_sid);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
