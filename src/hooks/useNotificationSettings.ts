import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationSettings {
  id: string;
  org_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  notify_customer: boolean;
  notify_org_admin: boolean;
  notify_assigned_tailor: boolean;
  brand_color: string;
  email_footer_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useNotificationSettings = (orgId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_notification_settings")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationSettings | null;
    },
    enabled: !!orgId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      if (settings?.id) {
        const { error } = await supabase
          .from("org_notification_settings")
          .update(updates)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("org_notification_settings")
          .insert({ org_id: orgId, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings", orgId] });
      toast({ title: "Settings saved", description: "Notification preferences updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return { settings, isLoading, upsertSettings };
};
