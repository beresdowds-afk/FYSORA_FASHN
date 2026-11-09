-- Idempotency for call billing: at most one pending/charged record per call.
-- Failed records are excluded so a call can be retried after a failure.
CREATE UNIQUE INDEX IF NOT EXISTS call_billing_records_call_log_active_uniq
  ON public.call_billing_records (call_log_id)
  WHERE call_log_id IS NOT NULL AND billing_status IN ('pending', 'charged');
