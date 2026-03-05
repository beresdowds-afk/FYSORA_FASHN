import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmbedConfiguration {
  id: string;
  org_id: string;
  widget_key: string;
  is_enabled: boolean;
  allowed_domains: string[];
  enabled_features: string[];
  theme_config: Record<string, any>;
  branding_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmbedConfig = (orgId: string | undefined) => {
  const [config, setConfig] = useState<EmbedConfiguration | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("embed_configurations")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();
    setConfig(data as EmbedConfiguration | null);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const upsertConfig = async (updates: Partial<EmbedConfiguration>) => {
    if (!orgId) return { error: new Error("No org") };
    if (config) {
      const { error } = await supabase
        .from("embed_configurations")
        .update(updates as any)
        .eq("id", config.id);
      if (!error) await fetchConfig();
      return { error };
    } else {
      const { error } = await supabase
        .from("embed_configurations")
        .insert({ org_id: orgId, ...updates } as any);
      if (!error) await fetchConfig();
      return { error };
    }
  };

  return { config, loading, upsertConfig, refetch: fetchConfig };
};
