import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RecordKind = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA";

const SUPPORTED: RecordKind[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

function fqdn(domain: string, name: string): string {
  if (!name || name === "@") return domain;
  if (name.endsWith(".")) return name.slice(0, -1);
  if (name.endsWith(domain)) return name;
  return `${name}.${domain}`;
}

function flatten(records: unknown[]): string[] {
  return records.map((r) => {
    if (typeof r === "string") return r;
    if (Array.isArray(r)) return r.join("");
    if (r && typeof r === "object") return JSON.stringify(r);
    return String(r);
  });
}

async function resolve(name: string, kind: RecordKind): Promise<string[]> {
  try {
    // deno-lint-ignore no-explicit-any
    const r = await (Deno as any).resolveDns(name, kind);
    return flatten(r);
  } catch (e) {
    console.warn(`resolveDns ${kind} ${name} failed:`, (e as Error).message);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const recordId: string | undefined = body.record_id;
    const domain: string | undefined = body.domain;
    const name: string = body.name || "@";
    const kind: RecordKind = (body.record_type || "A").toUpperCase();
    const expected: string | undefined = body.expected_value;

    if (!domain || !SUPPORTED.includes(kind)) {
      return new Response(
        JSON.stringify({ error: "domain and a supported record_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const target = fqdn(domain, name);
    const found = await resolve(target, kind);
    const matched = expected ? found.some((v) => v.includes(expected.trim())) : found.length > 0;

    if (recordId) {
      const client = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await client
        .from("platform_dns_records")
        .update({
          last_checked_at: new Date().toISOString(),
          verified_at: matched ? new Date().toISOString() : null,
        })
        .eq("id", recordId);
    }

    return new Response(
      JSON.stringify({ target, kind, found, matched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("dns-lookup error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});