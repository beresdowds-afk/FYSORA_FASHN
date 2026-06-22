
SELECT cron.schedule(
  'sync-platform-catalogue-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ruplopynbimfjowhpktz.supabase.co/functions/v1/sync-platform-catalogue',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGxvcHluYmltZmpvd2hwa3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Njg4MzYsImV4cCI6MjA4ODU0NDgzNn0.mAA_W_YAFF4NAED6SSmK5bwQzj7wj4u964NrFZjgwiI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
