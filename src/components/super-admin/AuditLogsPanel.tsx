import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { ScrollText, Search, RefreshCw, Filter } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  org_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  display_name?: string;
  org_name?: string;
}

const actionColors: Record<string, string> = {
  create: "bg-secondary/10 text-secondary",
  update: "bg-primary/10 text-primary",
  delete: "bg-destructive/10 text-destructive",
  login: "bg-muted text-muted-foreground",
  logout: "bg-muted text-muted-foreground",
};

const AuditLogsPanel = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);
    if (actionFilter !== "all") query = query.eq("action", actionFilter);

    const { data } = await query;

    if (data) {
      const userIds = [...new Set(data.map((l: any) => l.user_id))];
      const orgIds = [...new Set(data.map((l: any) => l.org_id).filter(Boolean))];

      const [{ data: profiles }, { data: orgs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", userIds),
        orgIds.length > 0
          ? supabase.from("organizations").select("id, name").in("id", orgIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name] as [string, string]));
      const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name] as [string, string]));

      setLogs(
        data.map((l: any) => ({
          ...l,
          display_name: profileMap.get(l.user_id) || "Unknown",
          org_name: l.org_id ? orgMap.get(l.org_id) || "—" : "Platform",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <ScrollText size={22} className="text-primary" /> Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            System-wide activity trail across all organizations.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[140px] text-sm">
            <Filter size={12} className="mr-1" />
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="organization">Organizations</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="shipment">Shipments</SelectItem>
            <SelectItem value="dispute">Disputes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[130px] text-sm">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="export">Export</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <ScrollText size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No audit logs found.</p>
          <p className="text-xs text-muted-foreground mt-1">Activity will appear here as users interact with the platform.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Time</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Entity</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{log.display_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{log.org_name}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{log.entity_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.entity_id ? `ID: ${log.entity_id.slice(0, 8)}…` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            Showing {filtered.length} of {logs.length} logs
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AuditLogsPanel;
