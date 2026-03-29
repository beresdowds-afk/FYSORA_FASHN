
-- Track app downloads/installs per organization
CREATE TABLE public.org_app_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'unknown', -- ios, android, desktop, unknown
  install_method TEXT NOT NULL DEFAULT 'pwa', -- pwa, browser_prompt, manual
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast org-level queries
CREATE INDEX idx_org_app_downloads_org ON public.org_app_downloads(org_id);
CREATE INDEX idx_org_app_downloads_created ON public.org_app_downloads(created_at DESC);

-- RLS
ALTER TABLE public.org_app_downloads ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own download record
CREATE POLICY "Users can record their own downloads"
  ON public.org_app_downloads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous inserts (non-logged-in users installing)
CREATE POLICY "Anon users can record downloads"
  ON public.org_app_downloads FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Super admins can read all
CREATE POLICY "Super admins can read all downloads"
  ON public.org_app_downloads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Org admins can read their own org downloads
CREATE POLICY "Org admins can read own org downloads"
  ON public.org_app_downloads FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));
