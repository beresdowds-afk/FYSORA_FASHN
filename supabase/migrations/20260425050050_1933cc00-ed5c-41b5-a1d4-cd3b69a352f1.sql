
CREATE TABLE IF NOT EXISTS public.tour_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer','tailor','designer','organization')),
  last_step_index INT NOT NULL DEFAULT 0,
  total_steps INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.tour_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_progress_select_own" ON public.tour_progress;
CREATE POLICY "tour_progress_select_own"
ON public.tour_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tour_progress_insert_own" ON public.tour_progress;
CREATE POLICY "tour_progress_insert_own"
ON public.tour_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tour_progress_update_own" ON public.tour_progress;
CREATE POLICY "tour_progress_update_own"
ON public.tour_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tour_progress_delete_own" ON public.tour_progress;
CREATE POLICY "tour_progress_delete_own"
ON public.tour_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_tour_progress_updated_at ON public.tour_progress;
CREATE TRIGGER trg_tour_progress_updated_at
BEFORE UPDATE ON public.tour_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tour_progress_user ON public.tour_progress(user_id);
