
-- ============================================
-- INBOUND MESSAGES TABLE
-- ============================================
CREATE TABLE public.inbound_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  thread_id uuid,
  message_sid text,
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text DEFAULT '',
  channel text NOT NULL DEFAULT 'sms',
  num_media integer DEFAULT 0,
  media_urls jsonb DEFAULT '[]'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  raw_event jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbound messages"
  ON public.inbound_messages FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert inbound messages"
  ON public.inbound_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org admins can update inbound messages"
  ON public.inbound_messages FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_inbound_messages_org_id ON public.inbound_messages(org_id);
CREATE INDEX idx_inbound_messages_thread_id ON public.inbound_messages(thread_id);
CREATE INDEX idx_inbound_messages_from ON public.inbound_messages(from_number);

-- ============================================
-- OUTBOUND MESSAGES TABLE
-- ============================================
CREATE TABLE public.outbound_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  thread_id uuid,
  to_number text NOT NULL,
  from_number text,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  status text NOT NULL DEFAULT 'queued',
  priority text NOT NULL DEFAULT 'normal',
  is_auto_reply boolean NOT NULL DEFAULT false,
  in_reply_to uuid,
  twilio_sid text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view outbound messages"
  ON public.outbound_messages FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org members can insert outbound messages"
  ON public.outbound_messages FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert outbound messages"
  ON public.outbound_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org admins can update outbound messages"
  ON public.outbound_messages FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_outbound_messages_org_id ON public.outbound_messages(org_id);
CREATE INDEX idx_outbound_messages_status ON public.outbound_messages(status);
CREATE INDEX idx_outbound_messages_thread_id ON public.outbound_messages(thread_id);

-- ============================================
-- MESSAGE THREADS TABLE
-- ============================================
CREATE TABLE public.message_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  customer_number text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  message_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  last_message_at timestamp with time zone DEFAULT now(),
  last_message_preview text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view threads"
  ON public.message_threads FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert threads"
  ON public.message_threads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update threads"
  ON public.message_threads FOR UPDATE
  USING (true);

CREATE INDEX idx_message_threads_org_id ON public.message_threads(org_id);
CREATE INDEX idx_message_threads_customer ON public.message_threads(org_id, customer_number, channel);

-- ============================================
-- MESSAGE ROUTING RULES TABLE
-- ============================================
CREATE TABLE public.message_routing_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  description text,
  condition_type text NOT NULL DEFAULT 'always',
  action_type text NOT NULL DEFAULT 'dashboard',
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  keywords text[] DEFAULT '{}',
  time_type text,
  start_time text,
  end_time text,
  channel text,
  sentiment text,
  history_type text,
  auto_response text,
  forward_to text,
  webhook_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage routing rules"
  ON public.message_routing_rules FOR ALL
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org members can view routing rules"
  ON public.message_routing_rules FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_routing_rules_org_id ON public.message_routing_rules(org_id);

-- ============================================
-- OPT-OUT REGISTRY TABLE
-- ============================================
CREATE TABLE public.opt_out_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  customer_number text NOT NULL,
  status text NOT NULL DEFAULT 'opted_out',
  opted_out_at timestamp with time zone DEFAULT now(),
  opted_in_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.opt_out_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage opt-outs"
  ON public.opt_out_registry FOR ALL
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert opt-outs"
  ON public.opt_out_registry FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org members can view opt-outs"
  ON public.opt_out_registry FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_opt_out_org_customer ON public.opt_out_registry(org_id, customer_number);

-- ============================================
-- ORG PHONE NUMBERS TABLE
-- ============================================
CREATE TABLE public.org_phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  phone_number text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'both',
  status text NOT NULL DEFAULT 'active',
  messaging_service_sid text,
  assigned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.org_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage phone numbers"
  ON public.org_phone_numbers FOR ALL
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org members can view phone numbers"
  ON public.org_phone_numbers FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Enable realtime for threads and inbound messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbound_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;

-- Add foreign key from inbound/outbound to threads
ALTER TABLE public.inbound_messages
  ADD CONSTRAINT inbound_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id);

ALTER TABLE public.outbound_messages
  ADD CONSTRAINT outbound_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id);
