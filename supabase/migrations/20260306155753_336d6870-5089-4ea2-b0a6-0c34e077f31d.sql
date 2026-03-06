
-- Add identity verification fields to profiles (for tailors)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS identity_number text,
ADD COLUMN IF NOT EXISTS identity_type text DEFAULT 'national_id',
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS identity_verification_status text DEFAULT 'pending';

-- Add business registration verification fields to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS business_reg_number text,
ADD COLUMN IF NOT EXISTS business_reg_type text DEFAULT 'cac',
ADD COLUMN IF NOT EXISTS business_reg_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS business_reg_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS business_reg_verification_status text DEFAULT 'pending';
