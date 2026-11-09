import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Limits / constants ---
const ALLOWED_CALLER_TYPES = ["customer", "tailor"] as const;
const MAX_DURATION_SECONDS = 12 * 60 * 60; // 12h upper bound per call
const DEFAULT_RATE_PER_MINUTE = 0.5; // safe fallback when config is unavailable
const RATE_CONFIG_KEY = "voip_rate_per_minute";
const MAX_WALLET_UPDATE_ATTEMPTS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Require authenticated user; identity comes from the verified JWT only ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  let authUserId: string;
  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    authUserId = claimsData.claims.sub as string;
  } catch (_e) {
    return json({ error: "Unauthorized" }, 401);
  }
  // --- end auth ---

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Records denied/failed attempts for audit; never throws and never logs secrets.
  const audit = async (reason: string, details: Record<string, unknown>, orgId?: string) => {
    console.warn("process-call-billing denied/failed:", reason, { user: authUserId, ...details });
    try {
      await supabase.from("audit_logs").insert({
        user_id: authUserId,
        org_id: orgId && UUID_RE.test(orgId) ? orgId : null,
        action: "call_billing_denied",
        entity_type: "call_billing",
        new_data: { reason, ...details },
      });
    } catch (e) {
      console.error("audit log failed:", e instanceof Error ? e.message : "unknown");
    }
  };

  try {
    const reqBody = await req.json().catch(() => ({}));
    // NOTE: any client-supplied rate_per_minute is intentionally ignored.
    const {
      call_log_id,
      org_id,
      caller_user_id,
      caller_type = "customer",
      duration_seconds,
      call_type = "voip",
    } = reqBody ?? {};

    if (!org_id || !caller_user_id || !call_log_id || duration_seconds === undefined) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (![org_id, caller_user_id, call_log_id].every((v) => typeof v === "string" && UUID_RE.test(v))) {
      return json({ error: "Invalid identifier" }, 400);
    }
    if (!ALLOWED_CALLER_TYPES.includes(caller_type)) {
      await audit("invalid_caller_type", { caller_type: String(caller_type).slice(0, 32) }, org_id);
      return json({ error: "Invalid caller_type" }, 400);
    }
    if (
      typeof duration_seconds !== "number" ||
      !Number.isFinite(duration_seconds) ||
      duration_seconds < 0 ||
      duration_seconds > MAX_DURATION_SECONDS
    ) {
      await audit("invalid_duration", { duration_seconds: String(duration_seconds).slice(0, 32) }, org_id);
      return json({ error: "Invalid duration_seconds" }, 400);
    }

    // --- Authorization: who may bill which wallet ---
    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: authUserId,
      _role: "super_admin",
    });
    if (!isSuperAdmin) {
      if (caller_user_id !== authUserId) {
        await audit("cross_user_billing", { caller_user_id, call_log_id }, org_id);
        return json({ error: "Forbidden" }, 403);
      }
      if (caller_type === "tailor") {
        const { data: isMember } = await supabase.rpc("is_org_member", {
          _user_id: authUserId,
          _org_id: org_id,
        });
        if (!isMember) {
          await audit("not_org_member", { call_log_id }, org_id);
          return json({ error: "Forbidden" }, 403);
        }
      }
    }

    // --- Pricing: server-side only ---
    let ratePerMinute = DEFAULT_RATE_PER_MINUTE;
    const { data: rateRow } = await supabase
      .from("platform_fee_config")
      .select("fee_value")
      .eq("fee_key", RATE_CONFIG_KEY)
      .maybeSingle();
    const configured = Number(rateRow?.fee_value);
    if (Number.isFinite(configured) && configured >= 0) ratePerMinute = configured;

    const minutes = Math.ceil(duration_seconds / 60);
    const totalCredits = parseFloat((minutes * ratePerMinute).toFixed(2));

    const ownerId = caller_type === "tailor" ? org_id : caller_user_id;
    const ownerType = caller_type === "tailor" ? "org" : "user";

    // --- Idempotency: a call is charged at most once ---
    const existingCharge = async () => {
      const { data } = await supabase
        .from("call_billing_records")
        .select("id, billing_status, total_credits_charged, wallet_id")
        .eq("call_log_id", call_log_id)
        .in("billing_status", ["charged", "pending"])
        .limit(1)
        .maybeSingle();
      return data;
    };
    const alreadyBilled = (rec: any) => {
      if (rec.billing_status === "charged") {
        return json({
          success: true,
          already_billed: true,
          credits_charged: rec.total_credits_charged,
          billing_record_id: rec.id,
        });
      }
      return json({ error: "Billing for this call is already in progress" }, 409);
    };

    const prior = await existingCharge();
    if (prior) return alreadyBilled(prior);

    const baseRecord = {
      call_log_id,
      org_id,
      caller_user_id,
      caller_type,
      duration_seconds: Math.round(duration_seconds),
      rate_per_minute: ratePerMinute,
      total_credits_charged: totalCredits,
      call_type,
    };

    const failRecord = async (wallet_id: string | null, metadata: Record<string, unknown>) => {
      await supabase.from("call_billing_records").insert({
        ...baseRecord,
        wallet_id,
        billing_status: "failed",
        metadata,
      });
    };

    const { data: wallet0, error: walletErr } = await supabase
      .from("credit_wallets")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("owner_type", ownerType)
      .maybeSingle();

    if (walletErr || !wallet0) {
      await failRecord(null, { error: "No wallet found" });
      await audit("no_wallet", { call_log_id }, org_id);
      return json({ error: "No credit wallet found", billing_status: "failed" }, 402);
    }

    // Claim the call with a 'pending' record. A partial unique index on
    // call_log_id (pending/charged) makes concurrent duplicates fail with 23505.
    const { data: claim, error: claimErr } = await supabase
      .from("call_billing_records")
      .insert({ ...baseRecord, wallet_id: wallet0.id, billing_status: "pending" })
      .select("id")
      .single();
    if (claimErr || !claim) {
      if ((claimErr as any)?.code === "23505") {
        const dup = await existingCharge();
        if (dup) return alreadyBilled(dup);
      }
      console.error("billing claim failed:", claimErr?.message);
      return json({ error: "Unable to start billing" }, 500);
    }

    const markFailed = (metadata: Record<string, unknown>) =>
      supabase.from("call_billing_records")
        .update({ billing_status: "failed", metadata, updated_at: new Date().toISOString() })
        .eq("id", claim.id);

    // Race-safe debit: conditional update (compare-and-swap on current balance).
    let wallet: any = wallet0;
    let newBalance = 0;
    let debited = false;
    for (let attempt = 0; attempt < MAX_WALLET_UPDATE_ATTEMPTS; attempt++) {
      if (Number(wallet.balance) < totalCredits) {
        await markFailed({ error: "Insufficient balance", balance: wallet.balance });
        await audit("insufficient_balance", { call_log_id }, org_id);
        return json({ error: "Insufficient credits", balance: wallet.balance, required: totalCredits }, 402);
      }
      newBalance = parseFloat((Number(wallet.balance) - totalCredits).toFixed(2));
      const { data: updated } = await supabase
        .from("credit_wallets")
        .update({
          balance: newBalance,
          lifetime_used: Number(wallet.lifetime_used) + totalCredits,
        })
        .eq("id", wallet.id)
        .eq("balance", wallet.balance)
        .select("id")
        .maybeSingle();
      if (updated) { debited = true; break; }
      // Balance changed concurrently: re-read and retry.
      const { data: fresh } = await supabase.from("credit_wallets").select("*").eq("id", wallet.id).maybeSingle();
      if (!fresh) break;
      wallet = fresh;
    }
    if (!debited) {
      await markFailed({ error: "Wallet update conflict" });
      await audit("wallet_conflict", { call_log_id }, org_id);
      return json({ error: "Could not update wallet, please retry" }, 409);
    }

    await supabase.from("credit_transactions").insert({
      wallet_id: wallet.id,
      type: "deduction",
      amount: -totalCredits,
      balance_after: newBalance,
      feature_type: "voip_call",
      description: `VoIP ${call_type} call - ${minutes} min${minutes > 1 ? "s" : ""}`,
      session_id: call_log_id,
    });

    const { data: billingRecord } = await supabase
      .from("call_billing_records")
      .update({
        billing_status: "charged",
        charged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", claim.id)
      .select()
      .single();

    await supabase.from("platform_call_archives").insert({
      call_log_id,
      billing_record_id: claim.id,
      org_id,
      caller_id: caller_user_id,
      caller_type,
      call_type,
      duration_seconds: Math.round(duration_seconds),
      credits_charged: totalCredits,
    });

    return json({
      success: true,
      credits_charged: totalCredits,
      new_balance: newBalance,
      billing_record_id: billingRecord?.id ?? claim.id,
    });
  } catch (err) {
    console.error("process-call-billing error:", err instanceof Error ? err.message : "unknown");
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
