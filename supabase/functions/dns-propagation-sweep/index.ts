import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESOLVERS = [
  { id: "google",     label: "Google (US)",        url: "https://dns.google/resolve" },
  { id: "cloudflare", label: "Cloudflare (Global)", url: "https://cloudflare-dns.com/dns-query" },
  { id: "quad9",      label: "Quad9 (Switzerland)", url: "https://dns.quad9.net:5053/dns-query" },
  { id: "opendns",    label: "OpenDNS (US)",        url: "https://doh.opendns.com/dns-query" },
] as const;

const RR_TYPE: Record<string, number> = { A:1, NS:2, CNAME:5, SOA:6, PTR:12, MX:15, TXT:16, AAAA:28, SRV:33, CAA:257 };

function fqdn(domain: string, name: string): string {
  if (!name || name === "@") return domain;
  if (name.endsWith(domain)) return name;
  return `${name}.${domain}`;
}

async function dohQuery(resolverUrl: string, name: string, type: string): Promise<{ values: string[]; latencyMs: number; error?: string }> {
  const t = performance.now();
  try {
    const u = new URL(resolverUrl);
    u.searchParams.set("name", name);
    u.searchParams.set("type", type);
    const res = await fetch(u.toString(), { headers: { Accept: "application/dns-json" } });
    const j = await res.json();
    const answers: any[] = j.Answer || [];
    const wanted = RR_TYPE[type] ?? -1;
    const values = answers
      .filter(a => a.type === wanted)
      .map(a => String(a.data || "").replace(/^"|"$/g, ""));
    return { values, latencyMs: Math.round(performance.now() - t) };
  } catch (e) {
    return { values: [], latencyMs: Math.round(performance.now() - t), error: (e as Error).message };
  }
}

async function checkRecord(client: ReturnType<typeof createClient>, record: any) {
  const target = fqdn(record.domain, record.name);
  for (const r of RESOLVERS) {
    const out = await dohQuery(r.url, target, record.record_type);
    const matched = record.value
      ? out.values.some(v => v.includes(String(record.value).trim()))
      : out.values.length > 0;
    await client.from("dns_propagation_checks").insert({
      record_id: record.id,
      resolver: r.id,
      resolver_label: r.label,
      found_values: out.values,
      matched,
      latency_ms: out.latencyMs,
      error: out.error ?? null,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let recordId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    recordId = body?.record_id;
  } catch { /* ignore */ }

  const q = client.from("platform_dns_records").select("id, domain, record_type, name, value");
  const { data: records, error } = recordId ? await q.eq("id", recordId) : await q.limit(200);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  for (const rec of (records || [])) {
    await checkRecord(client, rec);
  }

  return new Response(JSON.stringify({ ok: true, checked: records?.length ?? 0, resolvers: RESOLVERS.map(r => r.id) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});