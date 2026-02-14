import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Target currencies we care about
const TARGET_CURRENCIES = ["USD", "GBP", "EUR", "GHS", "KES", "ZAR"];
const BASE_CURRENCY = "NGN";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use free exchangerate.host API (no key required)
    const apiUrl = `https://api.exchangerate.host/latest?base=${BASE_CURRENCY}&symbols=${TARGET_CURRENCIES.join(",")}`;
    let rates: Record<string, number> = {};

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.success && data.rates) {
        rates = data.rates;
      }
    } catch {
      // Fallback: try open.er-api.com (free, no key)
    }

    // Fallback API if first fails
    if (Object.keys(rates).length === 0) {
      try {
        const fallbackUrl = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;
        const response = await fetch(fallbackUrl);
        const data = await response.json();
        if (data.result === "success" && data.rates) {
          for (const currency of TARGET_CURRENCIES) {
            if (data.rates[currency]) {
              rates[currency] = data.rates[currency];
            }
          }
        }
      } catch (e) {
        console.error("Fallback API also failed:", e);
      }
    }

    if (Object.keys(rates).length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch exchange rates from all sources" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store rates in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    const upsertData = Object.entries(rates).map(([currency, rate]) => ({
      base_currency: BASE_CURRENCY,
      target_currency: currency,
      rate: Number(rate),
      fetched_at: now,
    }));

    const { error } = await supabase
      .from("exchange_rates")
      .upsert(upsertData, { onConflict: "base_currency,target_currency" });

    if (error) {
      console.error("DB upsert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store rates", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        rates_updated: Object.keys(rates).length,
        rates,
        fetched_at: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
