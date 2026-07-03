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
    const PHOTOROOM_API_KEY = Deno.env.get("PHOTOROOM_API_KEY");
    if (!PHOTOROOM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PHOTOROOM_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, image_url, org_id, user_id, garment_id, options } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl: string;
    let formBody: FormData;

    if (action === "remove_background") {
      apiUrl = "https://sdk.photoroom.com/v1/segment";
      formBody = new FormData();
      formBody.append("image_url", image_url);
      formBody.append("format", "png");
      if (options?.bg_color) {
        formBody.append("bg_color", options.bg_color);
      }
    } else if (action === "enhance") {
      apiUrl = "https://sdk.photoroom.com/v1/edit";
      formBody = new FormData();
      formBody.append("imageUrl", image_url);
      formBody.append("background.color", options?.bg_color || "#FFFFFF");
      formBody.append("background.scaling", "fill");
      formBody.append("outputSize", options?.output_size || "1024x1024");
      formBody.append("padding", options?.padding || "0.1");
      formBody.append("shadow.mode", options?.shadow_mode || "ai.soft");
    } else {
      // Default: full product staging
      apiUrl = "https://sdk.photoroom.com/v1/edit";
      formBody = new FormData();
      formBody.append("imageUrl", image_url);
      formBody.append("background.prompt", options?.bg_prompt || "professional studio lighting, clean white background, fashion product photography");
      formBody.append("outputSize", options?.output_size || "1024x1024");
      formBody.append("padding", options?.padding || "0.05");
      formBody.append("shadow.mode", "ai.soft");
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": PHOTOROOM_API_KEY,
      },
      body: formBody,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Photoroom API error:", errText);
      return new Response(
        JSON.stringify({ error: "Photoroom API request failed", details: errText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Photoroom returns the image as binary
    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to storage
    const fileName = `enhanced_${Date.now()}.png`;
    const storagePath = `${org_id}/${garment_id || "general"}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("garment-images")
      .upload(storagePath, uint8Array, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload enhanced image", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("garment-images")
      .getPublicUrl(storagePath);

    // Deduct credits (2 credits per enhancement)
    if (org_id) {
      const { data: wallet } = await supabase
        .from("credit_wallets")
        .select("id, balance")
        .eq("org_id", org_id)
        .single();

      if (wallet && wallet.balance >= 2) {
        await supabase
          .from("credit_wallets")
          .update({ balance: wallet.balance - 2, lifetime_used: wallet.balance + 2 })
          .eq("id", wallet.id);

        await supabase.from("credit_transactions").insert({
          wallet_id: wallet.id,
          amount: -2,
          type: "debit",
          feature_type: "photo_enhancement",
          description: `Photo ${action || "staging"} - ${garment_id || "general"}`,
          balance_after: wallet.balance - 2,
        });
      }
    }

    // Update garment image if garment_id provided
    if (garment_id) {
      await supabase
        .from("garment_catalog")
        .update({ image_url: publicUrlData.publicUrl })
        .eq("id", garment_id);
    }

    return new Response(
      JSON.stringify({
        enhanced_url: publicUrlData.publicUrl,
        action: action || "stage",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("photoroom-enhance error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
