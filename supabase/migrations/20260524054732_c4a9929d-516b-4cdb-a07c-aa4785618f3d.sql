
CREATE TABLE IF NOT EXISTS public.monetization_switches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global','function','feature','user_type')),
  scope_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_key)
);

ALTER TABLE public.monetization_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read monetization switches"
  ON public.monetization_switches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage monetization switches - insert"
  ON public.monetization_switches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Super admins manage monetization switches - update"
  ON public.monetization_switches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Super admins manage monetization switches - delete"
  ON public.monetization_switches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_monetization_switches_updated
  BEFORE UPDATE ON public.monetization_switches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default switches (idempotent)
INSERT INTO public.monetization_switches (scope_type, scope_key, label, description) VALUES
  ('global','master','Master Monetization','Global kill-switch. When off, all platform billing, fees, paid features and subscriptions are suspended.'),

  ('function','subscriptions','Subscriptions','Recurring subscription billing (designer, organization, website plans).'),
  ('function','registration_fees','Registration Fees','One-off organization / designer registration fees.'),
  ('function','platform_fees','Platform Fees','Per-transaction platform fees (agency cuts, ledger charges).'),
  ('function','messaging_billing','Messaging Billing','SMS / WhatsApp / Email per-message charges.'),
  ('function','video_billing','Video Call Billing','Per-minute video / WebRTC call billing.'),
  ('function','ai_credits','AI & Premium Credits','Credit-based billing for AI try-on, garment AI, enhanced measurements.'),
  ('function','token_topups','Token Top-ups','Customer & org token / wallet top-ups.'),
  ('function','sentinel_addons','Sentinel MCP Add-ons','Sentinel storage, security, observability add-on billing.'),

  ('feature','website_builder','Website Builder Paid Tiers','Pro and Pro-Lite paid website plans.'),
  ('feature','featured_products','Featured Products Promotion','Paid weekly featured-product slots.'),
  ('feature','custom_domains','Custom Domains','Paid custom domain provisioning.'),
  ('feature','virtual_tryon','Virtual Try-On','Fashn.ai virtual try-on billing.'),
  ('feature','photo_enhance','Photo Enhancement','Photoroom enhancement billing.'),
  ('feature','tiered_measurements','Tiered AI Measurements','Paid Gemini Pro / ARCore measurement tiers.'),
  ('feature','mobile_app_pwa','Mobile App / PWA Plans','Branded mobile / PWA paid plans.'),

  ('user_type','customer','Customers','Charge customers (subscriptions, premium features, top-ups).'),
  ('user_type','tailor','Tailors','Apply agency / contract fees and paid features to tailors.'),
  ('user_type','designer','Designers','Charge designers (subscription, portal, features).'),
  ('user_type','org_admin','Organizations','Charge organizations (registration, subscriptions, fees).'),
  ('user_type','manager','Managers','Apply paid features at the manager level.')
ON CONFLICT (scope_type, scope_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_monetization_enabled(
  _function TEXT DEFAULT NULL,
  _feature TEXT DEFAULT NULL,
  _user_type TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT is_enabled FROM public.monetization_switches WHERE scope_type='global' AND scope_key='master'), true)
    AND (_function IS NULL OR COALESCE((SELECT is_enabled FROM public.monetization_switches WHERE scope_type='function' AND scope_key=_function), true))
    AND (_feature IS NULL OR COALESCE((SELECT is_enabled FROM public.monetization_switches WHERE scope_type='feature' AND scope_key=_feature), true))
    AND (_user_type IS NULL OR COALESCE((SELECT is_enabled FROM public.monetization_switches WHERE scope_type='user_type' AND scope_key=_user_type), true));
$$;

REVOKE EXECUTE ON FUNCTION public.is_monetization_enabled(TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_monetization_enabled(TEXT,TEXT,TEXT) TO authenticated;
