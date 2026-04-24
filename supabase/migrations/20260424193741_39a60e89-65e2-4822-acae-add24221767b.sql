CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $func$
DECLARE
  clean_display_name TEXT;
BEGIN
  clean_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  clean_display_name := LEFT(clean_display_name, 100);

  -- Strip control chars and a few unsafe punctuation chars
  clean_display_name := REGEXP_REPLACE(clean_display_name, '[[:cntrl:]]', '', 'g');
  clean_display_name := TRANSLATE(clean_display_name, '<>"' || chr(39) || ';\', '');

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, clean_display_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$func$;