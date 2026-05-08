import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, RotateCw, Clock, Loader2 } from "lucide-react";

interface Incident {
  id: string;
  agent_kind: string;
  agent_key: string;
  agent_name: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  attempt_count: number | null;
  next_retry_at: string | null;
  error_message: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ICON_FOR_EVENT: Record<string, React.ElementType> = {
  activated: CheckCircle2,
  failed: AlertTriangle,
  retry: RotateCw,
  status_change: Activity,
  error: AlertTriangle,
  created: Clock,
  requested: Clock,
};

const COLOR_FOR_EVENT: Record<string, string> = {
  activated: "text-secondary",
  failed: "text-destructive",
  error: "text-destructive",
  retry: "text-amber-600",
  status_change: "text-primary",
  created: "text-muted-foreground",
  requested: "text-muted-foreground",
};

const SentinelIncidentTimeline = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("agents_only");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("sentinel_agent_incidents" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "agents_only") {
      q = q.eq("agent_kind", "platform_agent");
    } else if (filter === "stuck") {
      q = q.in("event_type", ["failed", "error", "retry"]);
    }
    const { data } = await q;
    setIncidents((data as unknown as Incident[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("sentinel_agent_incidents_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sentinel_agent_incidents" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Activity size={18} className="text-primary" /> Activation Incident Timeline
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Every status change and retry attempt for Steven-AI, Rachel CRM &amp; SENTINEL-SHIELD.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs rounded-md border border-border bg-background px-2 py-1"
          >
            <option value="agents_only">Platform agents</option>
            <option value="all">All (incl. SHIELD)</option>
            <option value="stuck">Failures &amp; retries only</option>
          </select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {incidents.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No incidents recorded yet.
        </p>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-4 pl-5">
          {incidents.map((inc) => {
            const Icon = ICON_FOR_EVENT[inc.event_type] ?? Activity;
            const color = COLOR_FOR_EVENT[inc.event_type] ?? "text-muted-foreground";
            return (
              <li key={inc.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center ${color}`}
                >
                  <Icon size={10} />
                </span>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {inc.agent_name ?? inc.agent_key}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        · {inc.event_type.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {inc.from_status && (
                        <>
                          <Badge variant="outline" className="text-[9px] mr-1">
                            {inc.from_status}
                          </Badge>
                          →{" "}
                        </>
                      )}
                      {inc.to_status && (
                        <Badge variant="secondary" className="text-[9px]">
                          {inc.to_status}
                        </Badge>
                      )}
                      {inc.attempt_count != null && inc.attempt_count > 0 && (
                        <span className="ml-2">attempt #{inc.attempt_count}</span>
                      )}
                      {inc.next_retry_at && (
                        <span className="ml-2">
                          · next retry {new Date(inc.next_retry_at).toLocaleTimeString()}
                        </span>
                      )}
                    </p>
                    {inc.error_message && (
                      <p className="text-xs text-destructive mt-0.5">{inc.error_message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(inc.created_at).toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
};

export default SentinelIncidentTimeline;