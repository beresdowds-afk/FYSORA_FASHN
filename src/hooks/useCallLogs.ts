import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CallLog {
  id: string;
  org_id: string;
  direction: "inbound" | "outbound";
  call_sid: string | null;
  from_number: string;
  to_number: string;
  status: string;
  duration_seconds: number;
  recording_url: string | null;
  recording_sid: string | null;
  ivr_path: string[] | null;
  forwarded_to: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  notes: string | null;
  caller_name: string | null;
  created_at: string;
}

export const useCallLogs = (orgId: string) => {
  return useQuery({
    queryKey: ["call-logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as CallLog[];
    },
    enabled: !!orgId,
  });
};
