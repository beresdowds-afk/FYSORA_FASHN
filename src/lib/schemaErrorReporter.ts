import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fingerprints already reported this session, to avoid RPC flooding on repeated renders.
const reported = new Set<string>();

/**
 * Report a Postgres 42703 ("column X does not exist") error to the Schema Alerts dashboard.
 * Safe to call from anywhere; silently no-ops for other error codes or when unauthenticated.
 */
export async function reportSchemaError(
  error: unknown,
  context: { table: string; route?: string },
): Promise<void> {
  if (!error || typeof error !== "object") return;
  const e = error as { code?: string; message?: string; hint?: string };
  if (e.code !== "42703") return;
  const msg = e.message ?? "";
  const m = msg.match(/column\s+"?([^\s"]+)"?\s+does not exist/i);
  const column = m?.[1] ?? "unknown";
  const fp = `${context.table}|${column}`;
  if (reported.has(fp)) return;
  reported.add(fp);
  // User-facing toast so admins know a schema alert was auto-filed
  try {
    toast.warning("Schema issue detected", {
      description: `Missing column "${column}" on ${context.table}. Auto-filed to Schema Alerts.`,
      action: {
        label: "View",
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/super-admin/schema-alerts";
          }
        },
      },
    });
  } catch { /* noop */ }
  try {
    await supabase.rpc("capture_missing_column_error", {
      _object_name: context.table,
      _column_name: column,
      _message: msg,
      _route: context.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
    });
  } catch {
    /* best-effort */
  }
}