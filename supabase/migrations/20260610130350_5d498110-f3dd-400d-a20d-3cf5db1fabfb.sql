-- Organization integration API keys (org -> calls FSA API)
CREATE TABLE public.org_integration_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['catalogue:read','orders:write'],
  environment text NOT NULL DEFAULT 'live',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX org_integration_api_keys_hash_idx ON public.org_integration_api_keys(key_hash);
CREATE INDEX org_integration_api_keys_org_idx ON public.org_integration_api_keys(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_integration_api_keys TO authenticated;
GRANT ALL ON public.org_integration_api_keys TO service_role;
ALTER TABLE public.org_integration_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage own integration keys"
  ON public.org_integration_api_keys FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_org_integration_api_keys_updated
  BEFORE UPDATE ON public.org_integration_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outbound webhooks (FSA -> org)
CREATE TABLE public.org_outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  description text,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  last_status int,
  failure_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX org_outbound_webhooks_org_idx ON public.org_outbound_webhooks(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_outbound_webhooks TO authenticated;
GRANT ALL ON public.org_outbound_webhooks TO service_role;
ALTER TABLE public.org_outbound_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage own webhooks"
  ON public.org_outbound_webhooks FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_org_outbound_webhooks_updated
  BEFORE UPDATE ON public.org_outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook delivery log
CREATE TABLE public.org_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.org_outbound_webhooks(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  request_id text NOT NULL,
  response_status int,
  response_body text,
  succeeded boolean NOT NULL DEFAULT false,
  duration_ms int,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX org_webhook_deliveries_org_idx ON public.org_webhook_deliveries(org_id, attempted_at DESC);
CREATE INDEX org_webhook_deliveries_webhook_idx ON public.org_webhook_deliveries(webhook_id, attempted_at DESC);

GRANT SELECT ON public.org_webhook_deliveries TO authenticated;
GRANT ALL ON public.org_webhook_deliveries TO service_role;
ALTER TABLE public.org_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view own webhook deliveries"
  ON public.org_webhook_deliveries FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));
