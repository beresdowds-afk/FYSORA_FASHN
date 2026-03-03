import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Shipment {
  id: string;
  org_id: string;
  order_id: string | null;
  carrier_id: string | null;
  tracking_number: string | null;
  status: string;
  label_url: string | null;
  sender_name: string | null;
  sender_address: any;
  sender_phone: string | null;
  recipient_name: string | null;
  recipient_address: any;
  recipient_phone: string | null;
  recipient_email: string | null;
  package_weight: number | null;
  package_dimensions: any;
  package_description: string | null;
  declared_value: number | null;
  currency: string;
  shipping_cost: number;
  carrier_cost: number;
  markup_amount: number;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  carrier_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  carrier?: ShippingCarrier;
}

export interface ShippingCarrier {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  supported_regions: string[];
  carrier_type: string;
  tracking_url_template: string | null;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: string;
  description: string | null;
  location: string | null;
  event_timestamp: string;
  created_at: string;
}

export interface DeliveryFlag {
  id: string;
  shipment_id: string;
  org_id: string;
  flag_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const useShipments = (orgId: string | undefined) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("shipments")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    
    if (data) {
      // Fetch carriers for each shipment
      const carrierIds = [...new Set(data.filter(s => s.carrier_id).map(s => s.carrier_id!))];
      let carriers: ShippingCarrier[] = [];
      if (carrierIds.length > 0) {
        const { data: cData } = await supabase
          .from("shipping_carriers")
          .select("*")
          .in("id", carrierIds);
        carriers = (cData || []) as ShippingCarrier[];
      }
      const carrierMap = Object.fromEntries(carriers.map(c => [c.id, c]));
      setShipments(data.map(s => ({ ...s, carrier: s.carrier_id ? carrierMap[s.carrier_id] : undefined })) as Shipment[]);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const createShipment = async (shipment: Partial<Shipment>) => {
    const { error } = await supabase.from("shipments").insert({ ...shipment, org_id: orgId! } as any);
    if (!error) await fetchShipments();
    return { error };
  };

  const updateShipment = async (id: string, updates: Partial<Shipment>) => {
    const { error } = await supabase.from("shipments").update(updates as any).eq("id", id);
    if (!error) await fetchShipments();
    return { error };
  };

  return { shipments, loading, createShipment, updateShipment, refetch: fetchShipments };
};

export const useCarriers = () => {
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("shipping_carriers").select("*").eq("is_active", true).then(({ data }) => {
      setCarriers((data || []) as ShippingCarrier[]);
      setLoading(false);
    });
  }, []);

  return { carriers, loading };
};

export const useTrackingEvents = (shipmentId: string | undefined) => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shipmentId) { setLoading(false); return; }
    supabase
      .from("shipment_tracking_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("event_timestamp", { ascending: false })
      .then(({ data }) => {
        setEvents((data || []) as TrackingEvent[]);
        setLoading(false);
      });
  }, [shipmentId]);

  return { events, loading };
};

export const useDeliveryFlags = (orgId: string | undefined) => {
  const [flags, setFlags] = useState<DeliveryFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    const { data } = await supabase
      .from("delivery_flags")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setFlags((data || []) as DeliveryFlag[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const resolveFlag = async (id: string, notes: string) => {
    const { error } = await supabase
      .from("delivery_flags")
      .update({ status: "resolved", resolution_notes: notes, resolved_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) await fetchFlags();
    return { error };
  };

  return { flags, loading, resolveFlag, refetch: fetchFlags };
};
