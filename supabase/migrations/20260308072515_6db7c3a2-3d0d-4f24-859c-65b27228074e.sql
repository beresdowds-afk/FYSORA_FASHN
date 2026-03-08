-- Fix 1: Sanitize handle_new_user() inputs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_display_name TEXT;
BEGIN
  -- Extract and sanitize display name
  clean_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Limit length to 100 characters
  clean_display_name := LEFT(clean_display_name, 100);
  
  -- Remove potentially dangerous characters
  clean_display_name := REGEXP_REPLACE(clean_display_name, '[<>"'';\\x00-\x1F\x7F]', '', 'g');
  
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, clean_display_name);
  
  RETURN NEW;
END;
$$;

-- Fix 2: Tighten org-assets storage policies
-- Drop overly permissive upload policy and replace with org-admin-only
DROP POLICY IF EXISTS "Org admins can upload assets" ON storage.objects;

CREATE POLICY "Authenticated org members can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-assets' 
  AND auth.uid() IS NOT NULL
  AND (
    public.is_org_admin(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);