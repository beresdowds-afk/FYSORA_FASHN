
-- Message archives table for customer care compliance and long-term storage
CREATE TABLE public.message_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL DEFAULT 'outbound',
  sender_type TEXT NOT NULL DEFAULT 'system',
  sender_id TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'customer',
  recipient_id TEXT,
  recipient_contact TEXT,
  event_type TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  external_id TEXT,
  provider TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_archives ENABLE ROW LEVEL SECURITY;

-- Only super admins and org admins can read archives
CREATE POLICY "Super admins can read all archives"
  ON public.message_archives FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can read own org archives"
  ON public.message_archives FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- Index for performance
CREATE INDEX idx_message_archives_org_id ON public.message_archives(org_id);
CREATE INDEX idx_message_archives_channel ON public.message_archives(channel);
CREATE INDEX idx_message_archives_created_at ON public.message_archives(created_at DESC);
CREATE INDEX idx_message_archives_recipient_contact ON public.message_archives(recipient_contact);

-- Auto-archive trigger: copies message_logs entries to archives
CREATE OR REPLACE FUNCTION public.archive_message_log()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.message_archives (
    original_message_id, org_id, channel, direction, sender_type,
    recipient_type, recipient_id, recipient_contact, event_type,
    subject, body, status, error_message, external_id, sent_at
  ) VALUES (
    NEW.id, NEW.org_id, NEW.channel, 'outbound', 'system',
    NEW.recipient_type, NEW.recipient_id, NEW.recipient_contact, NEW.event_type,
    NEW.subject, NEW.body, NEW.status, NEW.error_message, NEW.external_id, NEW.sent_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_archive_message_log
  AFTER INSERT ON public.message_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_message_log();

-- Also archive inbound messages
CREATE OR REPLACE FUNCTION public.archive_inbound_message()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.message_archives (
    original_message_id, org_id, channel, direction, sender_type,
    sender_id, recipient_type, recipient_contact, body, status, sent_at
  ) VALUES (
    NEW.id, NEW.org_id, NEW.channel, 'inbound', 'customer',
    NEW.from_number, 'org_admin', NEW.to_number, NEW.body, 'delivered', NEW.created_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_archive_inbound_message
  AFTER INSERT ON public.inbound_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_inbound_message();

-- Enable realtime for message_archives
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_archives;
