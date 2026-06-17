import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WebsiteTemplate } from "@/config/websiteTemplates";

export interface CustomTemplateRow {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  category: WebsiteTemplate["category"];
  design: WebsiteTemplate["design"];
  copy: WebsiteTemplate["copy"];
  is_active: boolean;
  created_at: string;
}

export function rowToTemplate(r: CustomTemplateRow): WebsiteTemplate {
  return {
    id: r.template_key,
    name: r.name,
    description: r.description ?? "",
    category: r.category,
    design: r.design,
    copy: r.copy,
  };
}

export function useCustomWebsiteTemplates() {
  const [rows, setRows] = useState<CustomTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("custom_website_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(((data ?? []) as unknown) as CustomTemplateRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, reload: load };
}
