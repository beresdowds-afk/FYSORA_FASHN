import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, RefreshCw, Check, X, AlertCircle, Search, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Light region mapping for African + global filtering (ISO-2 country codes)
const REGION_BY_COUNTRY: Record<string, string> = {
  NG: "West Africa", GH: "West Africa", SN: "West Africa", CI: "West Africa", BJ: "West Africa", TG: "West Africa", BF: "West Africa", ML: "West Africa", NE: "West Africa", LR: "West Africa", SL: "West Africa", GM: "West Africa", GN: "West Africa", GW: "West Africa", CV: "West Africa",
  KE: "East Africa", UG: "East Africa", TZ: "East Africa", RW: "East Africa", BI: "East Africa", ET: "East Africa", SO: "East Africa", SS: "East Africa", DJ: "East Africa", ER: "East Africa",
  ZA: "Southern Africa", ZM: "Southern Africa", ZW: "Southern Africa", BW: "Southern Africa", NA: "Southern Africa", MZ: "Southern Africa", LS: "Southern Africa", SZ: "Southern Africa", MW: "Southern Africa",
  EG: "North Africa", MA: "North Africa", DZ: "North Africa", TN: "North Africa", LY: "North Africa", SD: "North Africa",
  CM: "Central Africa", CD: "Central Africa", CG: "Central Africa", GA: "Central Africa", CF: "Central Africa", TD: "Central Africa", GQ: "Central Africa", ST: "Central Africa", AO: "Central Africa",
  US: "Americas", CA: "Americas", BR: "Americas", MX: "Americas", AR: "Americas",
  GB: "Europe", FR: "Europe", DE: "Europe", IT: "Europe", ES: "Europe", NL: "Europe", PT: "Europe", IE: "Europe",
  CN: "Asia", IN: "Asia", JP: "Asia", AE: "Asia", SG: "Asia", PH: "Asia", PK: "Asia",
  AU: "Oceania", NZ: "Oceania",
};
const regionOf = (c?: string | null) => (c ? REGION_BY_COUNTRY[c.toUpperCase()] || "Other" : "—");

