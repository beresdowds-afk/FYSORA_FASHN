
-- Org notification settings: toggles per channel, recipient config, branding
CREATE TABLE public.org_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Channel toggles
  email_enabled boolean NOT NULL DEFAULT false,
  sms_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  
  -- Recipient config: who gets notified
  notify_customer boolean NOT NULL DEFAULT true,
  notify_org_admin boolean NOT NULL DEFAULT true,
  notify_assigned_tailor boolean NOT NULL DEFAULT true,
  
  -- Branding
  brand_color text DEFAULT '#000000',
  email_footer_text text DEFAULT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(org_id)
);

ALTER TABLE public.org_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view notification settings"
  ON public.org_notification_settings FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can insert notification settings"
  ON public.org_notification_settings FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can update notification settings"
  ON public.org_notification_settings FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Message logs: track all sent notifications
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer', 'org_admin', 'tailor')),
  recipient_id uuid NOT NULL,
  recipient_contact text DEFAULT NULL, -- email/phone used
  
  event_type text NOT NULL, -- e.g. 'order_status_change', 'payment_received', 'due_date_reminder'
  subject text DEFAULT NULL,
  body text DEFAULT NULL,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message text DEFAULT NULL,
  external_id text DEFAULT NULL, -- provider message ID
  
  sent_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view message logs"
  ON public.message_logs FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert message logs"
  ON public.message_logs FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Updated_at trigger for notification settings
CREATE TRIGGER update_org_notification_settings_updated_at
  BEFORE UPDATE ON public.org_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for message_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
