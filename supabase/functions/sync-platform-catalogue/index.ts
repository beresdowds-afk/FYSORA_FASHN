// Sync approved items from org_catalogue_items, tailor_catalogue_items, and
// garment_catalog into the unified platform_catalogue_feed so all PWAs see
// the same list. Cron-driven (every 10 min) — see cron job in DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const report = { org: 0, tailor: 0, garment: 0, errors: [] as string[] };

  try {
    // 1) org_catalogue_items (available only)
    const { data: orgItems, error: e1 } = await supabase
      .from("org_catalogue_items")
      .select("id, org_id, name, description, category, image_url, price, currency, tags, is_available")
      .eq("is_available", true)
      .limit(1000);
    if (e1) report.errors.push(`org_catalogue_items: ${e1.message}`);
    if (orgItems) {
      const rows = orgItems.map((r: any) => ({
        source_table: "org_catalogue_items",
        source_id: r.id,
        org_id: r.org_id,
        owner_user_id: null,
        title: r.name,
        description: r.description,
        image_url: r.image_url,
        price: r.price,
        currency: r.currency || "NGN",
        category: r.category,
        tags: r.tags,
        is_available: r.is_available,
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("platform_catalogue_feed")
        .upsert(rows, { onConflict: "source_table,source_id" });
      if (error) report.errors.push(`upsert org: ${error.message}`);
      report.org = rows.length;
    }

    // 2) tailor_catalogue_items
    const { data: tailorItems, error: e2 } = await supabase
      .from("tailor_catalogue_items")
      .select("id, tailor_id, name, description, category, image_url, price, currency, tags, is_available")
      .eq("is_available", true)
      .limit(1000);
    if (e2) report.errors.push(`tailor_catalogue_items: ${e2.message}`);
    if (tailorItems) {
      const rows = tailorItems.map((r: any) => ({
        source_table: "tailor_catalogue_items",
        source_id: r.id,
        org_id: null,
        owner_user_id: r.tailor_id,
        title: r.name,
        description: r.description,
        image_url: r.image_url,
        price: r.price,
        currency: r.currency || "NGN",
        category: r.category,
        tags: r.tags,
        is_available: r.is_available,
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("platform_catalogue_feed")
        .upsert(rows, { onConflict: "source_table,source_id" });
      if (error) report.errors.push(`upsert tailor: ${error.message}`);
      report.tailor = rows.length;
    }

    // 3) garment_catalog (designer / shared garments)
    const { data: garmentItems, error: e3 } = await supabase
      .from("garment_catalog")
      .select("id, org_id, name, description, category, image_url, price, currency, is_available")
      .eq("is_available", true)
      .limit(1000);
    if (e3) report.errors.push(`garment_catalog: ${e3.message}`);
    if (garmentItems) {
      const rows = garmentItems.map((r: any) => ({
        source_table: "garment_catalog",
        source_id: r.id,
        org_id: r.org_id,
        owner_user_id: null,
        title: r.name,
        description: r.description,
        image_url: r.image_url,
        price: r.price,
        currency: r.currency || "NGN",
        category: r.category,
        tags: null,
        is_available: r.is_available,
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("platform_catalogue_feed")
        .upsert(rows, { onConflict: "source_table,source_id" });
      if (error) report.errors.push(`upsert garment: ${error.message}`);
      report.garment = rows.length;
    }
  } catch (e) {
    report.errors.push(String((e as Error).message || e));
  }

  return new Response(JSON.stringify({ ok: report.errors.length === 0, report }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
