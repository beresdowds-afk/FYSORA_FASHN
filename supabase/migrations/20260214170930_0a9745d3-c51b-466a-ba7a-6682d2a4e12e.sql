
-- Order status enum for production workflow
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed', 
  'measuring',
  'cutting',
  'sewing',
  'fitting',
  'completed',
  'delivered',
  'cancelled'
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  assigned_tailor_id UUID,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  fabric_details TEXT,
  measurements JSONB DEFAULT '{}',
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order status history for tracking
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_org_id ON public.orders(org_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_assigned_tailor_id ON public.orders(assigned_tailor_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

-- Unique order number per org
CREATE UNIQUE INDEX idx_orders_order_number_org ON public.orders(org_id, order_number);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS for orders: org members can view, org_admin/tailor can manage
CREATE POLICY "Org members can view orders"
ON public.orders FOR SELECT
USING (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can create orders"
ON public.orders FOR INSERT
WITH CHECK (is_org_member(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can update orders"
ON public.orders FOR UPDATE
USING (is_org_admin(auth.uid(), org_id) OR assigned_tailor_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins can delete orders"
ON public.orders FOR DELETE
USING (is_org_admin(auth.uid(), org_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS for order_items: based on parent order access
CREATE POLICY "Users can view order items"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id
  AND (is_org_member(auth.uid(), orders.org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
));

CREATE POLICY "Users can create order items"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id
  AND (is_org_member(auth.uid(), orders.org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
));

CREATE POLICY "Users can update order items"
ON public.order_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id
  AND (is_org_admin(auth.uid(), orders.org_id) OR orders.assigned_tailor_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
));

CREATE POLICY "Users can delete order items"
ON public.order_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id
  AND (is_org_admin(auth.uid(), orders.org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
));

-- RLS for order_status_history
CREATE POLICY "Users can view status history"
ON public.order_status_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_status_history.order_id
  AND (is_org_member(auth.uid(), orders.org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
));

CREATE POLICY "Users can insert status history"
ON public.order_status_history FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_status_history.order_id
  AND (is_org_member(auth.uid(), orders.org_id) OR has_role(auth.uid(), 'super_admin'::app_role))
));

-- Trigger for updated_at on orders
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
