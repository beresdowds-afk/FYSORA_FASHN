-- 1. Normalize schemeless website URLs
UPDATE public.org_websites
   SET webhook_url = 'https://' || webhook_url, updated_at = now()
 WHERE webhook_url IS NOT NULL
   AND btrim(webhook_url) <> ''
   AND webhook_url !~* '^https?://';

UPDATE public.org_websites
   SET public_website_url = 'https://' || public_website_url, updated_at = now()
 WHERE public_website_url IS NOT NULL
   AND btrim(public_website_url) <> ''
   AND public_website_url !~* '^https?://';

-- 2. Backfill public_website_url from webhook_url for custom_integration sites
UPDATE public.org_websites
   SET public_website_url = webhook_url, updated_at = now()
 WHERE mode = 'custom_integration'
   AND (public_website_url IS NULL OR btrim(public_website_url) = '')
   AND webhook_url IS NOT NULL
   AND btrim(webhook_url) <> '';

-- 3. Redirect RPC: normalize scheme + fall back to public_website_url
CREATE OR REPLACE FUNCTION public.get_org_website_redirect(_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
           WHEN u IS NULL OR btrim(u) = '' THEN NULL
           WHEN u ~* '^https?://' THEN u
           ELSE 'https://' || btrim(u)
         END
  FROM (
    SELECT COALESCE(NULLIF(btrim(w.webhook_url), ''), NULLIF(btrim(w.public_website_url), '')) AS u
      FROM public.org_websites w
     WHERE w.org_id = _org_id
       AND w.is_enabled = true
       AND w.mode = 'custom_integration'
     LIMIT 1
  ) s;
$function$;

-- 4. Structured Supabase failure logging (auth / RLS / database errors)
CREATE OR REPLACE FUNCTION public.log_supabase_failure(
  _category text,
  _pg_code text,
  _object_name text,
  _message text,
  _route text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sev text;
BEGIN
  IF _category NOT IN ('auth','rls','database','network','config') THEN
    _category := 'database';
  END IF;

  _sev := CASE
            WHEN _category IN ('auth','config') THEN 'critical'
            WHEN _pg_code IN ('42501','42703','42P01') THEN 'critical'
            ELSE 'warning'
          END;

  RETURN public.record_schema_alert(
    _sev,
    'runtime_error',
    'endpoint',
    COALESCE(NULLIF(btrim(_object_name), ''), 'supabase'),
    NULLIF(_pg_code, ''),
    LEFT(COALESCE(_message, 'Unknown Supabase failure'), 1000),
    COALESCE(_details, '{}'::jsonb) || jsonb_build_object(
      'category', _category,
      'pg_code', _pg_code,
      'route', _route,
      'reporter', auth.uid()
    ),
    NULL
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_supabase_failure(text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_supabase_failure(text,text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_supabase_failure(text,text,text,text,text,jsonb) TO service_role;