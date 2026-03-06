import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_SYSTEM_PROMPTS: Record<string, string> = {
  tier1: `You are a professional AI body measurement assistant. Analyze a SINGLE front-facing photo of a person and estimate body measurements using visual proportions and anthropometric ratios.

Return a JSON array of measurements. Each measurement:
- "label": measurement name
- "value": estimated value (number, in inches)
- "unit": "in"
- "confidence": 0.0-1.0 (be conservative, single-photo accuracy is limited)

Capture these measurements when visible:
Chest/Bust, Waist, Hips, Shoulder Width, Sleeve Length, Inseam, Neck Circumference, Back Length

Note: Single-photo estimates have inherent limitations. Set confidence scores accordingly (typically 0.4-0.7).

IMPORTANT: Return ONLY the JSON array, no other text.`,

  tier2: `You are a professional AI body measurement assistant for a premium tailoring platform. You are analyzing MULTIPLE photos (front and side views) to create a multi-view body model with improved accuracy.

For each image, identify the viewing angle (front, side, back) and cross-reference proportions across views. Use triangulation between views to improve measurement accuracy.

Return a JSON array of measurements. Each measurement:
- "label": measurement name
- "value": estimated value (number, in inches)
- "unit": "in"
- "confidence": 0.0-1.0 (multi-view should yield 0.6-0.85)
- "source_views": array of which views contributed (e.g. ["front","side"])

Capture ALL of the following:
Chest/Bust, Waist, Hips, Shoulder Width, Sleeve Length, Inseam, Outseam, Neck Circumference, Back Length, Arm Length, Bicep Circumference, Wrist Circumference, Thigh Circumference, Calf Circumference, Torso Length, Rise (front/back), Across Back, Across Front

Cross-validate: shoulder width from front vs side depth, waist from both views, etc.

IMPORTANT: Return ONLY the JSON array, no other text.`,

  tier3: `You are an expert AI body measurement specialist processing depth-enhanced 3D scan data from a smartphone. The images include depth map information captured via ARCore/LiDAR.

Analyze the provided images which contain both RGB and depth channel data. Use the depth information to compute precise body circumferences, lengths, and volumes.

Return a JSON array of measurements. Each measurement:
- "label": measurement name
- "value": estimated value (number, in inches)
- "unit": "in"
- "confidence": 0.0-1.0 (depth-fused should yield 0.8-0.95)
- "method": "depth_fusion"

Capture ALL measurements with maximum precision:
Chest/Bust, Waist, Hips, Shoulder Width, Sleeve Length, Inseam, Outseam, Neck Circumference, Back Length, Arm Length (shoulder-elbow, elbow-wrist), Bicep Circumference, Wrist Circumference, Thigh Circumference, Calf Circumference, Ankle Circumference, Torso Length, Rise (front/back), Across Back, Across Front, Body Height, Arm Span

With depth data, provide circumference measurements by computing cross-sections at each body landmark.

IMPORTANT: Return ONLY the JSON array, no other text.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image, images, step, prompt, tier } = await req.json();

    // Support both single image (legacy/tier1) and multiple images (tier2/tier3)
    const imageList: string[] = images || (image ? [image] : []);

    if (imageList.length === 0) {
      return new Response(
        JSON.stringify({ error: "No image(s) provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const measurementTier = tier || "tier1";
    const systemPrompt = TIER_SYSTEM_PROMPTS[measurementTier] || TIER_SYSTEM_PROMPTS.tier1;

    // Build user content with all images
    const userContent: any[] = imageList.map((img: string) => ({
      type: "image_url",
      image_url: { url: img },
    }));

    const tierLabels: Record<string, string> = {
      tier1: "Basic single-photo analysis",
      tier2: "Multi-view triangulation analysis",
      tier3: "3D depth-fusion analysis",
    };

    userContent.push({
      type: "text",
      text: `Analyze ${imageList.length} image(s) for body measurements using ${tierLabels[measurementTier]}. ${prompt ? `Current step: ${prompt}` : ""}`,
    });

    // Use more capable model for tier2/3
    const model = measurementTier === "tier1"
      ? "google/gemini-2.5-flash"
      : "google/gemini-2.5-pro";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI analysis failed [${aiResponse.status}]` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let measurements = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        measurements = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("Failed to parse AI measurements:", parseErr, content);
      measurements = [];
    }

    return new Response(
      JSON.stringify({ measurements, step, tier: measurementTier }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-measure-detect error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
