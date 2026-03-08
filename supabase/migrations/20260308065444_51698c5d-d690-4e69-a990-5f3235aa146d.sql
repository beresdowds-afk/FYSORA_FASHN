
-- Platform-wide settings (singleton table for FSA branding/details)
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL DEFAULT 'Fashion Stitches Africa',
  platform_short_name TEXT NOT NULL DEFAULT 'Fashion Stitches',
  tagline TEXT DEFAULT 'The Future of African Fashion Tech',
  description TEXT DEFAULT 'Digitizing and scaling African fashion businesses through innovative technology solutions since 2024.',
  vision TEXT DEFAULT '',
  mission TEXT DEFAULT '',
  contact_email TEXT DEFAULT 'hello@fashionstitches.africa',
  contact_phone TEXT DEFAULT '+234 800 123 4567',
  contact_address TEXT DEFAULT 'Lagos, Nigeria',
  website_url TEXT DEFAULT 'app.fashionstitches.africa',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  social_links JSONB DEFAULT '{}',
  meta_keywords TEXT DEFAULT '',
  copyright_text TEXT DEFAULT '© 2024 Fashion Stitches Africa. All rights reserved.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.platform_settings (id) VALUES (gen_random_uuid());

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings (needed for landing pages)
CREATE POLICY "Public read access" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Only super admins can update
CREATE POLICY "Super admins can update" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
