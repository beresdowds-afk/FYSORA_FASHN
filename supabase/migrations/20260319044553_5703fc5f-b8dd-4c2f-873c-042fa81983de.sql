
ALTER TABLE public.platform_fee_ledger DROP CONSTRAINT platform_fee_ledger_fee_type_check;
ALTER TABLE public.platform_fee_ledger ADD CONSTRAINT platform_fee_ledger_fee_type_check 
  CHECK (fee_type = ANY (ARRAY['customer_surcharge', 'org_admin_fee', 'website_builder_lite', 'website_builder_pro', 'website_builder_pro_lite', 'subscription', 'registration', 'messaging_sms', 'messaging_whatsapp', 'messaging_email']));

ALTER TABLE public.platform_fee_ledger DROP CONSTRAINT platform_fee_ledger_status_check;
ALTER TABLE public.platform_fee_ledger ADD CONSTRAINT platform_fee_ledger_status_check 
  CHECK (status = ANY (ARRAY['pending', 'collected', 'settled', 'waived', 'charged']));
