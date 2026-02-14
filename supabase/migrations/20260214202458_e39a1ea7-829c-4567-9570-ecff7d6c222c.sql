
-- AI Measurement Bookings table
CREATE TABLE public.ai_measurement_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  customer_id UUID NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'pending_payment',
  -- Pricing
  hours_booked INTEGER NOT NULL DEFAULT 1,
  first_hour_rate NUMERIC NOT NULL DEFAULT 10,
  additional_hour_rate NUMERIC NOT NULL DEFAULT 5,
  total_amount NUMERIC NOT NULL DEFAULT 10,
  currency TEXT NOT NULL DEFAULT 'USD',
  local_amount NUMERIC,
  local_currency TEXT,
  -- Revenue split: 60% org, 40% platform (FASHION STITCHES AFRICA)
  org_share_percent NUMERIC NOT NULL DEFAULT 60,
  platform_share_percent NUMERIC NOT NULL DEFAULT 40,
  org_share_amount NUMERIC NOT NULL DEFAULT 0,
  platform_share_amount NUMERIC NOT NULL DEFAULT 0,
  -- Session details
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  actual_duration_minutes INTEGER,
  -- Payment
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  gateway_reference TEXT,
  gateway_checkout_url TEXT,
  payment_gateway TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  -- Session data
  session_notes TEXT,
  measurements_captured JSONB DEFAULT '{}'::jsonb,
  session_type TEXT NOT NULL DEFAULT 'video_ai',
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_measurement_bookings ENABLE ROW LEVEL SECURITY;

-- Customers can view their own bookings
CREATE POLICY "Customers can view their own bookings"
ON public.ai_measurement_bookings FOR SELECT
USING (customer_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Customers can create their own bookings
CREATE POLICY "Customers can create bookings"
ON public.ai_measurement_bookings FOR INSERT
WITH CHECK (customer_id = auth.uid() OR is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Org admins can update bookings
CREATE POLICY "Org admins can update bookings"
ON public.ai_measurement_bookings FOR UPDATE
USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role) OR customer_id = auth.uid());

-- Org admins can delete bookings
CREATE POLICY "Org admins can delete bookings"
ON public.ai_measurement_bookings FOR DELETE
USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_ai_measurement_bookings_updated_at
BEFORE UPDATE ON public.ai_measurement_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
