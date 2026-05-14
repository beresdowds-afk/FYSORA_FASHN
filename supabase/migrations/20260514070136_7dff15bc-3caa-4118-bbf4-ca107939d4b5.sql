
ALTER TABLE public.org_websites
  ADD COLUMN IF NOT EXISTS public_website_url TEXT;

COMMENT ON COLUMN public.org_websites.public_website_url IS
  'When set, FYSORA FASHN routes outbound links for this organization to this URL (custom domain or linked external website) instead of the native /site/:slug page.';

UPDATE public.org_websites
   SET public_website_url = 'https://gabulkfashionstudio.org.ng'
 WHERE org_id = '037ade55-eedb-46da-a8fb-3267e0434a8c'
   AND (public_website_url IS NULL OR public_website_url = '');
