
-- Tenant registration table for external MCP clients
CREATE TABLE public.mcp_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  mode text NOT NULL DEFAULT 'single' CHECK (mode IN ('single', 'multi')),
  domains text[] NOT NULL DEFAULT '{}',
  base_url text,
  rate_limit_per_min integer NOT NULL DEFAULT 60,
  api_key_hash text,
  api_key_prefix text,
  allowed_tools text[] DEFAULT NULL,
  blocked_tools text[] DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  registered_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mcp_tenants ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage tenants
CREATE POLICY "Super admins can manage tenants"
  ON public.mcp_tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Webhook registrations per tenant
CREATE TABLE public.mcp_tenant_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.mcp_tenants(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mcp_tenant_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage webhooks"
  ON public.mcp_tenant_webhooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Tenant usage tracking
CREATE TABLE public.mcp_tenant_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.mcp_tenants(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  tool_name text,
  status text DEFAULT 'completed',
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mcp_tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view usage"
  ON public.mcp_tenant_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service can insert usage"
  ON public.mcp_tenant_usage FOR INSERT TO authenticated
  WITH CHECK (true);

-- Updated timestamp trigger for tenants
CREATE TRIGGER update_mcp_tenants_updated_at
  BEFORE UPDATE ON public.mcp_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mcp_tenant_webhooks_updated_at
  BEFORE UPDATE ON public.mcp_tenant_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
