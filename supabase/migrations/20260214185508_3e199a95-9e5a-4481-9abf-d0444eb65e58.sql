
-- Table for storing API keys/secrets per organization
CREATE TABLE public.org_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL, -- e.g. 'stripe', 'paystack'
  key_name text NOT NULL, -- e.g. 'secret_key', 'public_key'
  key_value text NOT NULL, -- encrypted/stored value
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(org_id, provider, key_name)
);

-- Enable RLS
ALTER TABLE public.org_api_keys ENABLE ROW LEVEL SECURITY;

-- Only super admins and org admins can view keys
CREATE POLICY "Admins can view org api keys"
ON public.org_api_keys FOR SELECT
USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can insert keys
CREATE POLICY "Super admins can insert api keys"
ON public.org_api_keys FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_org_admin(auth.uid(), org_id));

-- Only super admins can update keys
CREATE POLICY "Super admins can update api keys"
ON public.org_api_keys FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_org_admin(auth.uid(), org_id));

-- Only super admins can delete keys
CREATE POLICY "Super admins can delete api keys"
ON public.org_api_keys FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_org_api_keys_updated_at
BEFORE UPDATE ON public.org_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
