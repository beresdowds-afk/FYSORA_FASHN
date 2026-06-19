
ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS selected_template_id text,
  ADD COLUMN IF NOT EXISTS published_template_id text,
  ADD COLUMN IF NOT EXISTS published_template_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_unpublished_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_template_change_by uuid;

CREATE TABLE IF NOT EXISTS public.org_website_template_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL CHECK (action IN ('select','apply','publish','unpublish','change')),
  from_template_id text,
  to_template_id text,
  consequences jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.org_website_template_events TO authenticated;
GRANT ALL ON public.org_website_template_events TO service_role;

ALTER TABLE public.org_website_template_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read template events" ON public.org_website_template_events;
CREATE POLICY "Org members read template events"
  ON public.org_website_template_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_website_template_events.org_id
        AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Org admins insert template events" ON public.org_website_template_events;
CREATE POLICY "Org admins insert template events"
  ON public.org_website_template_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.org_members m
        WHERE m.org_id = org_website_template_events.org_id
          AND m.user_id = auth.uid()
          AND m.role IN ('org_admin','manager')
      )
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS org_website_template_events_org_idx
  ON public.org_website_template_events (org_id, created_at DESC);
