import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, RefreshCw, Check, X, AlertCircle, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Row = {
  target_type: "organization" | "designer";
  target_id: string;
  name: string | null;
  country: string | null;
  reg_type: string | null;
  reg_number: string | null;
  status: string;
  submitted_at: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  role: string | null;
  owner_user_id: string | null;
  created_at: string;
};

const decisionLabel: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  info_requested: "Info requested",
  pending: "Pending",
};

const statusBadge = (s: string) => {
  const v =
    s === "approved" ? "default"
    : s === "rejected" ? "destructive"
    : s === "info_requested" ? "secondary"
    : "outline";
  return <Badge variant={v as any}>{decisionLabel[s] ?? s}</Badge>;
};

const PendingVerificationsPanel = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_pending_verifications_v" as any)
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRows((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const decide = async (row: Row, decision: "approved" | "rejected" | "info_requested") => {
    const key = `${row.target_type}:${row.target_id}`;
    const notes = notesById[key]?.trim() || null;
    if ((decision === "rejected" || decision === "info_requested") && !notes) {
      toast({ title: "Notes required", description: "Add a short reason before submitting.", variant: "destructive" });
      return;
    }
    setBusy(key);
    const { error } = await supabase.rpc("admin_set_verification_status" as any, {
      _target_type: row.target_type,
      _target_id: row.target_id,
      _decision: decision,
      _notes: notes,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked ${decisionLabel[decision].toLowerCase()}` });
    setNotesById((m) => ({ ...m, [key]: "" }));
    void load();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.country, r.reg_number, r.reg_type, r.notes].some((v) =>
        (v || "").toLowerCase().includes(needle)
      )
    );
  }, [rows, q]);

  const pendingOrgs = filtered.filter((r) => r.target_type === "organization" && r.status === "pending");
  const pendingDesigners = filtered.filter((r) => r.target_type === "designer" && r.status === "pending");
  const recent = filtered
    .filter((r) => r.status !== "pending" && r.reviewed_at)
    .sort((a, b) => (b.reviewed_at || "").localeCompare(a.reviewed_at || ""))
    .slice(0, 50);

  const today = new Date().toISOString().slice(0, 10);
  const approvedToday = rows.filter((r) => r.status === "approved" && (r.reviewed_at || "").startsWith(today)).length;
  const rejectedToday = rows.filter((r) => r.status === "rejected" && (r.reviewed_at || "").startsWith(today)).length;

  const Stat = ({ label, value }: { label: string; value: number }) => (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );

  const RowCard = ({ row, readOnly = false }: { row: Row; readOnly?: boolean }) => {
    const key = `${row.target_type}:${row.target_id}`;
    const isBusy = busy === key;
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold truncate">{row.name || "Unnamed"}</h4>
                {statusBadge(row.status)}
                <Badge variant="outline" className="text-[10px]">{row.target_type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {row.country && <>Country: <b>{row.country}</b> · </>}
                {row.reg_type && <>Reg: <b>{row.reg_type.toUpperCase()}</b> · </>}
                {row.reg_number && <>#{row.reg_number} · </>}
                Submitted {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : new Date(row.created_at).toLocaleString()}
              </p>
              {row.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{row.notes}"</p>
              )}
              {row.reviewed_at && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Reviewed {new Date(row.reviewed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {!readOnly && (
            <>
              <Textarea
                placeholder="Notes (required for reject / request info, optional for approve)"
                value={notesById[key] || ""}
                onChange={(e) => setNotesById((m) => ({ ...m, [key]: e.target.value }))}
                rows={2}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => decide(row, "approved")} disabled={isBusy}>
                  {isBusy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} className="mr-1" />}
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => decide(row, "rejected")} disabled={isBusy}>
                  <X size={14} className="mr-1" /> Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide(row, "info_requested")} disabled={isBusy}>
                  <AlertCircle size={14} className="mr-1" /> Request info
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Pending Verifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Approve or reject business registrations and designer access requests. Approved users gain dashboard access immediately.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} className="mr-1" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Orgs pending" value={pendingOrgs.length} />
        <Stat label="Designers pending" value={pendingDesigners.length} />
        <Stat label="Approved today" value={approvedToday} />
        <Stat label="Rejected today" value={rejectedToday} />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, country, registration number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs">Organizations ({pendingOrgs.length})</TabsTrigger>
          <TabsTrigger value="designers">Designers ({pendingDesigners.length})</TabsTrigger>
          <TabsTrigger value="recent">Recently reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs" className="space-y-3 mt-3">
          {loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pendingOrgs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No organizations awaiting review.</CardContent></Card>
          ) : pendingOrgs.map((r) => <RowCard key={`${r.target_type}-${r.target_id}`} row={r} />)}
        </TabsContent>

        <TabsContent value="designers" className="space-y-3 mt-3">
          {pendingDesigners.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No designers awaiting review.</CardContent></Card>
          ) : pendingDesigners.map((r) => <RowCard key={`${r.target_type}-${r.target_id}`} row={r} />)}
        </TabsContent>

        <TabsContent value="recent" className="space-y-3 mt-3">
          {recent.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No recent decisions.</CardContent></Card>
          ) : recent.map((r) => <RowCard key={`${r.target_type}-${r.target_id}-rev`} row={r} readOnly />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PendingVerificationsPanel;