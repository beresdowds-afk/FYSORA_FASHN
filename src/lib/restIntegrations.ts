import { supabase } from "@/integrations/supabase/client";

export interface CallRestIntegrationOptions {
  slug: string;
  endpoint?: string;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
}

export interface CallRestIntegrationResult {
  status: number;
  ok: boolean;
  body: string;
}

/**
 * Single entry point for calling any registered REST API via the
 * Super Admin Keys & Secrets registry. Secrets are resolved server-side
 * inside the rest-integration-proxy edge function — they never reach the browser.
 */
export async function callRestIntegration(
  opts: CallRestIntegrationOptions,
): Promise<CallRestIntegrationResult> {
  const { data, error } = await supabase.functions.invoke("rest-integration-proxy", { body: opts });
  if (error) throw error;
  return data as CallRestIntegrationResult;
}
