import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve which template key to render for a given visitor of an org website.
 * Picks the highest-priority active segment rule that matches visitor context,
 * falling back to the org's published template.
 */
export async function resolveTemplateForVisitor(opts: {
  orgId: string;
  fallbackTemplateKey: string;
  visitorCountry?: string | null;
  activeCategory?: string | null;
}): Promise<string> {
  const { orgId, fallbackTemplateKey, visitorCountry, activeCategory } = opts;
  try {
    const { data } = await supabase
      .from("org_template_segment_rules")
      .select("template_key, segment_type, segment_value, priority")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    const rules = data ?? [];
    for (const r of rules) {
      if (r.segment_type === "default" && r.segment_value === "*") continue;
      if (
        r.segment_type === "location" &&
        visitorCountry &&
        (r.segment_value.toUpperCase() === visitorCountry.toUpperCase() || r.segment_value === "*")
      ) {
        return r.template_key;
      }
      if (
        r.segment_type === "category" &&
        activeCategory &&
        (r.segment_value.toLowerCase() === activeCategory.toLowerCase() || r.segment_value === "*")
      ) {
        return r.template_key;
      }
    }
    const def = rules.find((r) => r.segment_type === "default");
    if (def) return def.template_key;
  } catch {
    // ignore — fall through to fallback
  }
  return fallbackTemplateKey;
}