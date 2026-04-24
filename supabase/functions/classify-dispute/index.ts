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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { dispute_id } = await req.json();
    if (!dispute_id) {
      return new Response(
        JSON.stringify({ error: "Missing dispute_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch dispute with related data
    const { data: dispute, error: dErr } = await supabaseAdmin
      .from("disputes")
      .select("*")
      .eq("id", dispute_id)
      .single();

    if (dErr || !dispute) {
      return new Response(
        JSON.stringify({ error: "Dispute not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related order if exists
    let orderContext = "";
    if (dispute.order_id) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("order_number, title, total_amount, currency, status, due_date")
        .eq("id", dispute.order_id)
        .single();
      if (order) {
        orderContext = `\nRelated Order: #${order.order_number} "${order.title}" - ${order.currency} ${order.total_amount}, Status: ${order.status}, Due: ${order.due_date || "N/A"}`;
      }
    }

    // Call Lovable AI with tool calling for structured output
    const systemPrompt = `You are an AI dispute resolution specialist for FYSORA FASHN (Fashion Stitches Africa), a fashion/tailoring platform. Analyze disputes and provide structured classification, sentiment analysis, and resolution recommendations.

Context: This platform connects fashion designers, tailors, and customers across Africa. Common disputes involve quality issues, delivery delays, measurement mismatches, payment problems, and communication breakdowns.

Be fair, balanced, and consider both parties. Provide actionable recommendations.`;

    const userPrompt = `Analyze this dispute and classify it:

Type: ${dispute.dispute_type}
Priority: ${dispute.priority}
Subject: ${dispute.subject}
Description: ${dispute.description || "No description provided"}
Status: ${dispute.status}
Filed at: ${dispute.created_at}
Escalation Level: ${dispute.escalation_level}${orderContext}

Classify this dispute with category, sentiment, recommended resolution, and whether it can be auto-resolved.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_dispute",
              description: "Classify a dispute with AI analysis results",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: ["quality_defect", "wrong_measurements", "late_delivery", "missing_item", "payment_overcharge", "poor_communication", "fabric_issue", "style_mismatch", "damaged_goods", "refund_request", "other"],
                    description: "The primary category of the dispute"
                  },
                  sentiment: {
                    type: "string",
                    enum: ["very_negative", "negative", "neutral", "positive"],
                    description: "The emotional sentiment of the dispute filer"
                  },
                  severity_score: {
                    type: "number",
                    description: "Severity from 1 (minor) to 10 (critical)"
                  },
                  recommended_resolution: {
                    type: "string",
                    description: "A specific actionable recommendation for resolving this dispute"
                  },
                  resolution_type: {
                    type: "string",
                    enum: ["full_refund", "partial_refund", "redo_order", "compensation_credit", "apology_only", "mediation_required", "escalate_to_admin", "no_action"],
                    description: "The type of resolution recommended"
                  },
                  can_auto_resolve: {
                    type: "boolean",
                    description: "Whether this dispute is simple enough to auto-resolve without human review"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level from 0 to 1 in the classification"
                  },
                  suggested_priority: {
                    type: "string",
                    enum: ["critical", "high", "medium", "low"],
                    description: "The AI-suggested priority level"
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of the classification reasoning"
                  }
                },
                required: ["category", "sentiment", "severity_score", "recommended_resolution", "resolution_type", "can_auto_resolve", "confidence", "suggested_priority", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_dispute" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI classification failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return a classification" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const classification = JSON.parse(toolCall.function.arguments);

    // Update the dispute with AI results
    const updates: Record<string, unknown> = {
      ai_classification: classification,
      ai_sentiment: classification.sentiment,
      ai_recommendation: classification.recommended_resolution,
      category: classification.category,
    };

    // Auto-resolve if confidence is high and AI says it's safe
    if (classification.can_auto_resolve && classification.confidence >= 0.85) {
      updates.ai_auto_resolved = true;
      updates.resolution_type = classification.resolution_type;
      updates.status = "resolved";
      updates.resolved_at = new Date().toISOString();
      updates.resolution_notes = `[Auto-resolved by AI] ${classification.reasoning}`;
    }

    await supabaseAdmin.from("disputes").update(updates).eq("id", dispute_id);

    return new Response(
      JSON.stringify({ success: true, classification, auto_resolved: updates.ai_auto_resolved || false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("classify-dispute error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
