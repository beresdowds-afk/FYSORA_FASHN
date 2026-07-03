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


  // --- Require authenticated user ---
  const _authHeader = req.headers.get("Authorization");
  if (!_authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: _authHeader } } }
    );
    const { data: _authData, error: _authError } = await _authClient.auth.getUser();
    if (_authError || !_authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  // --- end auth ---

  try {
    const FASHN_API_KEY = Deno.env.get("FASHN_API_KEY");
    if (!FASHN_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FASHN_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, garment_image_url, model_image_url, org_id, user_id, job_id, prediction_id } = await req.json();

    // Action: start a try-on prediction
    if (action === "start") {
      if (!garment_image_url || !model_image_url) {
        return new Response(
          JSON.stringify({ error: "garment_image_url and model_image_url are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Start prediction via Fashn.ai API
      const response = await fetch("https://api.fashn.ai/v1/run", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FASHN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_image: model_image_url,
          garment_image: garment_image_url,
          category: "auto",
          mode: "quality",
          nsfw_filter: true,
          cover_feet: false,
          adjust_hands: true,
          restore_background: true,
          restore_clothes: true,
          flat_lay: false,
          long_top: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Fashn API error:", errText);
        return new Response(
          JSON.stringify({ error: "Fashn API request failed", details: errText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();

      // Update job queue if job_id provided
      if (job_id) {
        await supabase
          .from("ai_job_queue")
          .update({
            status: "processing",
            started_at: new Date().toISOString(),
            result_data: { prediction_id: result.id },
          })
          .eq("id", job_id);
      }

      return new Response(
        JSON.stringify({ prediction_id: result.id, status: result.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check prediction status
    if (action === "status") {
      if (!prediction_id) {
        return new Response(
          JSON.stringify({ error: "prediction_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(`https://api.fashn.ai/v1/status/${prediction_id}`, {
        headers: { "Authorization": `Bearer ${FASHN_API_KEY}` },
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: "Status check failed", details: errText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();

      // If completed and job_id, update the job
      if (result.status === "completed" && job_id) {
        await supabase
          .from("ai_job_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result_data: { prediction_id, output_url: result.output?.[0] },
          })
          .eq("id", job_id);

        // Increment tryon_count on garment if garment_id provided
        if (result.output?.[0]) {
          // Deduct credits from wallet
          if (org_id) {
            const { data: wallet } = await supabase
              .from("credit_wallets")
              .select("id, balance")
              .eq("org_id", org_id)
              .single();

            if (wallet && wallet.balance >= 5) {
              await supabase
                .from("credit_wallets")
                .update({ balance: wallet.balance - 5, lifetime_used: wallet.balance + 5 })
                .eq("id", wallet.id);

              await supabase.from("credit_transactions").insert({
                wallet_id: wallet.id,
                amount: -5,
                type: "debit",
                feature_type: "virtual_tryon",
                description: "Virtual try-on generation",
                balance_after: wallet.balance - 5,
              });
            }
          }
        }
      } else if (result.status === "failed" && job_id) {
        await supabase
          .from("ai_job_queue")
          .update({
            status: "failed",
            error_message: result.error || "Try-on generation failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", job_id);
      }

      return new Response(
        JSON.stringify({
          status: result.status,
          output_url: result.output?.[0] || null,
          error: result.error || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'start' or 'status'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fashn-tryon error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
