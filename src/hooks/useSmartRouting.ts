import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SmartRouteParams {
  to: string;
  message: string;
  media_url?: string;
  org_id: string;
  owner_id?: string;
  process_type?: string;
  priority?: "normal" | "urgent";
  event_type?: string;
  order_id?: string;
  recipient_id?: string;
  recipient_type?: string;
  force_channel?: string;
  force_provider?: string;
}

export const useSmartRouting = () => {
  const sendMessage = useMutation({
    mutationFn: async (params: SmartRouteParams) => {
      const { data, error } = await supabase.functions.invoke("smart-route-message", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
  });

  return { sendMessage };
};
