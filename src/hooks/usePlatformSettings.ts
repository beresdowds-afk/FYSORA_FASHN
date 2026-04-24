import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  id: string;
  platform_name: string;
  platform_short_name: string;
  tagline: string;
  description: string;
  vision: string;
  mission: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  website_url: string;
  logo_url: string;
  favicon_url: string;
  social_links: Record<string, string>;
  meta_keywords: string;
  copyright_text: string;
  sentinel_mcp_url: string;
  updated_at: string;
}

const DEFAULTS: PlatformSettings = {
  id: "",
  platform_name: "FYSORA FASHN (Fashion Stitches Africa)",
  platform_short_name: "FYSORA FASHN (Fashion Stitches Africa)",
  tagline: "The Future of African Fashion Tech",
  description: "Digitizing and scaling African fashion businesses through innovative technology solutions since 2024.",
  vision: "",
  mission: "",
  contact_email: "hello@fashionstitches.africa",
  contact_phone: "+234 800 123 4567",
  contact_address: "Lagos, Nigeria",
  website_url: "app.fashionstitches.africa",
  logo_url: "",
  favicon_url: "",
  social_links: {},
  meta_keywords: "",
  copyright_text: "© 2024 FYSORA FASHN (Fashion Stitches Africa). All rights reserved.",
  sentinel_mcp_url: "",
  updated_at: "",
};

let cachedSettings: PlatformSettings | null = null;
let cachePromise: Promise<PlatformSettings> | null = null;

const fetchSettings = async (): Promise<PlatformSettings> => {
  const { data } = await supabase
    .from("platform_settings" as any)
    .select("*")
    .limit(1)
    .single();
  const settings = data ? { ...DEFAULTS, ...(data as any) } : DEFAULTS;
  cachedSettings = settings;
  return settings;
};

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings>(cachedSettings || DEFAULTS);
  const [loading, setLoading] = useState(!cachedSettings);

  const refetch = useCallback(async () => {
    setLoading(true);
    cachePromise = null;
    cachedSettings = null;
    const s = await fetchSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    if (!cachePromise) cachePromise = fetchSettings();
    cachePromise.then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<PlatformSettings>) => {
    if (!settings.id) return { error: new Error("No settings row") };
    const { error } = await supabase
      .from("platform_settings" as any)
      .update(updates as any)
      .eq("id", settings.id);
    if (!error) {
      cachedSettings = null;
      cachePromise = null;
      await refetch();
    }
    return { error };
  }, [settings.id, refetch]);

  return { settings, loading, updateSettings, refetch };
};
