
-- MCP worker configuration per organization
CREATE TABLE public.mcp_worker_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  mcp_server_url TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  event_routing JSONB DEFAULT '{}',
  auth_method TEXT DEFAULT 'bearer',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

-- Event log for MCP interactions
CREATE TABLE public.mcp_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  mcp_tool_name TEXT,
  mcp_response JSONB,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.mcp_worker_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_event_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for mcp_worker_config
CREATE POLICY "Org admins can manage MCP config"
  ON public.mcp_worker_config FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Super admins can manage all MCP configs"
  ON public.mcp_worker_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS policies for mcp_event_log
CREATE POLICY "Org admins can view event logs"
  ON public.mcp_event_log FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Super admins can view all event logs"
  ON public.mcp_event_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_mcp_worker_config_updated_at
  BEFORE UPDATE ON public.mcp_worker_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast event lookups
CREATE INDEX idx_mcp_event_log_org_id ON public.mcp_event_log(org_id);
CREATE INDEX idx_mcp_event_log_status ON public.mcp_event_log(status);
CREATE INDEX idx_mcp_event_log_event_type ON public.mcp_event_log(event_type);
