import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BACKUP_TABLES = [
  "organizations", "org_members", "profiles", "orders", "order_items",
  "order_status_history", "payments", "customers_registrations", "measurement_profiles",
  "org_notification_settings", "disputes", "shipments", "shipment_tracking_events",
  "delivery_flags", "org_carrier_settings", "org_api_keys", "org_subscriptions",
  "org_websites", "org_catalogue_items", "exchange_rates", "message_logs",
  "notifications", "ai_measurement_bookings", "premium_feature_usage",
  "platform_fee_ledger",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, backup_id, tables } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create") {
      // Create a backup by exporting all table data to a JSON snapshot
      const tablesToBackup = tables || BACKUP_TABLES;
      const snapshot: Record<string, unknown[]> = {};
      const stats: Record<string, number> = {};
      let totalRows = 0;

      for (const table of tablesToBackup) {
        try {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select("*")
            .limit(10000);
          
          if (!error && data) {
            snapshot[table] = data;
            stats[table] = data.length;
            totalRows += data.length;
          } else {
            stats[table] = -1; // error
          }
        } catch {
          stats[table] = -1;
        }
      }

      const backupData = {
        version: "2.0.0",
        platform: "FYSORA FASHN (Fashion Stitches Africa)",
        created_at: new Date().toISOString(),
        tables_count: Object.keys(snapshot).length,
        total_rows: totalRows,
        stats,
        data: snapshot,
      };

      // Store backup as a JSON file in storage
      const backupId = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      const fileName = `${backupId}.json`;

      // Ensure backup bucket exists
      const { error: bucketErr } = await supabaseAdmin.storage.getBucket("backups");
      if (bucketErr) {
        await supabaseAdmin.storage.createBucket("backups", { public: false });
      }

      const jsonBlob = new Blob([JSON.stringify(backupData)], { type: "application/json" });
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("backups")
        .upload(fileName, jsonBlob, { contentType: "application/json", upsert: true });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          backup_id: backupId,
          file_name: fileName,
          tables_count: Object.keys(snapshot).length,
          total_rows: totalRows,
          stats,
          created_at: backupData.created_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "list") {
      // List all backups from storage
      const { data: files, error } = await supabaseAdmin.storage
        .from("backups")
        .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const backups = (files || [])
        .filter(f => f.name.endsWith(".json"))
        .map(f => ({
          id: f.name.replace(".json", ""),
          file_name: f.name,
          created_at: f.created_at,
          size_bytes: f.metadata?.size || 0,
        }));

      return new Response(
        JSON.stringify({ success: true, backups }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      if (!backup_id) {
        return new Response(
          JSON.stringify({ error: "Missing backup_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileName = backup_id.endsWith(".json") ? backup_id : `${backup_id}.json`;
      const { data, error } = await supabaseAdmin.storage
        .from("backups")
        .download(fileName);

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Backup file not found", valid: false }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        const isValid = parsed.version && parsed.data && parsed.tables_count > 0;

        return new Response(
          JSON.stringify({
            success: true,
            valid: isValid,
            version: parsed.version,
            tables_count: parsed.tables_count,
            total_rows: parsed.total_rows,
            created_at: parsed.created_at,
            stats: parsed.stats,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ valid: false, error: "Corrupted backup file" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

    } else if (action === "restore") {
      if (!backup_id) {
        return new Response(
          JSON.stringify({ error: "Missing backup_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileName = backup_id.endsWith(".json") ? backup_id : `${backup_id}.json`;
      const { data, error } = await supabaseAdmin.storage
        .from("backups")
        .download(fileName);

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Backup file not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const text = await data.text();
      const parsed = JSON.parse(text);
      const restoreResults: Record<string, { success: boolean; rows: number; error?: string }> = {};

      // Restore tables specified or all
      const tablesToRestore = tables || Object.keys(parsed.data);

      for (const table of tablesToRestore) {
        if (!parsed.data[table]) {
          restoreResults[table] = { success: false, rows: 0, error: "Not found in backup" };
          continue;
        }

        const rows = parsed.data[table];
        if (rows.length === 0) {
          restoreResults[table] = { success: true, rows: 0 };
          continue;
        }

        try {
          const { error: upsertErr } = await supabaseAdmin
            .from(table)
            .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

          restoreResults[table] = upsertErr
            ? { success: false, rows: 0, error: upsertErr.message }
            : { success: true, rows: rows.length };
        } catch (e) {
          restoreResults[table] = { success: false, rows: 0, error: e.message };
        }
      }

      return new Response(
        JSON.stringify({ success: true, results: restoreResults }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: create, list, verify, restore" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("data-backup error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
