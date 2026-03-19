-- Enable realtime for org_websites and org_catalogue_items tables
-- This allows the dashboard to listen for changes and sync to apps/websites
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_websites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_catalogue_items;