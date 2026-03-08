import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RegionalOperation {
  id: string;
  region_code: string;
  region_name: string;
  country_codes: string[];
  flag_emoji: string;
  is_active: boolean;
  currency: string;
  timezone: string;
  payments_enabled: boolean;
  subscriptions_enabled: boolean;
  marketplace_enabled: boolean;
  logistics_enabled: boolean;
  communications_enabled: boolean;
  ai_features_enabled: boolean;
  virtual_tryon_enabled: boolean;
  video_calls_enabled: boolean;
  website_builder_enabled: boolean;
  mobile_app_enabled: boolean;
  available_gateways: string[];
  available_carriers: string[];
  available_messaging_providers: string[];
  notes: string | null;
  launched_at: string | null;
  created_at: string;
  updated_at: string;
}

export const FEATURE_TOGGLES = [
  { key: "payments_enabled", label: "Payments", icon: "💳" },
  { key: "subscriptions_enabled", label: "Subscriptions", icon: "👑" },
  { key: "marketplace_enabled", label: "Marketplace", icon: "🛍️" },
  { key: "logistics_enabled", label: "Logistics", icon: "🚚" },
  { key: "communications_enabled", label: "Communications", icon: "💬" },
  { key: "ai_features_enabled", label: "AI Features", icon: "🤖" },
  { key: "virtual_tryon_enabled", label: "Virtual Try-On", icon: "👗" },
  { key: "video_calls_enabled", label: "Video Calls", icon: "📹" },
  { key: "website_builder_enabled", label: "Website Builder", icon: "🌐" },
  { key: "mobile_app_enabled", label: "Mobile App", icon: "📱" },
] as const;

export type FeatureToggleKey = (typeof FEATURE_TOGGLES)[number]["key"];

export function useRegionalOperations() {
  const queryClient = useQueryClient();

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["regional-operations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regional_operations" as any)
        .select("*")
        .order("is_active", { ascending: false })
        .order("region_name");
      if (error) throw error;
      return (data || []) as unknown as RegionalOperation[];
    },
  });

  const updateRegion = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RegionalOperation> }) => {
      const { error } = await supabase
        .from("regional_operations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["regional-operations"] }),
  });

  const activeRegions = regions.filter(r => r.is_active);
  const inactiveRegions = regions.filter(r => !r.is_active);

  const isRegionFeatureEnabled = (regionCode: string, feature: FeatureToggleKey): boolean => {
    const region = regions.find(r => r.region_code === regionCode);
    if (!region || !region.is_active) return false;
    return region[feature] ?? false;
  };

  return { regions, activeRegions, inactiveRegions, isLoading, updateRegion, isRegionFeatureEnabled };
}
