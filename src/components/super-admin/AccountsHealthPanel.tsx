import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";

interface Report {
  id: string;
  subject_type: string;
  subject_id: string;
  subject_label: string | null;
  status: "healthy" | "degraded" | "broken";
  checks: any;
  issues: string[];
  checked_at: string;
}

export default function AccountsHealthPanel() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"all" | "healthy" | "degraded" | "broken">("all");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    // Latest per subject
    const { data } = await supabase.from("account_health_reports")
      .select("*").order("checked_at", { ascending: false }).limit(2000);
    const seen = new Set<string>();
    const latest: Report[] = [];
    for (const r of (data as Report[]) ?? []) {
      const k = `${r.subject_type}:${r.subject_id}`;
      if (seen.has(k)) continue;
      seen.add(k); latest.push(r);
    }
    setReports(latest);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounts-health-monitor");
      if (error) throw error;
      toast({ title: "Health scan complete", description: JSON.stringify(data?.summary) });
      await load();
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  const filtered = filter === "all" ? reports : reports.filter(r => r.status === filter);
  const counts = {
    healthy: reports.filter(r => r.status === "healthy").length,
    degraded: reports.filter(r => r.status === "degraded").length,
    broken: reports.filter(r => r.status === "broken").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Activity className="h-5 w-5" /> Accounts Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Verified and activated tailors, designers, organizations, and customers monitored for portal functionality.
          </p>
        </div>
        <Button onClick={run} disabled={running} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
          Run scan
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["healthy", "degraded", "broken"] as const).map(s => (
          <Card key={s} className={`cursor-pointer ${filter === s ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter(filter === s ? "all" : s)}>
            <CardContent className="p-4 flex items-center gap-3">
              {s === "healthy" && <CheckCircle className="h-6 w-6 text-emerald-500" />}
              {s === "degraded" && <AlertTriangle className="h-6 w-6 text-amber-500" />}
              {s === "broken" && <XCircle className="h-6 w-6 text-destructive" />}
              <div>
                <div className="text-2xl font-bold">{counts[s]}</div>
                <div className="text-xs uppercase text-muted-foreground">{s}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Latest reports</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <div className="space-y-2">
              {filtered.slice(0, 200).map(r => (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">{r.subject_type}</Badge>
                      <span className="font-medium truncate">{r.subject_label || r.subject_id.slice(0, 8)}</span>
                    </div>
                    {r.issues.length > 0 && (
                      <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                        {r.issues.map((i, idx) => <li key={idx}>{i}</li>)}
                      </ul>
                    )}
                  </div>
                  <Badge variant={r.status === "healthy" ? "secondary" : r.status === "degraded" ? "outline" : "destructive"}>
                    {r.status}
                  </Badge>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No reports yet. Click "Run scan".</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}