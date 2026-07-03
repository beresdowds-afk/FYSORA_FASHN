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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { customerImage, garmentDescription, measurements, sessionId, orgId, customerId } = await req.json();

    if (!customerImage || !garmentDescription) {
      return new Response(
        JSON.stringify({ error: "Customer image and garment description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update session status to processing
    if (sessionId) {
      await serviceClient.from("virtual_tryon_sessions").update({ status: "processing" }).eq("id", sessionId);
    }

    // Build measurement context if available
    const measurementContext = measurements
      ? `\nCustomer measurements: ${Object.entries(measurements).map(([k, v]) => `${k}: ${v}`).join(", ")}`
      : "";

    // Use Gemini image model for virtual try-on
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a virtual fashion try-on assistant. Take this photo of a person and generate a realistic visualization of them wearing the following garment:\n\nGarment: ${garmentDescription}${measurementContext}\n\nGenerate a photorealistic image of this person wearing the described garment. Maintain the person's body proportions, skin tone, and pose. The garment should fit naturally according to their body shape. Show the full outfit from a flattering angle.`
              },
              {
                type: "image_url",
                image_url: { url: customerImage }
              }
            ]
          }
        ],
        modalities: ["image", "text"],
        max_tokens: 2000,
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);

      if (aiResponse.status === 429) {
        if (sessionId) {
          await serviceClient.from("virtual_tryon_sessions").update({ status: "failed", error_message: "Rate limited, please try again later" }).eq("id", sessionId);
        }
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        if (sessionId) {
          await serviceClient.from("virtual_tryon_sessions").update({ status: "failed", error_message: "AI credits exhausted" }).eq("id", sessionId);
        }
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (sessionId) {
        await serviceClient.from("virtual_tryon_sessions").update({ status: "failed", error_message: "AI generation failed" }).eq("id", sessionId);
      }
      return new Response(
        JSON.stringify({ error: "Virtual try-on generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const resultImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = aiData.choices?.[0]?.message?.content || "";

    // Upload result image to storage if we have a base64 image
    let storedImageUrl = resultImageUrl;
    if (resultImageUrl?.startsWith("data:image") && sessionId) {
      try {
        const base64Data = resultImageUrl.split(",")[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const path = `${orgId}/${customerId}/${sessionId}.png`;
        
        await serviceClient.storage.from("tryon-images").upload(path, imageBytes, {
          contentType: "image/png",
          upsert: true,
        });

        const { data: urlData } = serviceClient.storage.from("tryon-images").getPublicUrl(path);
        storedImageUrl = urlData.publicUrl;
      } catch (uploadErr) {
        console.error("Failed to upload try-on image:", uploadErr);
        // Keep base64 URL as fallback
      }
    }

    // Update session with result
    if (sessionId) {
      await serviceClient.from("virtual_tryon_sessions").update({
        status: "completed",
        result_image_url: storedImageUrl,
        metadata: { text_response: textResponse },
      }).eq("id", sessionId);
    }

    // Log premium feature usage
    if (orgId && customerId) {
      await serviceClient.from("premium_feature_usage").insert({
        org_id: orgId,
        user_id: customerId,
        feature_type: "virtual_tryon",
        session_id: sessionId,
        unit_price: 1.50,
        currency: "USD",
        billed_to: "user",
      });
    }

    return new Response(
      JSON.stringify({ 
        resultImage: storedImageUrl, 
        description: textResponse,
        sessionId 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("virtual-tryon error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