const PendingVerificationsPanel = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");

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
    await sendExternalNotifications(row, decision, notes);
    toast({ title: `Marked ${decisionLabel[decision].toLowerCase()}` });
    setNotesById((m) => ({ ...m, [key]: "" }));
    void load();
  };

  const sendExternalNotifications = async (row: Row, decision: string, notes: string | null) => {
    try {
      const subject =
        decision === "approved" ? "Verification approved" :
        decision === "rejected" ? "Verification rejected" :
        "More information requested";
      const body =
        decision === "approved"
          ? `Good news — your ${row.target_type === "organization" ? "business registration" : "designer account"} has been approved. You now have full dashboard access.`
          : decision === "rejected"
          ? `Your verification was rejected. Reason: ${notes || "Not provided"}. Please contact support to resubmit.`
          : `We need more information to complete your verification. Notes: ${notes || "Not provided"}.`;

      if (row.target_type === "organization") {
        const { data: org } = await supabase
          .from("organizations").select("email, phone, name").eq("id", row.target_id).maybeSingle();
        const orgName = org?.name || row.name || "your organization";
        const fullSubject = `[${orgName}] ${subject}`;
        if (org?.email) {
          supabase.functions.invoke("send-email", {
            body: { to: org.email, subject: fullSubject, body, org_id: row.target_id, event_type: "verification_decision" },
          }).catch(() => {});
        }
        if (org?.phone) {
          supabase.functions.invoke("send-whatsapp", {
            body: { to: org.phone, message: `${fullSubject}\n\n${body}`, org_id: row.target_id, event_type: "verification_decision" },
          }).catch(() => {});
        }
      }
      // Designer in-app notification already inserted by RPC
    } catch (e) {
      console.error("notification dispatch failed", e);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (regionFilter !== "all" && regionOf(r.country) !== regionFilter) return false;
      if (!needle) return true;
      return [r.name, r.country, r.reg_number, r.reg_type, r.notes].some((v) =>
        (v || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, statusFilter, regionFilter]);

  const pendingOrgs = filtered.filter((r) => r.target_type === "organization" && r.status === "pending");
  const pendingDesigners = filtered.filter((r) => r.target_type === "designer" && r.status === "pending");
  const recent = filtered
    .filter((r) => r.status !== "pending" && r.reviewed_at)
    .sort((a, b) => (b.reviewed_at || "").localeCompare(a.reviewed_at || ""))
    .slice(0, 50);

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.country) set.add(regionOf(r.country)); });
    return Array.from(set).sort();
  }, [rows]);

  const toggleSel = (key: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const selectAllInList = (list: Row[], checked: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev);
      list.forEach((r) => { const k = `${r.target_type}:${r.target_id}`; if (checked) n.add(k); else n.delete(k); });
      return n;
    });

  const bulkDecide = async (decision: "approved" | "rejected" | "info_requested") => {
    const targets = rows.filter((r) => selected.has(`${r.target_type}:${r.target_id}`) && r.status === "pending");
    if (targets.length === 0) {
      toast({ title: "Nothing selected", description: "Select one or more pending rows first.", variant: "destructive" });
      return;
    }
    const notes = bulkNotes.trim() || null;
    if ((decision === "rejected" || decision === "info_requested") && !notes) {
      toast({ title: "Notes required", description: "Provide a bulk reason before applying.", variant: "destructive" });
      return;
    }
    setBulkBusy(true);
    let ok = 0; let fail = 0;
    for (const row of targets) {
      const { error } = await supabase.rpc("admin_set_verification_status" as any, {
        _target_type: row.target_type, _target_id: row.target_id, _decision: decision, _notes: notes,
      });
      if (error) { fail++; } else { ok++; await sendExternalNotifications(row, decision, notes); }
    }
    setBulkBusy(false);
    setSelected(new Set()); setBulkNotes("");
    toast({ title: `Bulk ${decisionLabel[decision].toLowerCase()}: ${ok} succeeded${fail ? `, ${fail} failed` : ""}` });
    void load();
  };

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
    const isSelected = selected.has(key);
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            {!readOnly && row.status === "pending" && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSel(key)}
                aria-label="Select row"
                className="mt-1"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold truncate">{row.name || "Unnamed"}</h4>
                {statusBadge(row.status)}
                <Badge variant="outline" className="text-[10px]">{row.target_type}</Badge>
                {row.country && <Badge variant="outline" className="text-[10px]">{regionOf(row.country)}</Badge>}
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

      <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search org / designer name, country, reg #…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="info_requested">Info requested</SelectItem>
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {availableRegions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <Card className="border-primary/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">{selected.size} selected for bulk action</p>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
            <Textarea
              placeholder="Bulk notes (required for reject / info)"
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => bulkDecide("approved")} disabled={bulkBusy}>
                {bulkBusy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} className="mr-1" />} Bulk approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkDecide("rejected")} disabled={bulkBusy}>
                <X size={14} className="mr-1" /> Bulk reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkDecide("info_requested")} disabled={bulkBusy}>
                <AlertCircle size={14} className="mr-1" /> Bulk request info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs">Organizations ({pendingOrgs.length})</TabsTrigger>
          <TabsTrigger value="designers">Designers ({pendingDesigners.length})</TabsTrigger>
          <TabsTrigger value="recent">Recently reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs" className="space-y-3 mt-3">
          {pendingOrgs.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Checkbox
                checked={pendingOrgs.every((r) => selected.has(`${r.target_type}:${r.target_id}`))}
                onCheckedChange={(c) => selectAllInList(pendingOrgs, !!c)}
              />
              Select all on this tab
            </label>
          )}
          {loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pendingOrgs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No organizations awaiting review.</CardContent></Card>
          ) : pendingOrgs.map((r) => <RowCard key={`${r.target_type}-${r.target_id}`} row={r} />)}
        </TabsContent>

        <TabsContent value="designers" className="space-y-3 mt-3">
          {pendingDesigners.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Checkbox
                checked={pendingDesigners.every((r) => selected.has(`${r.target_type}:${r.target_id}`))}
                onCheckedChange={(c) => selectAllInList(pendingDesigners, !!c)}
              />
              Select all on this tab
            </label>
          )}
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