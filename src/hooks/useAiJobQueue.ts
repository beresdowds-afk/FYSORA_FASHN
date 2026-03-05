import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiJob {
  id: string;
  org_id: string;
  user_id: string;
  job_type: string;
  status: string;
  priority: number;
  input_data: any;
  result_data: any;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  credits_cost: number;
  credits_deducted: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const useAiJobQueue = (orgId: string | undefined) => {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ai_job_queue")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    setJobs((data as AiJob[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Realtime subscription for job updates
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`ai-jobs-${orgId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "ai_job_queue",
        filter: `org_id=eq.${orgId}`,
      }, () => { fetchJobs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetchJobs]);

  const submitJob = async (params: {
    job_type: string;
    input_data: any;
    priority?: number;
    credits_cost?: number;
  }) => {
    const { data, error } = await supabase.functions.invoke("process-ai-job", {
      body: {
        action: "submit",
        org_id: orgId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        ...params,
      },
    });
    if (!error) await fetchJobs();
    return { data, error };
  };

  const retryJob = async (jobId: string) => {
    const { data, error } = await supabase.functions.invoke("process-ai-job", {
      body: { action: "retry", job_id: jobId },
    });
    if (!error) await fetchJobs();
    return { data, error };
  };

  const stats = {
    pending: jobs.filter(j => j.status === "pending").length,
    processing: jobs.filter(j => j.status === "processing").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
    totalCredits: jobs.filter(j => j.credits_deducted).reduce((s, j) => s + j.credits_cost, 0),
  };

  return { jobs, loading, submitJob, retryJob, stats, refetch: fetchJobs };
};
