
-- Add invoice customization columns to organizations
ALTER TABLE public.organizations
ADD COLUMN invoice_address TEXT DEFAULT NULL,
ADD COLUMN invoice_payment_terms TEXT DEFAULT NULL,
ADD COLUMN invoice_notes TEXT DEFAULT NULL,
ADD COLUMN invoice_logo_url TEXT DEFAULT NULL;

-- Create storage bucket for org logos/assets
INSERT INTO storage.buckets (id, name, public) VALUES ('org-assets', 'org-assets', true);

-- Storage policies for org assets
CREATE POLICY "Public read access for org assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-assets');

CREATE POLICY "Org admins can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'org-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can update assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'org-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can delete assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'org-assets' AND auth.uid() IS NOT NULL);
