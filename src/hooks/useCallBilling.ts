import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CallBillingRecord {
  id: string;
  call_log_id: string | null;
  org_id: string;
  caller_user_id: string;
  caller_type: string;
  wallet_id: string | null;
  duration_seconds: number;
  rate_per_minute: number;
  total_credits_charged: number;
  billing_status: string;
  call_type: string;
  charged_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  metadata: any;
  created_at: string;
}

export interface MeetingDocument {
  id: string;
  call_log_id: string | null;
  org_id: string;
  created_by: string;
  title: string;
  doc_type: string;
  content: string | null;
  ai_generated: boolean;
  language: string;
  duration_seconds: number | null;
  participants: any;
  tags: string[];
  is_archived: boolean;
  metadata: any;
  created_at: string;
}

export interface CallArchive {
  id: string;
  call_log_id: string | null;
  billing_record_id: string | null;
  org_id: string;
  caller_id: string;
  caller_type: string;
  call_type: string;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number;
  recording_url: string | null;
  credits_charged: number;
  quality_score: number | null;
  feedback_notes: string | null;
  archived_at: string;
  created_at: string;
}

export const useCallBilling = (orgId: string) => {
  const queryClient = useQueryClient();

  const billingRecords = useQuery({
    queryKey: ["call-billing", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_billing_records")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as CallBillingRecord[];
    },
    enabled: !!orgId,
  });

  const meetingDocs = useQuery({
    queryKey: ["meeting-documents", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_documents")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as MeetingDocument[];
    },
    enabled: !!orgId,
  });

  const archives = useQuery({
    queryKey: ["call-archives", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_call_archives")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as CallArchive[];
    },
    enabled: !!orgId,
  });

  const processCallBilling = useMutation({
    mutationFn: async (params: {
      call_log_id?: string;
      caller_user_id: string;
      caller_type: string;
      duration_seconds: number;
      call_type?: string;
      rate_per_minute?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("process-call-billing", {
        body: { org_id: orgId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-billing", orgId] });
      queryClient.invalidateQueries({ queryKey: ["call-archives", orgId] });
    },
  });

  const createMeetingDoc = useMutation({
    mutationFn: async (doc: {
      call_log_id?: string;
      title: string;
      doc_type: string;
      content: string;
      ai_generated?: boolean;
      participants?: any[];
      tags?: string[];
      duration_seconds?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("meeting_documents")
        .insert({ org_id: orgId, created_by: user!.id, ...doc })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-documents", orgId] });
    },
  });

  const archiveMeetingDoc = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("meeting_documents")
        .update({ is_archived: true })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-documents", orgId] });
    },
  });

  // Stats
  const totalCreditsCharged = (billingRecords.data || [])
    .filter(r => r.billing_status === "charged")
    .reduce((sum, r) => sum + r.total_credits_charged, 0);

  const totalCallMinutes = (billingRecords.data || [])
    .filter(r => r.billing_status === "charged")
    .reduce((sum, r) => sum + Math.ceil(r.duration_seconds / 60), 0);

  return {
    billingRecords,
    meetingDocs,
    archives,
    processCallBilling,
    createMeetingDoc,
    archiveMeetingDoc,
    totalCreditsCharged,
    totalCallMinutes,
  };
};
