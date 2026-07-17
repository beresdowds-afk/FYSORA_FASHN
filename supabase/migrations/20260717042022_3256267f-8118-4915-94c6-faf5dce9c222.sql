DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.payments'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%payment_gateway%'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_gateway_check
  CHECK (payment_gateway IS NULL OR payment_gateway IN
    ('stripe','paypal','paystack','opay','flutterwave','bank_transfer','wallet','cash','manual'));