
-- Segment rules table
CREATE TABLE public.org_template_segment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('location','category','default')),
  segment_value TEXT NOT NULL DEFAULT '*',
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, segment_type, segment_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_template_segment_rules TO authenticated;
GRANT SELECT ON public.org_template_segment_rules TO anon;
GRANT ALL ON public.org_template_segment_rules TO service_role;
ALTER TABLE public.org_template_segment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read segment rules" ON public.org_template_segment_rules
  FOR SELECT USING (true);
CREATE POLICY "Org admins manage segment rules" ON public.org_template_segment_rules
  FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_segment_rules_updated_at BEFORE UPDATE ON public.org_template_segment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Staging table
CREATE TABLE public.org_template_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  created_by UUID,
  preview_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','promoted','discarded')),
  compatibility_report JSONB NOT NULL DEFAULT '[]'::jsonb,
  segment_type TEXT,
  segment_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_template_staging TO authenticated;
GRANT ALL ON public.org_template_staging TO service_role;
ALTER TABLE public.org_template_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read staging" ON public.org_template_staging
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Org admins manage staging" ON public.org_template_staging
  FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_staging_updated_at BEFORE UPDATE ON public.org_template_staging
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_staging_org_active ON public.org_template_staging(org_id, status);

-- Publish history
CREATE TABLE public.org_template_publish_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  published_by UUID,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  was_rollback BOOLEAN NOT NULL DEFAULT false,
  note TEXT
);
GRANT SELECT, INSERT ON public.org_template_publish_history TO authenticated;
GRANT ALL ON public.org_template_publish_history TO service_role;
ALTER TABLE public.org_template_publish_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read history" ON public.org_template_publish_history
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Org admins insert history" ON public.org_template_publish_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_history_org_published ON public.org_template_publish_history(org_id, published_at DESC);

-- RPC: get staging by token (public preview)
CREATE OR REPLACE FUNCTION public.get_staging_template_by_token(_token UUID)
RETURNS TABLE(
  id UUID, org_id UUID, template_key TEXT, status TEXT,
  expires_at TIMESTAMPTZ, compatibility_report JSONB,
  segment_type TEXT, segment_value TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-expire
  UPDATE public.org_template_staging
     SET status = 'expired'
   WHERE preview_token = _token AND status = 'active' AND expires_at <= now();

  RETURN QUERY
    SELECT s.id, s.org_id, s.template_key, s.status, s.expires_at,
           s.compatibility_report, s.segment_type, s.segment_value
      FROM public.org_template_staging s
     WHERE s.preview_token = _token
     LIMIT 1;
END;
$$;

-- RPC: promote staging to live
CREATE OR REPLACE FUNCTION public.promote_staging_template(_staging_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _s public.org_template_staging%ROWTYPE;
  _old_template TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _s FROM public.org_template_staging WHERE id = _staging_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staging not found'; END IF;
  IF NOT (public.is_org_admin(_uid, _s.org_id) OR public.has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF _s.status <> 'active' OR _s.expires_at <= now() THEN
    RAISE EXCEPTION 'Staging preview is no longer active';
  END IF;

  SELECT template_key INTO _old_template FROM public.org_websites WHERE org_id = _s.org_id LIMIT 1;

  UPDATE public.org_websites
     SET template_key = _s.template_key, updated_at = now()
   WHERE org_id = _s.org_id;

  INSERT INTO public.org_template_publish_history (org_id, template_key, published_by, snapshot, note)
  VALUES (_s.org_id, _s.template_key, _uid,
          jsonb_build_object('previous_template', _old_template, 'compatibility_report', _s.compatibility_report),
          'Promoted from staging preview');

  UPDATE public.org_template_staging SET status = 'promoted' WHERE id = _staging_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES (_uid, 'website_template_promoted', 'org_website', _s.org_id,
          jsonb_build_object('template_key', _old_template),
          jsonb_build_object('template_key', _s.template_key),
          jsonb_build_object('staging_id', _staging_id));

  RETURN jsonb_build_object('ok', true, 'from', _old_template, 'to', _s.template_key);
END;
$$;

-- RPC: rollback to previous template
CREATE OR REPLACE FUNCTION public.rollback_org_template(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current TEXT;
  _prev public.org_template_publish_history%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_org_admin(_uid, _org_id) OR public.has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  SELECT template_key INTO _current FROM public.org_websites WHERE org_id = _org_id LIMIT 1;

  SELECT * INTO _prev
    FROM public.org_template_publish_history
   WHERE org_id = _org_id AND template_key <> _current
   ORDER BY published_at DESC
   LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'No previous template to roll back to'; END IF;

  UPDATE public.org_websites
     SET template_key = _prev.template_key, updated_at = now()
   WHERE org_id = _org_id;

  INSERT INTO public.org_template_publish_history (org_id, template_key, published_by, snapshot, was_rollback, note)
  VALUES (_org_id, _prev.template_key, _uid,
          jsonb_build_object('rolled_back_from', _current, 'restored_history_id', _prev.id),
          true, 'One-click rollback');

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES (_uid, 'website_template_rollback', 'org_website', _org_id,
          jsonb_build_object('template_key', _current),
          jsonb_build_object('template_key', _prev.template_key),
          jsonb_build_object('restored_history_id', _prev.id));

  RETURN jsonb_build_object('ok', true, 'from', _current, 'to', _prev.template_key);
END;
$$;
