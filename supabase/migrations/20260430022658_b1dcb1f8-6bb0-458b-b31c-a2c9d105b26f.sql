
CREATE UNIQUE INDEX IF NOT EXISTS uniq_storage_ledger_period
  ON public.sentinel_storage_usage_ledger(entitlement_id, period_start);
