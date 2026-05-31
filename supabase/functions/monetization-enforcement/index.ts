import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map fee_type -> {function, feature}
const FEE_MAP: Record<string, { fn?: string; feat?: string }> = {
  customer_surcharge: { fn: "billing", feat: "customer_surcharge" },
  org_admin_fee: { fn: "billing", feat: "org_admin_fee" },
  website_builder_lite: { fn: "website_builder", feat: "lite" },
  website_builder_pro: { fn: "website_builder", feat: "pro" },
  website_builder_pro_lite: { fn: "website_builder", feat: "pro_lite" },
  subscription: { fn: "subscriptions" },
  registration: { fn: "registration" },
  messaging_sms: { fn: "messaging", feat: "sms" },
  messaging_whatsapp: { fn: "messaging", feat: "whatsapp" },
  messaging_email: { fn: "messaging", feat: "email" },
  sentinel_seo_request: { fn: "sentinel", feat: "seo" },
  mobile_app: { fn: "mobile_app" },
  custom_domain_external: { fn: "website_builder", feat: "custom_domain" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Master switch check
  const { data: master } = await svc.from("monetization_switches")
    .select("is_enabled").eq("scope_type", "global").eq("scope_key", "master").maybeSingle();
  const masterOn = master?.is_enabled !== false;

  // Sweep pending/charged fees and waive any whose scope is disabled
  const { data: fees } = await svc.from("platform_fee_ledger")
    .select("id,fee_type,amount,org_id,status")
    .in("status", ["pending", "charged"]).limit(1000);

  let waived = 0;
  const waivedIds: string[] = [];
  for (const f of fees ?? []) {
    const map = FEE_MAP[f.fee_type] ?? {};
    const { data: ok } = await svc.rpc("is_monetization_enabled", {
      _function: map.fn ?? null,
      _feature: map.feat ?? null,
      _user_type: null,
    });
    if (!masterOn || ok === false) {
      await svc.from("platform_fee_ledger").update({
        status: "waived", settled_at: new Date().toISOString(),
      }).eq("id", f.id);
      waived++;
      waivedIds.push(f.id);
    }
  }

  if (waived > 0) {
    await svc.from("audit_logs").insert({
      action: "monetization_enforcement_waived",
      entity_type: "platform_fee_ledger",
      metadata: { waived_count: waived, fee_ids: waivedIds, master_on: masterOn },
    });
  }

  return new Response(JSON.stringify({
    ok: true, master_on: masterOn, scanned: fees?.length ?? 0, waived,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});