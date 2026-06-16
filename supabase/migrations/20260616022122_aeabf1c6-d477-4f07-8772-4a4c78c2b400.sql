
CREATE TABLE IF NOT EXISTS public.album_role_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  plan_tier text NOT NULL DEFAULT 'default',
  max_albums integer NOT NULL DEFAULT 5,
  max_images_per_album integer NOT NULL DEFAULT 25,
  allow_sharing boolean NOT NULL DEFAULT true,
  allow_public boolean NOT NULL DEFAULT false,
  allow_collaborative boolean NOT NULL DEFAULT false,
  allow_downloads boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, plan_tier)
);

GRANT SELECT ON public.album_role_limits TO authenticated;
GRANT ALL ON public.album_role_limits TO service_role;

ALTER TABLE public.album_role_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view album limits"
  ON public.album_role_limits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins manage album limits"
  ON public.album_role_limits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_album_role_limits_updated_at
  BEFORE UPDATE ON public.album_role_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.album_role_limits
  (role, plan_tier, max_albums, max_images_per_album, allow_sharing, allow_public, allow_collaborative, allow_downloads, notes)
VALUES
  ('customer',       'default', 3,   15,  true,  false, false, true,  'Default customer caps'),
  ('customer',       'premium', 10,  50,  true,  true,  true,  true,  'Premium customer subscription'),
  ('tailor',         'default', 10,  40,  true,  true,  true,  true,  'Tailor portfolio'),
  ('designer',       'default', 25,  100, true,  true,  true,  true,  'Designer portfolio'),
  ('designer',       'pro',     100, 500, true,  true,  true,  true,  'Designer Pro plan'),
  ('manager',        'default', 50,  200, true,  true,  true,  true,  'Org manager'),
  ('org_admin',      'default', 200, 500, true,  true,  true,  true,  'Org admin (Lite)'),
  ('org_admin',      'pro',     1000,2000,true,  true,  true,  true,  'Org admin (Pro plan)'),
  ('super_assistant','default', 9999,9999,true,  true,  true,  true,  'Super assistant'),
  ('super_admin',    'default', 99999,99999,true,true,  true,  true,  'Super admin (unlimited)')
ON CONFLICT (role, plan_tier) DO NOTHING;
