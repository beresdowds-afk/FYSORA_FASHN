import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Loader2, RefreshCw } from "lucide-react";

interface AuditRow {
  id: string;
  item_id: string | null;
  item_name: string | null;
  action: string;
  actor_id: string | null;
  changes: Record<string, unknown>;
  created_at: string;
}

const ACTION_STYLE: Record<string, string> = {
  uploaded: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  edited: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  unpublished: "bg-muted text-muted-foreground",
  deleted: "bg-destructive/10 text-destructive border-destructive/20",
};

const describe = (row: AuditRow): string => {
  const keys = Object.keys(row.changes || {});
  if (row.action !== "edited" || keys.length === 0) return "";
  return `changed ${keys.join(", ")}`;
};

const CatalogueAuditLog = ({ orgId, itemId, limit = 50 }: { orgId: string; itemId?: string; limit?: number }) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("catalogue_item_audit" as any)
      .select("id,item_id,item_name,action,actor_id,changes,created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (itemId) query = query.eq("item_id", itemId);
    const { data } = await query;
    const list = ((data as any[]) || []) as AuditRow[];
    setRows(list);

    const actorIds = [...new Set(list.map((r) => r.actor_id).filter(Boolean))] as string[];
    if (actorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", actorIds);
      setNames(Object.fromEntries(((profs as any[]) || []).map((p) => [p.id, p.display_name || "Team member"])));
    }
    setLoading(false);
  }, [orgId, itemId, limit]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History size={14} className="text-primary" /> Activity log
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading activity…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No catalogue activity recorded yet.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-2.5">
              <Badge variant="outline" className={`text-[10px] capitalize ${ACTION_STYLE[r.action] || ""}`}>{r.action}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{r.item_name || "Item"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {names[r.actor_id || ""] || (r.actor_id ? "Team member" : "System")}
                  {describe(r) ? ` — ${describe(r)}` : ""}
                </p>
              </div>
              <time className="text-[10px] text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CatalogueAuditLog;
