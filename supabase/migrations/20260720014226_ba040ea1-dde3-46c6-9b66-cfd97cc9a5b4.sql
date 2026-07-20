ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS show_size_chart boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_chart_standards text[] NOT NULL DEFAULT ARRAY['UK','US','CN']::text[];

NOTIFY pgrst, 'reload schema';