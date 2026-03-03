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
    const { org_id, origin, destination, weight, dimensions, carrier_slugs } = await req.json();

    if (!org_id || !origin || !destination) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: org_id, origin, destination" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get org carrier settings with credentials
    let carrierQuery = supabaseAdmin
      .from("org_carrier_settings")
      .select("*, carrier:shipping_carriers(*)")
      .eq("org_id", org_id)
      .eq("is_enabled", true);

    const { data: orgCarriers } = await carrierQuery;

    if (!orgCarriers || orgCarriers.length === 0) {
      return new Response(
        JSON.stringify({ quotes: [], message: "No carriers configured for this organization" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quotes: any[] = [];

    for (const oc of orgCarriers) {
      const carrier = oc.carrier as any;
      if (!carrier || !carrier.is_active) continue;
      if (carrier_slugs && !carrier_slugs.includes(carrier.slug)) continue;

      // Get API credentials if available
      let apiKey = null;
      if (oc.credentials_key_id) {
        const { data: keyData } = await supabaseAdmin
          .from("org_api_keys")
          .select("key_value")
          .eq("id", oc.credentials_key_id)
          .single();
        apiKey = keyData?.key_value;
      }

      // Attempt to get rates from each carrier
      let rate = null;
      try {
        switch (carrier.slug) {
          case "terminal-africa":
            if (apiKey) {
              rate = await getTerminalAfricaRate(apiKey, origin, destination, weight, dimensions);
            }
            break;
          // Other carriers can be added here as API keys are provided
          default:
            // Estimate based on weight and distance (fallback)
            rate = estimateRate(carrier, weight, origin, destination);
            break;
        }
      } catch (e) {
        console.error(`Rate fetch failed for ${carrier.slug}:`, e);
        rate = estimateRate(carrier, weight, origin, destination);
      }

      if (rate) {
        const markup = oc.markup_type === "percentage"
          ? rate.carrier_rate * (oc.markup_value / 100)
          : oc.markup_value;

        const quote = {
          carrier_id: carrier.id,
          carrier_name: carrier.name,
          carrier_slug: carrier.slug,
          carrier_rate: rate.carrier_rate,
          markup_amount: markup,
          final_rate: rate.carrier_rate + markup,
          currency: rate.currency || "NGN",
          estimated_days: rate.estimated_days,
          service_type: rate.service_type || "standard",
          is_estimate: rate.is_estimate || false,
        };
        quotes.push(quote);

        // Cache the quote
        await supabaseAdmin.from("shipping_rate_quotes").insert({
          org_id,
          carrier_id: carrier.id,
          origin_address: origin,
          destination_address: destination,
          package_weight: weight,
          package_dimensions: dimensions,
          carrier_rate: quote.carrier_rate,
          final_rate: quote.final_rate,
          currency: quote.currency,
          estimated_days: quote.estimated_days,
          service_type: quote.service_type,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // Sort by final rate
    quotes.sort((a, b) => a.final_rate - b.final_rate);

    return new Response(
      JSON.stringify({ quotes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("carrier-rates error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getTerminalAfricaRate(apiKey: string, origin: any, destination: any, weight: number, dimensions: any) {
  const response = await fetch("https://api.terminal.africa/v1/rates/shipment", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pickup_address: origin,
      delivery_address: destination,
      parcel: {
        weight: weight || 1,
        width: dimensions?.width || 20,
        height: dimensions?.height || 15,
        length: dimensions?.length || 30,
      },
    }),
  });

  if (!response.ok) throw new Error("Terminal Africa rate request failed");

  const data = await response.json();
  if (data.data && data.data.length > 0) {
    const cheapest = data.data.sort((a: any, b: any) => a.amount - b.amount)[0];
    return {
      carrier_rate: cheapest.amount / 100,
      currency: cheapest.currency || "NGN",
      estimated_days: cheapest.delivery_time || 5,
      service_type: cheapest.carrier_name || "standard",
      is_estimate: false,
    };
  }
  return null;
}

function estimateRate(carrier: any, weight: number, origin: any, destination: any) {
  const baseRate = carrier.carrier_type === "international" ? 15000 : carrier.carrier_type === "regional" ? 5000 : 2000;
  const weightRate = (weight || 1) * 500;
  const isSameCountry = origin?.country === destination?.country;
  const distanceMultiplier = isSameCountry ? 1 : carrier.carrier_type === "international" ? 3 : 2;

  return {
    carrier_rate: (baseRate + weightRate) * distanceMultiplier,
    currency: "NGN",
    estimated_days: carrier.carrier_type === "local" ? 3 : carrier.carrier_type === "regional" ? 7 : 14,
    service_type: "estimated",
    is_estimate: true,
  };
}
