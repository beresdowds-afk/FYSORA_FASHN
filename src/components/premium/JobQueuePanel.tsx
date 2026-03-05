import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock, CheckCircle, XCircle, Loader2, Zap } from "lucide-react";
import { useAiJobQueue } from "@/hooks/useAiJobQueue";
import { useToast } from "@/hooks/use-toast";

interface JobQueuePanelProps {
  orgId: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  processing: { icon: Loader2, color: "text-blue-500", label: "Processing" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", label: "Cancelled" },
};

const jobTypeLabels: Record<string, string> = {
  virtual_tryon: "FASHN Virtual Try-On",
  ai_measurement: "360° AI Measurement",
  garment_catalog_sync: "Catalog Sync",
};

const JobQueuePanel = ({ orgId }: JobQueuePanelProps) => {
  const { jobs, loading, retryJob, stats, refetch } = useAiJobQueue(orgId);
  const { toast } = useToast();

  const handleRetry = async (jobId: string) => {
    const { error } = await retryJob(jobId);
    if (error) toast({ title: "Retry failed", variant: "destructive" });
    else toast({ title: "Job retried" });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "Processing", value: stats.processing, icon: Loader2, color: "text-blue-500" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-500" },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-500" },
          { label: "Credits Used", value: `$${stats.totalCredits.toFixed(2)}`, icon: Zap, color: "text-primary" },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={12} className={s.color} />
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
            <p className="font-heading font-bold text-lg">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Job List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">AI Processing Queue</h3>
          <Button variant="ghost" size="sm" onClick={refetch}><RefreshCw size={14} /></Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No AI jobs processed yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => {
              const cfg = statusConfig[job.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <div key={job.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={`${cfg.color} ${job.status === "processing" ? "animate-spin" : ""}`} />
                    <div>
                      <p className="text-sm font-medium">{jobTypeLabels[job.job_type] || job.job_type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{new Date(job.created_at).toLocaleString()}</span>
                        {job.retry_count > 0 && <Badge variant="outline" className="text-[9px]">Retry #{job.retry_count}</Badge>}
                      </div>
                      {job.error_message && (
                        <p className="text-[10px] text-red-500 mt-0.5">{job.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.credits_cost > 0 && (
                      <span className="text-xs text-muted-foreground">${job.credits_cost.toFixed(2)}</span>
                    )}
                    <Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                      {cfg.label}
                    </Badge>
                    {job.status === "failed" && job.retry_count < job.max_retries && (
                      <Button variant="ghost" size="sm" onClick={() => handleRetry(job.id)}>
                        <RefreshCw size={12} className="mr-1" /> Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default JobQueuePanel;
