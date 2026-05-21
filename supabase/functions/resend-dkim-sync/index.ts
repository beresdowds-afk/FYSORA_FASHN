import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Fetches DKIM records from Resend for every domain known to platform_dns_records
 * and updates the stored DKIM TXT record values when they change. Audit rows are
 * written to dns_record_audit for traceability.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND = Deno.env.get("RESEND_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // We use Resend directly when RESEND_API_KEY is set; otherwise gateway via LOVABLE_API_KEY.
  const useDirect = !!RESEND;
  const baseUrl = useDirect ? "https://api.resend.com" : "https://connector-gateway.lovable.dev/resend";
  const authHeaders: Record<string, string> = useDirect
    ? { Authorization: `Bearer ${RESEND}` }
    : { Authorization: `Bearer ${LOVABLE ?? ""}`, "X-Connection-Api-Key": RESEND ?? "" };

  try {
    // List Resend domains
    const listRes = await fetch(`${baseUrl}/domains`, { headers: authHeaders });
    if (!listRes.ok) {
      const t = await listRes.text();
      return new Response(JSON.stringify({ error: `Resend list domains failed: ${listRes.status} ${t.slice(0,160)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const list = await listRes.json();
    const domains: any[] = list?.data || list || [];
    const changes: any[] = [];

    for (const d of domains) {
      const detail = await fetch(`${baseUrl}/domains/${d.id}`, { headers: authHeaders }).then(r => r.json()).catch(() => null);
      const records: any[] = detail?.records || [];

      for (const rec of records) {
        if ((rec.record || rec.type)?.toUpperCase() !== "TXT") continue;
        const name: string = rec.name || "";
        if (!/_domainkey/i.test(name)) continue;
        const value: string = (rec.value || "").trim();
        const domain: string = d.name;

        // Try match an existing platform_dns_records row
        const { data: existing } = await client
          .from("platform_dns_records")
          .select("id, value")
          .eq("domain", domain)
          .eq("record_type", "TXT")
          .eq("name", name)
          .maybeSingle();

        if (existing) {
          if ((existing as any).value?.trim() !== value) {
            await client.from("platform_dns_records")
              .update({ value, verified_at: null, last_checked_at: new Date().toISOString(), purpose: "dkim" })
              .eq("id", (existing as any).id);
            await client.from("dns_record_audit").insert({
              record_id: (existing as any).id,
              domain, record_type: "TXT", name,
              old_value: (existing as any).value,
              new_value: value,
              source: "resend_dkim_sync",
            });
            changes.push({ domain, name, action: "updated" });
          }
        } else {
          const ins = await client.from("platform_dns_records").insert({
            domain, record_type: "TXT", name, value, ttl: 3600, purpose: "dkim",
            notes: "Auto-synced from Resend",
          }).select("id").maybeSingle();
          await client.from("dns_record_audit").insert({
            record_id: (ins.data as any)?.id ?? null,
            domain, record_type: "TXT", name,
            old_value: null, new_value: value,
            source: "resend_dkim_sync",
          });
          changes.push({ domain, name, action: "inserted" });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, changes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resend-dkim-sync", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});