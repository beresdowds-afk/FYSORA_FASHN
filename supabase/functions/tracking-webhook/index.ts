import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const body = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let trackingNumber: string | null = null;
    let status: string = "unknown";
    let description: string = "";
    let location: string = "";
    let eventTimestamp: string = new Date().toISOString();

    switch (provider) {
      case "fedex":
        trackingNumber = body.trackingNumber || body.tracking_number;
        status = mapFedExStatus(body.eventType);
        description = body.eventDescription || body.event_description || "";
        location = body.scanLocation?.city || "";
        eventTimestamp = body.eventTimestamp || body.timestamp || eventTimestamp;
        break;

      case "dhl":
        trackingNumber = body.awb || body.trackingId;
        status = mapDHLStatus(body.status);
        description = body.description || "";
        location = body.location?.address?.addressLocality || "";
        eventTimestamp = body.timestamp || eventTimestamp;
        break;

      case "terminal":
        trackingNumber = body.data?.tracking_number;
        status = mapTerminalStatus(body.data?.status);
        description = body.data?.status_description || "";
        location = body.data?.current_location || "";
        eventTimestamp = body.data?.updated_at || eventTimestamp;
        break;

      default:
        trackingNumber = body.tracking_number;
        status = body.status || "update";
        description = body.description || "";
        location = body.location || "";
        break;
    }

    if (!trackingNumber) {
      return new Response(
        JSON.stringify({ error: "No tracking number in webhook payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the shipment
    const { data: shipment } = await supabaseAdmin
      .from("shipments")
      .select("id, org_id, status")
      .eq("tracking_number", trackingNumber)
      .single();

    if (!shipment) {
      console.log(`No shipment found for tracking #${trackingNumber}`);
      return new Response(
        JSON.stringify({ received: true, matched: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert tracking event
    await supabaseAdmin.from("shipment_tracking_events").insert({
      shipment_id: shipment.id,
      status,
      description,
      location,
      carrier_status_code: body.eventType || body.status || provider,
      event_timestamp: eventTimestamp,
      raw_data: body,
    });

    // Update shipment status
    const shipmentUpdate: any = { status };
    if (status === "delivered") {
      shipmentUpdate.delivered_at = eventTimestamp;
      shipmentUpdate.actual_delivery_date = eventTimestamp.split("T")[0];
    }
    await supabaseAdmin.from("shipments").update(shipmentUpdate).eq("id", shipment.id);

    // Create delivery flag for exceptions
    if (status === "exception" || status === "returned") {
      await supabaseAdmin.from("delivery_flags").insert({
        shipment_id: shipment.id,
        org_id: shipment.org_id,
        flag_type: "exception",
        severity: status === "returned" ? "high" : "medium",
        title: `Delivery ${status}: ${description}`,
        description: `Location: ${location}. Provider: ${provider}`,
      });
    }

    return new Response(
      JSON.stringify({ received: true, matched: true, shipment_id: shipment.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("tracking-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapFedExStatus(event: string): string {
  const map: Record<string, string> = {
    ON_DELIVERY: "out_for_delivery",
    ON_EXCEPTION: "exception",
    ON_ESTIMATED_DELIVERY: "in_transit",
    DELIVERED: "delivered",
    PICKED_UP: "picked_up",
    IN_TRANSIT: "in_transit",
  };
  return map[event] || "in_transit";
}

function mapDHLStatus(status: string): string {
  const map: Record<string, string> = {
    delivery: "delivered",
    exception: "exception",
    pickup: "picked_up",
    transit: "in_transit",
    "out-for-delivery": "out_for_delivery",
  };
  return map[status] || "in_transit";
}

function mapTerminalStatus(status: string): string {
  const map: Record<string, string> = {
    delivered: "delivered",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    cancelled: "exception",
    returned: "returned",
    picked_up: "picked_up",
  };
  return map[status] || "in_transit";
}
