-- Inbound webhook event log
CREATE TABLE IF NOT EXISTS public.webhook_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'whatchimp', 'termii')),
  event_type TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  signature_reason TEXT,
  external_id TEXT,
  call_sid TEXT,
  message_sid TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  org_id UUID,
  processing_notes TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_log_provider_received
  ON public.webhook_event_log (provider, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_call_sid
  ON public.webhook_event_log (call_sid) WHERE call_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_message_sid
  ON public.webhook_event_log (message_sid) WHERE message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_external_id
  ON public.webhook_event_log (external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.webhook_event_log ENABLE ROW LEVEL SECURITY;

-- Only super admins / assistants can read the audit log; webhooks write as service role.
CREATE POLICY "Super admins can read webhook event log"
  ON public.webhook_event_log
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'super_assistant')
  );

-- Realtime feed for the Communications Hub panel
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_event_log;
