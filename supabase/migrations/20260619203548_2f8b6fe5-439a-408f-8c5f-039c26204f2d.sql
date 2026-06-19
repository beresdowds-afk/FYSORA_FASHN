
-- 1) Extend claim status enum
ALTER TYPE public.insurance_claim_status ADD VALUE IF NOT EXISTS 'evidence_requested';

-- 2) Evidence scan tracking columns on claims
ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS evidence_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (evidence_status IN ('pending','scanning','clean','infected','failed','skipped')),
  ADD COLUMN IF NOT EXISTS evidence_scan JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3) Realtime: full row payloads + add to publication
ALTER TABLE public.insurance_claims REPLICA IDENTITY FULL;
ALTER TABLE public.insurance_claim_actions REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='insurance_claims') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_claims';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='insurance_claim_actions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_claim_actions';
  END IF;
END $$;

-- 4) Server-driven status transition RPC (admin-only) with audit action row
CREATE OR REPLACE FUNCTION public.transition_insurance_claim(
  _claim_id UUID,
  _new_status TEXT,
  _notes TEXT DEFAULT NULL,
  _amount_approved NUMERIC DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _old public.insurance_claims%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_role(_uid,'super_admin') OR public.has_role(_uid,'super_assistant')) THEN
    PERFORM public.log_admin_access_violation('transition_insurance_claim');
    RAISE EXCEPTION 'super_admin role required' USING ERRCODE='insufficient_privilege';
  END IF;

  IF _new_status NOT IN ('submitted','reviewing','evidence_requested','approved','partial_approved','rejected','paid','expired','cancelled') THEN
    RAISE EXCEPTION 'Invalid status %', _new_status;
  END IF;

  SELECT * INTO _old FROM public.insurance_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;

  UPDATE public.insurance_claims SET
    status = _new_status::insurance_claim_status,
    amount_approved = COALESCE(_amount_approved, amount_approved),
    reviewed_by = CASE WHEN _new_status IN ('reviewing','approved','partial_approved','rejected','evidence_requested')
                       THEN _uid ELSE reviewed_by END,
    reviewed_at = CASE WHEN _new_status IN ('reviewing','approved','partial_approved','rejected','evidence_requested')
                       THEN now() ELSE reviewed_at END,
    approved_at = CASE WHEN _new_status IN ('approved','partial_approved') THEN now() ELSE approved_at END,
    paid_at     = CASE WHEN _new_status = 'paid' THEN now() ELSE paid_at END,
    rejection_reason  = CASE WHEN _new_status = 'rejected' THEN COALESCE(_notes, rejection_reason) ELSE rejection_reason END,
    resolution_notes  = CASE WHEN _new_status IN ('approved','partial_approved','paid') THEN COALESCE(_notes, resolution_notes) ELSE resolution_notes END,
    updated_at = now()
  WHERE id = _claim_id;

  INSERT INTO public.insurance_claim_actions
    (claim_id, action_type, description, performed_by, metadata)
  VALUES
    (_claim_id, _new_status, _notes, _uid,
     jsonb_build_object('from', _old.status, 'to', _new_status, 'amount_approved', _amount_approved));

  RETURN jsonb_build_object('ok', true, 'from', _old.status, 'to', _new_status);
END;$$;

REVOKE ALL ON FUNCTION public.transition_insurance_claim(uuid,text,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_insurance_claim(uuid,text,text,numeric) TO authenticated;

-- 5) Evidence scan update RPC (admin only) — flips evidence_status + per-file results
CREATE OR REPLACE FUNCTION public.update_claim_evidence_scan(
  _claim_id UUID,
  _status TEXT,
  _scan JSONB DEFAULT '[]'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_role(_uid,'super_admin') OR public.has_role(_uid,'super_assistant')) THEN
    PERFORM public.log_admin_access_violation('update_claim_evidence_scan');
    RAISE EXCEPTION 'super_admin role required' USING ERRCODE='insufficient_privilege';
  END IF;
  IF _status NOT IN ('pending','scanning','clean','infected','failed','skipped') THEN
    RAISE EXCEPTION 'Invalid evidence_status %', _status;
  END IF;
  UPDATE public.insurance_claims
     SET evidence_status = _status,
         evidence_scan = COALESCE(_scan, evidence_scan),
         updated_at = now()
   WHERE id = _claim_id;
END;$$;

REVOKE ALL ON FUNCTION public.update_claim_evidence_scan(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_claim_evidence_scan(uuid,text,jsonb) TO authenticated;
