
CREATE TABLE public.platform_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, key_name)
);

ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read platform keys"
  ON public.platform_api_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert platform keys"
  ON public.platform_api_keys FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update platform keys"
  ON public.platform_api_keys FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete platform keys"
  ON public.platform_api_keys FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_platform_api_keys_updated_at
  BEFORE UPDATE ON public.platform_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
