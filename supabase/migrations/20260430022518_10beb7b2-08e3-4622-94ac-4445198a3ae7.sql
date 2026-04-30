
-- =========================
-- 1. Alert settings (singleton)
-- =========================
CREATE TABLE IF NOT EXISTS public.sentinel_alert_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  agent_stuck_after_minutes INTEGER NOT NULL DEFAULT 30,
  agent_failure_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  shield_stuck_after_minutes INTEGER NOT NULL DEFAULT 30,
  notify_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.sentinel_alert_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sentinel_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage alert settings"
ON public.sentinel_alert_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================
-- 2. Idempotency keys for activation requests
-- =========================
ALTER TABLE public.sentinel_shield_activation
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sentinel_shield_idem_key
  ON public.sentinel_shield_activation(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.sentinel_platform_agents
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sentinel_agents_idem_key
  ON public.sentinel_platform_agents(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =========================
-- 3. Storage entitlements
-- =========================
CREATE TABLE IF NOT EXISTS public.sentinel_storage_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.sentinel_mcp_user_subscriptions(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('organization','designer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','provisioning','active','suspended','revoked','failed')),
  included_gb NUMERIC(10,2) NOT NULL DEFAULT 50,
  overage_per_gb_usd NUMERIC(10,4) NOT NULL DEFAULT 0.025,
  base_monthly_usd NUMERIC(10,2) NOT NULL DEFAULT 12.00,
  current_usage_bytes BIGINT NOT NULL DEFAULT 0,
  current_object_count INTEGER NOT NULL DEFAULT 0,
  provider_buckets JSONB NOT NULL DEFAULT '{}'::jsonb,
  provisioning_response JSONB,
  provisioned_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  last_usage_calc_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_owner_ref CHECK (
    (owner_type = 'organization' AND org_id IS NOT NULL) OR
    (owner_type = 'designer' AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_storage_ent_per_org
  ON public.sentinel_storage_entitlements(org_id) WHERE owner_type = 'organization' AND status <> 'revoked';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_storage_ent_per_designer
  ON public.sentinel_storage_entitlements(user_id) WHERE owner_type = 'designer' AND status <> 'revoked';

ALTER TABLE public.sentinel_storage_entitlements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_storage_ent_updated
BEFORE UPDATE ON public.sentinel_storage_entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Super admins manage all storage entitlements"
ON public.sentinel_storage_entitlements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins read their org storage entitlement"
ON public.sentinel_storage_entitlements FOR SELECT TO authenticated
USING (
  owner_type = 'organization' AND org_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org members read their org storage entitlement"
ON public.sentinel_storage_entitlements FOR SELECT TO authenticated
USING (
  owner_type = 'organization' AND org_id IS NOT NULL
  AND public.is_org_member(auth.uid(), org_id)
);

CREATE POLICY "Designers read their own storage entitlement"
ON public.sentinel_storage_entitlements FOR SELECT TO authenticated
USING (owner_type = 'designer' AND user_id = auth.uid());

-- Authorization trigger: only org_admin/manager OR the designer themselves OR system can write
CREATE OR REPLACE FUNCTION public.enforce_storage_entitlement_authorization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  -- System-level inserts (no JWT) bypass — used by the subscription trigger
  IF _uid IS NULL THEN RETURN NEW; END IF;

  -- Super admins always allowed
  IF public.has_role(_uid, 'super_admin') THEN RETURN NEW; END IF;

  IF NEW.owner_type = 'organization' THEN
    IF NEW.org_id IS NULL OR NOT public.is_org_admin(_uid, NEW.org_id) THEN
      RAISE EXCEPTION 'Only org_admin or manager roles may manage Multi-Cloud Storage entitlements for this organization.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF NEW.owner_type = 'designer' THEN
    IF NEW.user_id IS DISTINCT FROM _uid AND NOT public.has_role(_uid, 'designer') THEN
      RAISE EXCEPTION 'Only the owning designer may manage their Multi-Cloud Storage entitlement.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_storage_ent_auth
BEFORE INSERT OR UPDATE ON public.sentinel_storage_entitlements
FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_entitlement_authorization();

-- =========================
-- 4. Storage objects (file metadata)
-- =========================
CREATE TABLE IF NOT EXISTS public.sentinel_storage_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES public.sentinel_storage_entitlements(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_objects_entitlement ON public.sentinel_storage_objects(entitlement_id);

ALTER TABLE public.sentinel_storage_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all storage objects"
ON public.sentinel_storage_objects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners read storage objects in their entitlement"
ON public.sentinel_storage_objects FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id = entitlement_id AND (
      (e.owner_type = 'organization' AND public.is_org_member(auth.uid(), e.org_id))
      OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Owners insert storage objects in their entitlement"
ON public.sentinel_storage_objects FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id = entitlement_id AND e.status = 'active' AND (
      (e.owner_type = 'organization' AND public.is_org_admin(auth.uid(), e.org_id))
      OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Owners delete storage objects in their entitlement"
ON public.sentinel_storage_objects FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id = entitlement_id AND (
      (e.owner_type = 'organization' AND public.is_org_admin(auth.uid(), e.org_id))
      OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
    )
  )
);

-- =========================
-- 5. Usage ledger (per billing cycle)
-- =========================
CREATE TABLE IF NOT EXISTS public.sentinel_storage_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES public.sentinel_storage_entitlements(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  peak_bytes BIGINT NOT NULL DEFAULT 0,
  avg_bytes BIGINT NOT NULL DEFAULT 0,
  included_gb NUMERIC(10,2) NOT NULL,
  overage_gb NUMERIC(10,4) NOT NULL DEFAULT 0,
  base_charge_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  overage_charge_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  total_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','invoiced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_ledger_entitlement_period
  ON public.sentinel_storage_usage_ledger(entitlement_id, period_start DESC);

ALTER TABLE public.sentinel_storage_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_storage_ledger_updated
BEFORE UPDATE ON public.sentinel_storage_usage_ledger
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Super admins manage storage usage ledger"
ON public.sentinel_storage_usage_ledger FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners read their storage usage ledger"
ON public.sentinel_storage_usage_ledger FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id = entitlement_id AND (
      (e.owner_type = 'organization' AND public.is_org_member(auth.uid(), e.org_id))
      OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
    )
  )
);

-- =========================
-- 6. Subscription -> entitlement provisioning trigger
-- =========================
CREATE OR REPLACE FUNCTION public.handle_storage_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _addon_key TEXT;
  _included NUMERIC(10,2);
  _overage NUMERIC(10,4);
  _base NUMERIC(10,2);
  _owner_type TEXT;
BEGIN
  SELECT addon_key,
         COALESCE((metadata->>'included_gb')::numeric, 50),
         COALESCE((metadata->>'overage_per_gb_usd')::numeric, 0.025),
         monthly_price_usd
    INTO _addon_key, _included, _overage, _base
    FROM public.sentinel_mcp_addons
   WHERE id = NEW.addon_id;

  IF _addon_key <> 'cloud_storage' THEN
    RETURN NEW;
  END IF;

  IF NEW.org_id IS NOT NULL THEN
    _owner_type := 'organization';
  ELSIF NEW.user_id IS NOT NULL THEN
    _owner_type := 'designer';
  ELSE
    RETURN NEW;
  END IF;

  -- On subscription create / activate -> ensure pending entitlement
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
    IF NEW.status IN ('pending','active') THEN
      INSERT INTO public.sentinel_storage_entitlements
        (subscription_id, org_id, user_id, owner_type, status,
         included_gb, overage_per_gb_usd, base_monthly_usd)
      VALUES
        (NEW.id, NEW.org_id, NEW.user_id, _owner_type, 'pending',
         _included, _overage, _base)
      ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.status IN ('cancelled','revoked','expired') THEN
      UPDATE public.sentinel_storage_entitlements
         SET status = 'revoked',
             revoked_at = now()
       WHERE subscription_id = NEW.id AND status <> 'revoked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_storage_sub_changes ON public.sentinel_mcp_user_subscriptions;
CREATE TRIGGER trg_handle_storage_sub_changes
AFTER INSERT OR UPDATE ON public.sentinel_mcp_user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_storage_subscription_changes();

-- =========================
-- 7. Storage bucket
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('sentinel-cloud-storage', 'sentinel-cloud-storage', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {entitlement_id}/{file_path}
CREATE POLICY "Sentinel storage: read own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sentinel-cloud-storage'
  AND EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id::text = (storage.foldername(name))[1]
      AND (
        (e.owner_type = 'organization' AND public.is_org_member(auth.uid(), e.org_id))
        OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'super_admin')
      )
  )
);

CREATE POLICY "Sentinel storage: upload to own active entitlement"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sentinel-cloud-storage'
  AND EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id::text = (storage.foldername(name))[1]
      AND e.status = 'active'
      AND (
        (e.owner_type = 'organization' AND public.is_org_admin(auth.uid(), e.org_id))
        OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
      )
  )
);

CREATE POLICY "Sentinel storage: delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sentinel-cloud-storage'
  AND EXISTS (
    SELECT 1 FROM public.sentinel_storage_entitlements e
    WHERE e.id::text = (storage.foldername(name))[1]
      AND (
        (e.owner_type = 'organization' AND public.is_org_admin(auth.uid(), e.org_id))
        OR (e.owner_type = 'designer' AND e.user_id = auth.uid())
      )
  )
);
