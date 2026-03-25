
-- Channel routing configuration table for business process mapping
CREATE TABLE IF NOT EXISTS public.channel_routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  primary_channel TEXT NOT NULL DEFAULT 'sms',
  secondary_channel TEXT,
  provider TEXT NOT NULL DEFAULT 'termii',
  fallback_channel TEXT,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  routing_conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_routing_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins manage channel routing" ON public.channel_routing_config
  FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Members view channel routing" ON public.channel_routing_config
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

-- Comms usage analytics table
CREATE TABLE IF NOT EXISTS public.comms_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  call_minutes NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, channel, provider, period_start)
);

ALTER TABLE public.comms_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view comms analytics" ON public.comms_usage_analytics
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "System inserts comms analytics" ON public.comms_usage_analytics
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

-- Seed default business process routing for orgs
-- (will be inserted per-org on first access)

-- Add updated_at trigger
CREATE TRIGGER update_channel_routing_config_updated_at
  BEFORE UPDATE ON public.channel_routing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comms_usage_analytics_updated_at
  BEFORE UPDATE ON public.comms_usage_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
