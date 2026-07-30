import { supabase } from "@/integrations/supabase/client";

/**
 * Structured logging + alerting for Supabase request failures.
 *
 * Classifies auth, RLS (permission), database and network/config errors,
 * emits a consistent console record, and files an alert into the Schema
 * Alerts dashboard via the `log_supabase_failure` RPC (deduplicated by
 * fingerprint server-side, throttled per session client-side).
 */

export type SupabaseFailureCategory = "auth" | "rls" | "database" | "network" | "config";

export interface SupabaseFailureContext {
  /** Table, view, RPC or edge-function name the request targeted. */
  object: string;
  /** Logical operation, e.g. "select", "insert", "signIn". */
  operation?: string;
  route?: string;
  details?: Record<string, unknown>;
}

interface NormalizedError {
  code: string;
  message: string;
  hint?: string;
  status?: number;
}

const seen = new Map<string, number>();
const THROTTLE_MS = 60_000;

function normalize(error: unknown): NormalizedError {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return {
      code: typeof e.code === "string" ? e.code : "",
      message:
        typeof e.message === "string"
          ? e.message
          : typeof e.error_description === "string"
            ? (e.error_description as string)
            : String(error),
      hint: typeof e.hint === "string" ? e.hint : undefined,
      status: typeof e.status === "number" ? e.status : undefined,
    };
  }
  return { code: "", message: String(error ?? "Unknown error") };
}

export function classifySupabaseError(error: unknown): SupabaseFailureCategory {
  const { code, message, status } = normalize(error);
  const msg = message.toLowerCase();

  if (code === "42501" || msg.includes("row-level security") || msg.includes("violates row-level")) {
    return "rls";
  }
  if (
    status === 401 ||
    status === 403 ||
    msg.includes("jwt") ||
    msg.includes("invalid api key") ||
    msg.includes("invalid login credentials") ||
    msg.includes("not authenticated") ||
    msg.includes("token is expired")
  ) {
    return "auth";
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    // A blanket fetch failure right after a key rotation is almost always a
    // stale/invalid publishable key rather than a real outage.
    return "config";
  }
  if (code) return "database";
  return "network";
}

/**
 * Report a failed Supabase call. Never throws — safe to call in any catch block.
 */
export async function reportSupabaseFailure(
  error: unknown,
  context: SupabaseFailureContext,
): Promise<SupabaseFailureCategory | null> {
  if (!error) return null;

  const { code, message, hint, status } = normalize(error);
  const category = classifySupabaseError(error);
  const fingerprint = `${category}|${context.object}|${context.operation ?? ""}|${code}|${message.slice(0, 80)}`;

  const now = Date.now();
  const last = seen.get(fingerprint);
  if (last && now - last < THROTTLE_MS) return category;
  seen.set(fingerprint, now);

  const route =
    context.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined);

  // Structured console record — picked up by any log drain.
  console.error("[FSA][supabase-failure]", {
    category,
    object: context.object,
    operation: context.operation,
    pg_code: code || null,
    http_status: status ?? null,
    message,
    hint: hint ?? null,
    route: route ?? null,
    at: new Date(now).toISOString(),
    ...context.details,
  });

  try {
    await supabase.rpc("log_supabase_failure" as any, {
      _category: category,
      _pg_code: code || null,
      _object_name: context.object,
      _message: message,
      _route: route ?? null,
      _details: {
        operation: context.operation ?? null,
        http_status: status ?? null,
        hint: hint ?? null,
        ...(context.details ?? {}),
      },
    });
  } catch {
    /* alerting must never break the caller */
  }

  return category;
}

/**
 * Wraps a Supabase query promise so failures are reported automatically.
 *
 *   const { data, error } = await withFailureReporting(
 *     supabase.from("orders").select("*"),
 *     { object: "orders", operation: "select" },
 *   );
 */
export async function withFailureReporting<T extends { error: unknown }>(
  query: PromiseLike<T>,
  context: SupabaseFailureContext,
): Promise<T> {
  try {
    const result = await query;
    if (result?.error) void reportSupabaseFailure(result.error, context);
    return result;
  } catch (thrown) {
    void reportSupabaseFailure(thrown, context);
    throw thrown;
  }
}
