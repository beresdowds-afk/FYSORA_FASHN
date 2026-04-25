-- 1) Retry / backoff fields on the activation row
ALTER TABLE public.sentinel_shield_activation
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stuck_after_minutes INTEGER NOT NULL DEFAULT 30;

-- 2) Platform-only enforcement on sentinel_mcp_user_subscriptions
CREATE OR REPLACE FUNCTION public.enforce_sentinel_shield_platform_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _addon_key TEXT;
BEGIN
  SELECT addon_key INTO _addon_key
    FROM public.sentinel_mcp_addons
   WHERE id = NEW.addon_id;

  IF _addon_key = 'sentinel_shield_free' THEN
    RAISE EXCEPTION 'SENTINEL-SHIELD is a platform-only plan reserved for FYSORA FASHN and cannot be assigned to tailors, designers, organizations or customers. Subscribe to the paid Security Scans / Observability add-ons instead.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sentinel_shield_platform_only
  ON public.sentinel_mcp_user_subscriptions;
CREATE TRIGGER trg_enforce_sentinel_shield_platform_only
  BEFORE INSERT OR UPDATE ON public.sentinel_mcp_user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sentinel_shield_platform_only();

-- 3) Usage-based SEO billing: charge per completed SEO job
CREATE OR REPLACE FUNCTION public.bill_completed_seo_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rate NUMERIC(10,2);
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.billing_status <> 'charged' THEN

    SELECT COALESCE(per_request_price_usd, 2.50) INTO _rate
      FROM public.sentinel_mcp_addons
     WHERE addon_key = 'seo_optimization'
     LIMIT 1;
    IF _rate IS NULL THEN _rate := 2.50; END IF;

    INSERT INTO public.platform_fee_ledger (org_id, fee_type, amount, currency, status, order_id)
    VALUES (NEW.org_id, 'sentinel_seo_request', _rate, 'USD', 'charged', NULL);

    NEW.amount_usd := _rate;
    NEW.billing_status := 'charged';
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bill_completed_seo_request
  ON public.seo_optimization_requests;
CREATE TRIGGER trg_bill_completed_seo_request
  BEFORE UPDATE ON public.seo_optimization_requests
  FOR EACH ROW EXECUTE FUNCTION public.bill_completed_seo_request();

-- 4) RLS hardening on seo_optimization_requests
ALTER TABLE public.seo_optimization_requests
  ALTER COLUMN requester_id SET DEFAULT auth.uid();

-- (Existing INSERT policy already enforces requester_id = auth.uid(); leave as-is.)

-- 5) Tighten sentinel_mcp_user_subscriptions visibility — drop overly broad SELECT
--    and re-create with explicit tenant scoping (functionally same, kept explicit).
DROP POLICY IF EXISTS "Users see own subscriptions" ON public.sentinel_mcp_user_subscriptions;
CREATE POLICY "Users see only their own entitlements"
  ON public.sentinel_mcp_user_subscriptions FOR SELECT
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
    OR public.has_role(auth.uid(), 'super_admin')
  );