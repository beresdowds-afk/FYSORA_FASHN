import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  category: string;
  api_provider: string | null;
  is_enabled: boolean;
  toggle_mechanism: string;
  mvp_default: boolean;
  full_platform_default: boolean;
  requires_api_key: boolean;
  required_secret_names: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_feature_flags" as any)
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("platform_feature_flags" as any)
        .update({ is_enabled, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feature-flags"] }),
  });

  const isFeatureEnabled = (key: string): boolean => {
    const flag = flags.find((f) => f.feature_key === key);
    return flag?.is_enabled ?? false;
  };

  const getFlag = (key: string): FeatureFlag | undefined => {
    return flags.find((f) => f.feature_key === key);
  };

  const flagsByCategory = flags.reduce<Record<string, FeatureFlag[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return { flags, flagsByCategory, isLoading, toggleFlag, isFeatureEnabled, getFlag };
}
