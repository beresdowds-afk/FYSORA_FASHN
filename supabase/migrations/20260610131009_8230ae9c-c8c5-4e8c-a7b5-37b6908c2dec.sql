
-- 1. Webhook delivery retry/DLQ fields
ALTER TABLE public.org_webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_delivery_id UUID REFERENCES public.org_webhook_deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS error TEXT;

CREATE INDEX IF NOT EXISTS org_webhook_deliveries_retry_idx
  ON public.org_webhook_deliveries (status, next_retry_at)
  WHERE status = 'pending_retry';

-- 2. Link webhooks to an API key (optional) for rotation cascade
ALTER TABLE public.org_outbound_webhooks
  ADD COLUMN IF NOT EXISTS linked_api_key_id UUID REFERENCES public.org_integration_api_keys(id) ON DELETE SET NULL;

-- 3. Atomic API key rotation
CREATE OR REPLACE FUNCTION public.rotate_org_api_key(
  _key_id UUID,
  _new_prefix TEXT,
  _new_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _old public.org_integration_api_keys%ROWTYPE;
  _new_id uuid;
  _linked_count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _old FROM public.org_integration_api_keys WHERE id = _key_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Key not found'; END IF;

  IF NOT (public.is_org_admin(_uid, _old.org_id) OR public.has_role(_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF _old.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Key already revoked';
  END IF;

  INSERT INTO public.org_integration_api_keys
    (org_id, name, key_prefix, key_hash, scopes, environment, created_by)
  VALUES
    (_old.org_id, _old.name || ' (rotated)', _new_prefix, _new_hash, _old.scopes, _old.environment, _uid)
  RETURNING id INTO _new_id;

  UPDATE public.org_outbound_webhooks
     SET linked_api_key_id = _new_id, updated_at = now()
   WHERE linked_api_key_id = _old.id
   RETURNING 1 INTO _linked_count;

  GET DIAGNOSTICS _linked_count = ROW_COUNT;

  UPDATE public.org_integration_api_keys
     SET revoked_at = now()
   WHERE id = _old.id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, 'api_key_rotated', 'org_integration_api_key', _old.id,
          jsonb_build_object('new_key_id', _new_id, 'webhooks_relinked', _linked_count, 'org_id', _old.org_id));

  RETURN jsonb_build_object('ok', true, 'new_key_id', _new_id, 'webhooks_relinked', _linked_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_org_api_key(UUID, TEXT, TEXT) TO authenticated, service_role;
