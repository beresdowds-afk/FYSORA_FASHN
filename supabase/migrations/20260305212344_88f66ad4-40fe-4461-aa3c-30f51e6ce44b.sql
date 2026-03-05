ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS vision_statement text,
  ADD COLUMN IF NOT EXISTS mission_statement text;