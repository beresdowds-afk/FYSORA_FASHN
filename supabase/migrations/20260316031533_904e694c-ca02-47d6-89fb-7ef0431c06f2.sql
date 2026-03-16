-- Grant GABULK FASHION STUDIO the website_builder_pro exemption if not already present
INSERT INTO public.org_fee_exemptions (org_id, exemption_type, reason, granted_by)
SELECT o.id, 'website_builder_pro', 'Complimentary Pro website access granted by platform admin', 'system'
FROM public.organizations o
WHERE UPPER(TRIM(o.name)) LIKE '%GABULK%FASHION%STUDI%'
ON CONFLICT (org_id, exemption_type) DO NOTHING;