import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Exponential backoff: 2^retry * 1000ms (1s, 2s, 4s)
function getBackoffMs(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount) * 1000, 30000);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    const { action, job_id, org_id, user_id, job_type, input_data, priority, credits_cost } = await req.json();

    // Action: submit - create a new job
    if (action === "submit") {
      if (!org_id || !user_id || !job_type) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check credit balance
      const { data: wallet } = await serviceClient
        .from("credit_wallets")
        .select("id, balance")
        .eq("owner_id", org_id)
        .eq("owner_type", "org")
        .single();

      const cost = credits_cost || getCreditCost(job_type);
      if (wallet && wallet.balance < cost) {
        return new Response(JSON.stringify({ error: "Insufficient credits", balance: wallet.balance, required: cost }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create job
      const { data: job, error } = await serviceClient.from("ai_job_queue").insert({
        org_id, user_id, job_type,
        input_data: input_data || {},
        priority: priority || 5,
        credits_cost: cost,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Process immediately (async fire-and-forget via self-invocation would be ideal but we process inline)
      const result = await processJob(serviceClient, job, LOVABLE_API_KEY!);

      return new Response(JSON.stringify({ job: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: retry - retry a failed job
    if (action === "retry" && job_id) {
      const { data: job } = await serviceClient.from("ai_job_queue")
        .select("*").eq("id", job_id).single();

      if (!job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (job.retry_count >= job.max_retries) {
        return new Response(JSON.stringify({ error: "Max retries exceeded" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient.from("ai_job_queue").update({
        status: "pending",
        retry_count: job.retry_count + 1,
        error_message: null,
      }).eq("id", job_id);

      const result = await processJob(serviceClient, { ...job, retry_count: job.retry_count + 1 }, LOVABLE_API_KEY!);
      return new Response(JSON.stringify({ job: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: status - get job status
    if (action === "status" && job_id) {
      const { data: job } = await serviceClient.from("ai_job_queue")
        .select("*").eq("id", job_id).single();
      return new Response(JSON.stringify({ job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list - list jobs for org
    if (action === "list") {
      const { data: jobs } = await serviceClient.from("ai_job_queue")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(50);
      return new Response(JSON.stringify({ jobs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: expire_credits - expire credits older than 365 days
    if (action === "expire_credits") {
      const { data: expired } = await serviceClient
        .from("credit_transactions")
        .select("id, wallet_id, amount")
        .eq("type", "purchase")
        .eq("expired", false)
        .lt("expires_at", new Date().toISOString());

      let expiredCount = 0;
      for (const tx of expired || []) {
        await serviceClient.from("credit_transactions").update({ expired: true }).eq("id", tx.id);
        // Deduct from wallet
        const { data: wallet } = await serviceClient.from("credit_wallets")
          .select("balance").eq("id", tx.wallet_id).single();
        if (wallet) {
          const remaining = Math.max(0, wallet.balance - tx.amount);
          await serviceClient.from("credit_wallets").update({ balance: remaining }).eq("id", tx.wallet_id);
          await serviceClient.from("credit_transactions").insert({
            wallet_id: tx.wallet_id,
            type: "expiry",
            amount: -tx.amount,
            balance_after: remaining,
            description: "Credits expired after 365 days (FASHN policy)",
            expires_at: null,
          });
        }
        expiredCount++;
      }

      return new Response(JSON.stringify({ expired_count: expiredCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-ai-job error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getCreditCost(jobType: string): number {
  switch (jobType) {
    case "virtual_tryon": return 1.50;
    case "ai_measurement": return 5.00;
    case "garment_catalog_sync": return 0;
    default: return 0;
  }
}

async function processJob(serviceClient: any, job: any, apiKey: string) {
  try {
    await serviceClient.from("ai_job_queue").update({
      status: "processing", started_at: new Date().toISOString(),
    }).eq("id", job.id);

    let result: any;
    const maxAttempts = job.max_retries - job.retry_count + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (job.job_type === "virtual_tryon") {
          result = await processVirtualTryon(serviceClient, job, apiKey);
        } else if (job.job_type === "ai_measurement") {
          result = await processAiMeasurement(serviceClient, job, apiKey);
        } else if (job.job_type === "garment_catalog_sync") {
          result = await processCatalogSync(serviceClient, job);
        }
        break; // Success
      } catch (retryErr: any) {
        if (retryErr.status === 429 && attempt < maxAttempts - 1) {
          const backoff = getBackoffMs(attempt);
          console.log(`Rate limited, retrying in ${backoff}ms (attempt ${attempt + 1})`);
          await sleep(backoff);
          continue;
        }
        throw retryErr;
      }
    }

    // Deduct credits
    if (job.credits_cost > 0) {
      await deductCredits(serviceClient, job.org_id, job.credits_cost, job.job_type, job.id);
    }

    await serviceClient.from("ai_job_queue").update({
      status: "completed",
      result_data: result,
      completed_at: new Date().toISOString(),
      credits_deducted: true,
    }).eq("id", job.id);

    return { ...job, status: "completed", result_data: result };
  } catch (err: any) {
    console.error(`Job ${job.id} failed:`, err);
    await serviceClient.from("ai_job_queue").update({
      status: "failed",
      error_message: err.message || "Unknown error",
      retry_count: job.retry_count + 1,
      next_retry_at: job.retry_count < job.max_retries
        ? new Date(Date.now() + getBackoffMs(job.retry_count)).toISOString()
        : null,
    }).eq("id", job.id);

    return { ...job, status: "failed", error_message: err.message };
  }
}

async function deductCredits(serviceClient: any, orgId: string, amount: number, featureType: string, jobId: string) {
  const { data: wallet } = await serviceClient
    .from("credit_wallets")
    .select("id, balance")
    .eq("owner_id", orgId)
    .eq("owner_type", "org")
    .single();

  if (!wallet) {
    // Auto-create wallet
    const { data: newWallet } = await serviceClient.from("credit_wallets").insert({
      owner_type: "org", owner_id: orgId, org_id: orgId, balance: 0,
    }).select().single();
    if (newWallet) {
      await serviceClient.from("credit_transactions").insert({
        wallet_id: newWallet.id, type: "deduction", amount: -amount,
        balance_after: -amount, feature_type: featureType, session_id: jobId,
        description: `${featureType} credit deduction`,
      });
      await serviceClient.from("credit_wallets").update({
        balance: -amount, lifetime_used: amount,
      }).eq("id", newWallet.id);
    }
    return;
  }

  const newBalance = wallet.balance - amount;
  await serviceClient.from("credit_transactions").insert({
    wallet_id: wallet.id, type: "deduction", amount: -amount,
    balance_after: newBalance, feature_type: featureType, session_id: jobId,
    description: `${featureType} credit deduction`,
  });
  await serviceClient.from("credit_wallets").update({
    balance: newBalance, lifetime_used: wallet.balance - newBalance,
  }).eq("id", wallet.id);
}

async function processVirtualTryon(serviceClient: any, job: any, apiKey: string) {
  const { customerImage, garmentDescription, measurements, sessionId } = job.input_data;

  if (sessionId) {
    await serviceClient.from("virtual_tryon_sessions").update({ status: "processing" }).eq("id", sessionId);
  }

  const measurementContext = measurements
    ? `\nCustomer measurements: ${Object.entries(measurements).map(([k, v]) => `${k}: ${v}`).join(", ")}`
    : "";

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `You are a FASHN virtual fashion try-on assistant. Take this photo and generate a photorealistic visualization wearing:\n\nGarment: ${garmentDescription}${measurementContext}\n\nGenerate a photorealistic image maintaining body proportions, skin tone, and pose.` },
          { type: "image_url", image_url: { url: customerImage } },
        ],
      }],
      modalities: ["image", "text"],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  });

  if (!aiResponse.ok) {
    const err: any = new Error(`AI failed: ${aiResponse.status}`);
    err.status = aiResponse.status;
    throw err;
  }

  const aiData = await aiResponse.json();
  const resultImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const textResponse = aiData.choices?.[0]?.message?.content || "";

  let storedImageUrl = resultImageUrl;
  if (resultImageUrl?.startsWith("data:image") && sessionId) {
    try {
      const base64Data = resultImageUrl.split(",")[1];
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const path = `${job.org_id}/${job.user_id}/${sessionId}.png`;
      await serviceClient.storage.from("tryon-images").upload(path, imageBytes, { contentType: "image/png", upsert: true });
      const { data: urlData } = serviceClient.storage.from("tryon-images").getPublicUrl(path);
      storedImageUrl = urlData.publicUrl;
    } catch { /* keep base64 */ }
  }

  if (sessionId) {
    await serviceClient.from("virtual_tryon_sessions").update({
      status: "completed", result_image_url: storedImageUrl,
      metadata: { text_response: textResponse },
    }).eq("id", sessionId);
  }

  // Log premium usage
  await serviceClient.from("premium_feature_usage").insert({
    org_id: job.org_id, user_id: job.user_id,
    feature_type: "virtual_tryon", session_id: sessionId,
    unit_price: 1.50, currency: "USD", billed_to: "user",
  });

  return { resultImage: storedImageUrl, description: textResponse };
}

async function processAiMeasurement(serviceClient: any, job: any, apiKey: string) {
  const { image, step, prompt } = job.input_data;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You are a 360° AI body measurement assistant. Analyze the image and return a JSON array of measurements with label, value (inches), unit "in", and confidence (0-1). Capture: Chest, Waist, Hips, Shoulder Width, Sleeve Length, Inseam, Outseam, Neck, Back Length, Arm Length, Bicep, Wrist, Thigh, Calf, Ankle, Torso Length, Rise. Step ${(step || 0) + 1}: ${prompt || "Analyze full body"}\n\nReturn ONLY JSON array.` },
        { role: "user", content: [{ type: "image_url", image_url: { url: image } }, { type: "text", text: `Analyze for body measurements. Step: ${prompt || "full body"}` }] },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  if (!aiResponse.ok) {
    const err: any = new Error(`AI failed: ${aiResponse.status}`);
    err.status = aiResponse.status;
    throw err;
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || "[]";
  let measurements = [];
  try {
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) measurements = JSON.parse(jsonMatch[0]);
  } catch { measurements = []; }

  await serviceClient.from("premium_feature_usage").insert({
    org_id: job.org_id, user_id: job.user_id,
    feature_type: "ai_measurement", unit_price: 5.00,
    currency: "USD", billed_to: "org",
  });

  return { measurements, step };
}

async function processCatalogSync(serviceClient: any, job: any) {
  const { garment_id } = job.input_data;
  const { data: garment } = await serviceClient.from("garment_catalog")
    .select("*").eq("id", garment_id).single();

  if (!garment) throw new Error("Garment not found");

  // Sync to org_catalogue_items if enabled
  if (garment.sync_to_catalogue) {
    await serviceClient.from("org_catalogue_items").upsert({
      org_id: garment.org_id,
      name: garment.name,
      description: garment.description,
      category: garment.category,
      image_url: garment.image_url,
      price: garment.price,
      currency: garment.currency,
      tags: garment.tags,
      is_available: garment.is_published,
    }, { onConflict: "org_id,name" });
  }

  return { synced: true, garment_id };
}
