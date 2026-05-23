
-- Reviewer tracking columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS verification_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_status_notes text,
  ADD COLUMN IF NOT EXISTS access_status_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS access_status_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_status_submitted_at timestamptz;

-- Admin decision RPC
CREATE OR REPLACE FUNCTION public.admin_set_verification_status(
  _target_type text,
  _target_id uuid,
  _decision text,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
  _old jsonb;
  _new jsonb;
  _user_id uuid;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  _is_admin := public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'super_assistant');
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only super admins may set verification status' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _decision NOT IN ('approved','rejected','info_requested','pending') THEN
    RAISE EXCEPTION 'Invalid decision %', _decision;
  END IF;

  IF _decision IN ('rejected','info_requested') AND (_notes IS NULL OR length(trim(_notes)) = 0) THEN
    RAISE EXCEPTION 'Notes are required when rejecting or requesting more info';
  END IF;

  IF _target_type = 'organization' THEN
    SELECT to_jsonb(o.*) INTO _old FROM public.organizations o WHERE id = _target_id;
    IF _old IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;

    UPDATE public.organizations SET
      business_reg_verification_status = _decision,
      business_reg_verified = (_decision = 'approved'),
      business_reg_verified_at = CASE WHEN _decision = 'approved' THEN now() ELSE business_reg_verified_at END,
      verification_notes = COALESCE(_notes, verification_notes),
      verification_reviewed_by = _uid,
      verification_reviewed_at = now()
    WHERE id = _target_id
    RETURNING to_jsonb(organizations.*), name INTO _new, _name;

    -- Notify org admins
    INSERT INTO public.notifications (org_id, user_id, title, message)
    SELECT _target_id, m.user_id,
           CASE _decision
             WHEN 'approved' THEN 'Business verification approved'
             WHEN 'rejected' THEN 'Business verification rejected'
             WHEN 'info_requested' THEN 'More information requested'
             ELSE 'Verification status updated' END,
           COALESCE(_notes,
             CASE _decision
               WHEN 'approved' THEN 'Your business registration has been approved. Dashboard access is now unlocked.'
               ELSE 'Your business verification status has been updated.' END)
    FROM public.org_members m
    WHERE m.org_id = _target_id AND m.role IN ('org_admin','manager') AND m.is_active = true;

  ELSIF _target_type = 'designer' THEN
    SELECT to_jsonb(p.*), id, display_name INTO _old, _user_id, _name
      FROM public.profiles p WHERE id = _target_id;
    IF _old IS NULL THEN RAISE EXCEPTION 'Designer profile not found'; END IF;

    UPDATE public.profiles SET
      access_status = _decision,
      access_status_notes = COALESCE(_notes, access_status_notes),
      access_status_reviewed_by = _uid,
      access_status_reviewed_at = now()
    WHERE id = _target_id
    RETURNING to_jsonb(profiles.*) INTO _new;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (_target_id,
      CASE _decision
        WHEN 'approved' THEN 'Designer access approved'
        WHEN 'rejected' THEN 'Designer access rejected'
        WHEN 'info_requested' THEN 'More information requested'
        ELSE 'Access status updated' END,
      COALESCE(_notes,
        CASE _decision
          WHEN 'approved' THEN 'Your designer account is approved. Portal access is now unlocked.'
          ELSE 'Your access status has been updated.' END));
  ELSE
    RAISE EXCEPTION 'Invalid target type %', _target_type;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES (_uid, 'verification_decision', _target_type, _target_id, _old, _new,
          jsonb_build_object('decision', _decision, 'notes', _notes));

  RETURN jsonb_build_object('ok', true, 'decision', _decision, 'target_type', _target_type, 'target_id', _target_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_verification_status(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_verification_status(text, uuid, text, text) TO authenticated;

-- Admin-only view of pending + recently reviewed verifications
CREATE OR REPLACE VIEW public.admin_pending_verifications_v
WITH (security_invoker = true) AS
SELECT
  'organization'::text AS target_type,
  o.id AS target_id,
  o.name,
  o.country,
  o.business_reg_type AS reg_type,
  o.business_reg_number AS reg_number,
  o.business_reg_verification_status AS status,
  o.verification_submitted_at AS submitted_at,
  o.verification_notes AS notes,
  o.verification_reviewed_by AS reviewed_by,
  o.verification_reviewed_at AS reviewed_at,
  NULL::text AS role,
  (SELECT m.user_id FROM public.org_members m
    WHERE m.org_id = o.id AND m.role = 'org_admin' AND m.is_active = true
    ORDER BY m.joined_at ASC LIMIT 1) AS owner_user_id,
  o.created_at
FROM public.organizations o
WHERE o.business_reg_verification_status IN ('pending','rejected','info_requested')
   OR (o.verification_reviewed_at IS NOT NULL AND o.verification_reviewed_at > now() - interval '30 days')

UNION ALL

SELECT
  'designer'::text AS target_type,
  p.id AS target_id,
  COALESCE(p.display_name, 'Designer') AS name,
  NULL::text AS country,
  NULL::text AS reg_type,
  NULL::text AS reg_number,
  COALESCE(p.access_status, 'pending') AS status,
  p.access_status_submitted_at AS submitted_at,
  p.access_status_notes AS notes,
  p.access_status_reviewed_by AS reviewed_by,
  p.access_status_reviewed_at AS reviewed_at,
  'designer'::text AS role,
  p.id AS owner_user_id,
  p.created_at
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'designer')
  AND (p.access_status IN ('pending','rejected','info_requested')
       OR (p.access_status_reviewed_at IS NOT NULL AND p.access_status_reviewed_at > now() - interval '30 days'));

REVOKE ALL ON public.admin_pending_verifications_v FROM PUBLIC, anon;
GRANT SELECT ON public.admin_pending_verifications_v TO authenticated;
