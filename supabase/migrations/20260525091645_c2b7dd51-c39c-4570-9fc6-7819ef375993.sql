DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'org_company_officers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.org_company_officers;
  END IF;
END $$;
ALTER TABLE public.org_company_officers REPLICA IDENTITY FULL;