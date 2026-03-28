
-- Fix: Drop permissive public INSERT/UPDATE policies on system tables
-- These tables are written to by edge functions using service_role, so no public policy is needed

-- inbound_messages
DROP POLICY IF EXISTS "System can insert inbound messages" ON public.inbound_messages;
DROP POLICY IF EXISTS "System can insert" ON public.inbound_messages;

-- message_threads
DROP POLICY IF EXISTS "System can insert threads" ON public.message_threads;
DROP POLICY IF EXISTS "System can insert" ON public.message_threads;
DROP POLICY IF EXISTS "System can update threads" ON public.message_threads;
DROP POLICY IF EXISTS "System can update" ON public.message_threads;

-- opt_out_registry
DROP POLICY IF EXISTS "System can insert opt-outs" ON public.opt_out_registry;
DROP POLICY IF EXISTS "System can insert" ON public.opt_out_registry;

-- call_logs
DROP POLICY IF EXISTS "System can insert call logs" ON public.call_logs;
DROP POLICY IF EXISTS "System can insert" ON public.call_logs;

-- shipment_tracking_events
DROP POLICY IF EXISTS "System can insert tracking events" ON public.shipment_tracking_events;
DROP POLICY IF EXISTS "System can insert" ON public.shipment_tracking_events;

-- Also fix org_consultations: replace open INSERT with authenticated-only
DROP POLICY IF EXISTS "Anyone can book a consultation" ON public.org_consultations;
CREATE POLICY "Authenticated users can book a consultation"
ON public.org_consultations
FOR INSERT
TO authenticated
WITH CHECK (true);
