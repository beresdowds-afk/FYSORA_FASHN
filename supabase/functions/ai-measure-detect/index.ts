import "https://deno.land/std@0.168.0/dotenv/load.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image, step, prompt } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Gemini vision model to analyze the body in the image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional 360° AI body measurement assistant for a premium tailoring platform. Analyze the image of a person and estimate their body measurements with high accuracy based on visual proportions, standard anthropometric ratios, and visible reference points.

Return a JSON array of measurements. Each measurement should have:
- "label": The measurement name
- "value": The estimated measurement as a number (in inches)
- "unit": "in"
- "confidence": A confidence score between 0.0 and 1.0

Capture ALL of the following measurements when visible in the pose:
- Chest/Bust, Waist, Hips, Shoulder Width, Sleeve Length (shoulder to wrist)
- Inseam, Outseam, Neck Circumference, Back Length (nape to waist)
- Arm Length (shoulder to elbow, elbow to wrist), Bicep Circumference
- Wrist Circumference, Thigh Circumference, Calf Circumference
- Ankle Circumference, Torso Length, Rise (front and back)
- Across Back, Across Front/Chest

Step ${step + 1} instructions: ${prompt}

Based on the pose in this step, provide ALL relevant measurements you can estimate. Use conservative confidence scores. Cross-reference proportions (e.g., shoulder width ≈ 1/4 height for males) for validation.

IMPORTANT: Return ONLY the JSON array, no other text. Example:
[{"label":"Chest","value":40,"unit":"in","confidence":0.75},{"label":"Waist","value":34,"unit":"in","confidence":0.7},{"label":"Hips","value":42,"unit":"in","confidence":0.72}]`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image }
              },
              {
                type: "text",
                text: `Analyze this image for body measurements. Current step: ${prompt}`
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      return new Response(
        JSON.stringify({ error: `AI analysis failed [${aiResponse.status}]` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse the JSON from AI response
    let measurements = [];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        measurements = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("Failed to parse AI measurements:", parseErr, content);
      measurements = [];
    }

    return new Response(
      JSON.stringify({ measurements, step }),
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
