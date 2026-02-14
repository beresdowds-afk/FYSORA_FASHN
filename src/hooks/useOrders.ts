import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "measuring"
  | "cutting"
  | "sewing"
  | "fitting"
  | "completed"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  org_id: string;
  customer_id: string;
  assigned_tailor_id: string | null;
  order_number: string;
  status: OrderStatus;
  title: string;
  description: string | null;
  due_date: string | null;
  total_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_profile?: { display_name: string | null } | null;
  tailor_profile?: { display_name: string | null } | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  fabric_details: string | null;
  measurements: Record<string, any>;
  status: OrderStatus;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "measuring",
  "cutting",
  "sewing",
  "fitting",
  "completed",
  "delivered",
];

export const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  measuring: "Measuring",
  cutting: "Cutting",
  sewing: "Sewing",
  fitting: "Fitting",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const statusColors: Record<OrderStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/15 text-primary",
  measuring: "bg-secondary/15 text-secondary",
  cutting: "bg-accent/15 text-accent",
  sewing: "bg-primary/15 text-primary",
  fitting: "bg-secondary/15 text-secondary",
  completed: "bg-green/15 text-green",
  delivered: "bg-green/20 text-green",
  cancelled: "bg-destructive/15 text-destructive",
};

export const useOrders = (orgId: string | undefined) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch customer & tailor profiles
      const userIds = new Set<string>();
      data.forEach((o: any) => {
        userIds.add(o.customer_id);
        if (o.assigned_tailor_id) userIds.add(o.assigned_tailor_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setOrders(
        data.map((o: any) => ({
          ...o,
          customer_profile: profileMap.get(o.customer_id) || null,
          tailor_profile: o.assigned_tailor_id ? profileMap.get(o.assigned_tailor_id) || null : null,
        }))
      );
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const generateOrderNumber = () => {
    const prefix = "ORD";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const createOrder = async (orderData: {
    title: string;
    description?: string;
    customer_id: string;
    due_date?: string;
    currency: string;
    items: { name: string; quantity: number; unit_price: number; fabric_details?: string }[];
  }) => {
    if (!orgId || !user) return { error: new Error("Not authenticated") };

    const totalAmount = orderData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        org_id: orgId,
        customer_id: orderData.customer_id,
        order_number: orderNumber,
        title: orderData.title,
        description: orderData.description || null,
        due_date: orderData.due_date || null,
        total_amount: totalAmount,
        currency: orderData.currency,
      })
      .select()
      .single();

    if (orderError) return { error: orderError };

    // Insert items
    if (orderData.items.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(
        orderData.items.map((item) => ({
          order_id: order.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          fabric_details: item.fabric_details || null,
        }))
      );
      if (itemsError) return { error: itemsError };
    }

    // Insert status history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      new_status: "pending" as any,
      changed_by: user.id,
      note: "Order created",
    });

    await fetchOrders();
    return { data: order, error: null };
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const currentOrder = orders.find((o) => o.id === orderId);

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);

    if (error) return { error };

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: currentOrder?.status as any,
      new_status: newStatus as any,
      changed_by: user.id,
      note: note || null,
    });

    await fetchOrders();
    return { error: null };
  };

  const assignTailor = async (orderId: string, tailorId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ assigned_tailor_id: tailorId })
      .eq("id", orderId);

    if (!error) await fetchOrders();
    return { error };
  };

  const deleteOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (!error) await fetchOrders();
    return { error };
  };

  return { orders, loading, createOrder, updateOrderStatus, assignTailor, deleteOrder, refetch: fetchOrders };
};

export const useOrderDetail = (orderId: string | undefined) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchDetail = async () => {
      setLoading(true);
      const [itemsRes, historyRes] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
        supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
      ]);

      setItems((itemsRes.data as any[]) || []);
      setHistory((historyRes.data as any[]) || []);
      setLoading(false);
    };

    fetchDetail();
  }, [orderId]);

  return { items, history, loading };
};
