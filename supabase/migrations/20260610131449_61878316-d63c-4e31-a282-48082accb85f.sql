
ALTER TABLE public.org_webhook_deliveries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS org_webhook_deliveries_idem_idx
  ON public.org_webhook_deliveries (webhook_id, idempotency_key);
