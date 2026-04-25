
-- Voiced platform tour: authoritative tracks per role
CREATE TABLE IF NOT EXISTS public.platform_tour_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE CHECK (role IN ('customer','tailor','designer','organization')),
  label TEXT NOT NULL,
  tagline TEXT NOT NULL,
  icon TEXT NOT NULL,
  accent TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  cta_path TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_version TEXT,
  generated_by TEXT NOT NULL DEFAULT 'seed', -- 'seed' | 'ai' | 'manual'
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_tour_tracks ENABLE ROW LEVEL SECURITY;

-- Public read (the tour is public marketing content)
DROP POLICY IF EXISTS "tour_tracks_public_read" ON public.platform_tour_tracks;
CREATE POLICY "tour_tracks_public_read"
ON public.platform_tour_tracks FOR SELECT
TO anon, authenticated
USING (true);

-- Only super_admin / super_assistant can mutate
DROP POLICY IF EXISTS "tour_tracks_admin_write" ON public.platform_tour_tracks;
CREATE POLICY "tour_tracks_admin_write"
ON public.platform_tour_tracks FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_assistant'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_assistant'::public.app_role)
);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_tour_tracks_updated_at ON public.platform_tour_tracks;
CREATE TRIGGER trg_tour_tracks_updated_at
BEFORE UPDATE ON public.platform_tour_tracks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_tour_tracks;

-- Trigger: when a new platform_updates row is inserted, mark tour tracks as stale
-- by bumping a settings flag. The actual regeneration runs in the edge function
-- (sync-voiced-tour) called from the Super Admin panel.
CREATE TABLE IF NOT EXISTS public.platform_tour_sync_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_platform_update_id UUID,
  last_sync_attempt_at TIMESTAMPTZ,
  last_sync_success_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_message TEXT,
  is_stale BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_tour_sync_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_tour_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_sync_state_public_read" ON public.platform_tour_sync_state;
CREATE POLICY "tour_sync_state_public_read"
ON public.platform_tour_sync_state FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "tour_sync_state_admin_write" ON public.platform_tour_sync_state;
CREATE POLICY "tour_sync_state_admin_write"
ON public.platform_tour_sync_state FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_assistant'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_assistant'::public.app_role)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_tour_sync_state;

-- Mark tour stale on new platform update
CREATE OR REPLACE FUNCTION public.mark_tour_stale_on_platform_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.platform_tour_sync_state
     SET is_stale = true,
         last_platform_update_id = NEW.id,
         updated_at = now()
   WHERE id = 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_tour_stale ON public.platform_updates;
CREATE TRIGGER trg_mark_tour_stale
AFTER INSERT ON public.platform_updates
FOR EACH ROW EXECUTE FUNCTION public.mark_tour_stale_on_platform_update();
