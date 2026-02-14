import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MessageLog {
  id: string;
  org_id: string;
  order_id: string | null;
  channel: "email" | "sms" | "whatsapp" | "in_app";
  recipient_type: "customer" | "org_admin" | "tailor";
  recipient_id: string;
  recipient_contact: string | null;
  event_type: string;
  subject: string | null;
  body: string | null;
  status: "pending" | "sent" | "delivered" | "failed";
  error_message: string | null;
  external_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export const useMessageLogs = (orgId: string) => {
  return useQuery({
    queryKey: ["message-logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MessageLog[];
    },
    enabled: !!orgId,
  });
};
