ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS hero_video_url text,
  ADD COLUMN IF NOT EXISTS api_key text;

NOTIFY pgrst, 'reload schema';