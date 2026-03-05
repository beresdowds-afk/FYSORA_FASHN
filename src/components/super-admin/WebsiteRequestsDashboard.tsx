import { useState, useEffect } from "react";
import { useWebsiteRequests, type WebsiteRequest, type AuditEntry, type RequestFilters } from "@/hooks/useWebsiteRequests";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Crown, Clock, Users, CheckCircle2, TrendingUp, Search, Download, ExternalLink,
  AlertTriangle, Eye, MessageCircle, FileText, ChevronLeft, ChevronRight, Rocket,
  Star, ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["all", "pending", "assigned", "in_progress", "review", "completed", "launched", "cancelled"];
const PRIORITIES = ["all", "urgent", "high", "normal", "low"];
const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  assigned: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-primary/10 text-primary",
  review: "bg-purple-500/10 text-purple-600",
  completed: "bg-green-500/10 text-green-600",
  launched: "bg-secondary/10 text-secondary",
  cancelled: "bg-destructive/10 text-destructive",
};


export default function WebsiteRequestsDashboard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<RequestFilters>({});
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const { requests, isLoading, stats, superAdmins, updateRequest, addContactEntry, fetchAuditLog, exportCSV } = useWebsiteRequests(filters);

  const totalPages = Math.ceil(requests.length / PAGE_SIZE);
  const paged = requests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selected = selectedId ? requests.find((r) => r.id === selectedId) : null;

  useEffect(() => { setPage(0); }, [filters]);

  const loadAudit = async (id: string) => {
    setAuditLoading(true);
    const log = await fetchAuditLog(id);
    setAuditLog(log);
    setAuditLoading(false);
  };

  useEffect(() => {
    if (selectedId) loadAudit(selectedId);
  }, [selectedId]);

  const handleUpdate = (id: string, updates: Record<string, any>, auditAction: string) => {
    updateRequest.mutate(
      { id, updates, auditAction },
      {
        onSuccess: () => {
          toast({ title: `Request ${auditAction.replace("_", " ")}` });
          if (selectedId === id) loadAudit(id);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  // ─── Stats Row ───
  const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="font-heading font-bold text-2xl">{value}</p>
      <p className="text-muted-foreground text-xs mt-0.5">{label}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Detail View ───
  if (selected) {
    return <RequestDetail request={selected} superAdmins={superAdmins} auditLog={auditLog} auditLoading={auditLoading} onBack={() => setSelectedId(null)} onUpdate={handleUpdate} addContactEntry={addContactEntry} loadAudit={loadAudit} isUpdating={updateRequest.isPending} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl">Website Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage Pro website build requests end-to-end.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download size={14} className="mr-1" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-yellow-600" bg="bg-yellow-500/10" />
        <StatCard label="In Progress" value={stats.inProgress} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="In Review" value={stats.review} icon={Eye} color="text-purple-600" bg="bg-purple-500/10" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-green-600" bg="bg-green-500/10" />
        <StatCard label="Launched" value={stats.launched} icon={Rocket} color="text-secondary" bg="bg-secondary/10" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} color="text-destructive" bg="bg-destructive/10" />
      </div>

      {/* Revenue bar */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <TrendingUp size={18} className="text-primary" />
        <div>
          <span className="text-sm font-medium">Total Revenue:</span>
          <span className="font-heading font-bold text-lg ml-2">${stats.totalRevenue.toLocaleString()}</span>
        </div>
        <div className="ml-auto">
          <span className="text-sm font-medium">Platform Fees:</span>
          <span className="font-heading font-bold text-lg ml-2">${stats.totalFees.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search org name, slug, email…"
            value={filters.search || ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.priority || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{p === "all" ? "All Priorities" : p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          className="w-[140px] h-9 text-sm"
          placeholder="From"
        />
        <Input
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          className="w-[140px] h-9 text-sm"
          placeholder="To"
        />
      </div>

      {/* Table */}
      {requests.length === 0 ? (
        <div className="rounded-xl bg-card border border-dashed border-border p-10 text-center">
          <Crown size={32} className="mx-auto text-muted-foreground mb-2 opacity-40" />
          <p className="text-muted-foreground text-sm">No requests match your filters.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Priority</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Payment</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Fee</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Deadline</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Assigned</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((req) => {
                    const isOverdue = req.deadline && new Date(req.deadline) < new Date() && !["completed", "launched", "cancelled"].includes(req.status);
                    return (
                      <tr
                        key={req.id}
                        className={`border-t border-border hover:bg-muted/30 transition-colors cursor-pointer ${isOverdue ? "bg-destructive/5" : ""}`}
                        onClick={() => setSelectedId(req.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{req.organizations?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{req.organizations?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={req.priority === "urgent" ? "destructive" : "outline"} className="text-[10px]">
                            {req.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] || "bg-muted text-muted-foreground"}`}>
                            {req.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${req.payment_status === "paid" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}>
                            {req.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">${req.one_time_fee}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {req.deadline ? (
                            <span className={isOverdue ? "text-destructive font-medium" : ""}>
                              {format(new Date(req.deadline), "MMM d")}
                              {isOverdue && " ⚠"}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{req.assigned_to || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(req.requested_at), "MMM d, yy")}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedId(req.id); }}>
                            <Eye size={12} className="mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, requests.length)} of {requests.length}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page < 3 ? i : page - 2 + i;
                  if (p >= totalPages) return null;
                  return (
                    <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="w-8 h-8 p-0 text-xs">
                      {p + 1}
                    </Button>
                  );
                })}
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ═══════════════════════ REQUEST DETAIL VIEW ═══════════════════════ */

function RequestDetail({
  request: req,
  superAdmins,
  auditLog,
  auditLoading,
  onBack,
  onUpdate,
  addContactEntry,
  loadAudit,
  isUpdating,
}: {
  request: WebsiteRequest;
  superAdmins: { user_id: string; display_name: string }[];
  auditLog: AuditEntry[];
  auditLoading: boolean;
  onBack: () => void;
  onUpdate: (id: string, updates: Record<string, any>, action: string) => void;
  addContactEntry: any;
  loadAudit: (id: string) => void;
  isUpdating: boolean;
}) {
  const { toast } = useToast();
  const [assignTo, setAssignTo] = useState(req.assigned_to || "");
  const [assignAdminId, setAssignAdminId] = useState(req.assigned_admin_id || "");
  const [deadline, setDeadline] = useState(req.deadline ? req.deadline.split("T")[0] : "");
  const [priority, setPriority] = useState(req.priority);
  const [previewUrl, setPreviewUrl] = useState(req.preview_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(req.website_url || "");
  const [implNotes, setImplNotes] = useState(req.implementation_notes || "");
  const [reviewNotes, setReviewNotes] = useState(req.review_notes || "");
  const [contactMsg, setContactMsg] = useState("");
  const [contactType, setContactType] = useState("email");
  const [activeSection, setActiveSection] = useState<"details" | "contacts" | "audit">("details");

  const isOverdue = req.deadline && new Date(req.deadline) < new Date() && !["completed", "launched", "cancelled"].includes(req.status);

  const handleAssign = () => {
    const admin = superAdmins.find((a) => a.user_id === assignAdminId);
    onUpdate(req.id, {
      assigned_to: admin?.display_name || assignTo,
      assigned_admin_id: assignAdminId || null,
      assigned_at: new Date().toISOString(),
      status: req.status === "pending" ? "assigned" : req.status,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
    }, "assigned");
  };

  const handleStartWork = () => onUpdate(req.id, { status: "in_progress" }, "started");
  const handleSubmitReview = () => onUpdate(req.id, { status: "review", preview_url: previewUrl, implementation_notes: implNotes }, "submitted_for_review");
  const handleApproveReview = () => onUpdate(req.id, { review_status: "approved", reviewed_at: new Date().toISOString(), review_notes: reviewNotes, status: "completed", completed_at: new Date().toISOString() }, "review_approved");
  const handleRejectReview = () => onUpdate(req.id, { review_status: "rejected", reviewed_at: new Date().toISOString(), review_notes: reviewNotes, status: "in_progress" }, "review_rejected");
  const handleLaunch = () => onUpdate(req.id, { status: "launched", launched_at: new Date().toISOString(), website_url: websiteUrl }, "launched");

  const handleAddContact = () => {
    if (!contactMsg.trim()) return;
    addContactEntry.mutate(
      { id: req.id, entry: { type: contactType, message: contactMsg, date: new Date().toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Contact logged" });
          setContactMsg("");
          loadAudit(req.id);
        },
      }
    );
  };

  const sectionTabs = [
    { id: "details" as const, label: "Details & Actions", icon: FileText },
    { id: "contacts" as const, label: "Contact History", icon: MessageCircle },
    { id: "audit" as const, label: "Audit Log", icon: ArrowUpDown },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading font-bold text-xl">{req.organizations?.name || "Request"}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] || "bg-muted text-muted-foreground"}`}>
              {req.status.replace("_", " ")}
            </span>
            <Badge variant={req.priority === "urgent" ? "destructive" : "outline"} className="text-[10px]">{req.priority}</Badge>
            {isOverdue && <Badge variant="destructive" className="text-[10px]">OVERDUE</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {req.organizations?.slug} · {req.organizations?.email} · Requested {format(new Date(req.requested_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-xs text-muted-foreground">One-Time Fee</p>
          <p className="font-heading font-bold text-lg">${req.one_time_fee}</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-xs text-muted-foreground">Platform Fee</p>
          <p className="font-heading font-bold text-lg">${req.platform_fee}</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-xs text-muted-foreground">Payment</p>
          <p className={`font-heading font-bold text-lg ${req.payment_status === "paid" ? "text-green-600" : "text-yellow-600"}`}>
            {req.payment_status}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-xs text-muted-foreground">Maintenance</p>
          <p className="font-heading font-bold text-lg">${req.monthly_maintenance}/mo</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Details Section */}
      {activeSection === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignment & Priority */}
          <div className="rounded-xl border border-border p-5 space-y-4">
            <h3 className="font-heading font-semibold text-sm">Assignment & Priority</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Assign To</label>
                <Select value={assignAdminId} onValueChange={(v) => { setAssignAdminId(v); const a = superAdmins.find((s) => s.user_id === v); if (a) setAssignTo(a.display_name); }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select admin" />
                  </SelectTrigger>
                  <SelectContent>
                    {superAdmins.map((sa) => (
                      <SelectItem key={sa.user_id} value={sa.user_id}>{sa.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["urgent", "high", "normal", "low"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Deadline</label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
              <Button size="sm" variant="hero" onClick={handleAssign} disabled={isUpdating}>
                {req.status === "pending" ? "Assign & Set Deadline" : "Update Assignment"}
              </Button>
            </div>
          </div>

          {/* Implementation */}
          <div className="rounded-xl border border-border p-5 space-y-4">
            <h3 className="font-heading font-semibold text-sm">Implementation</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Preview URL</label>
                <Input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://preview.example.com" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Live Website URL</label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://org.fashionstitches.africa" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Implementation Notes</label>
                <Textarea value={implNotes} onChange={(e) => setImplNotes(e.target.value)} rows={3} className="text-sm" placeholder="Design choices, customizations, etc." />
              </div>

              {/* Action buttons based on status */}
              <div className="flex flex-wrap gap-2 pt-2">
                {req.status === "assigned" && (
                  <Button size="sm" variant="outline" onClick={handleStartWork} disabled={isUpdating}>
                    Start Work
                  </Button>
                )}
                {req.status === "in_progress" && (
                  <Button size="sm" variant="hero" onClick={handleSubmitReview} disabled={isUpdating || !previewUrl}>
                    <Eye size={12} className="mr-1" /> Submit for Review
                  </Button>
                )}
                {req.status === "review" && (
                  <>
                    <div className="w-full">
                      <label className="text-xs font-medium mb-1 block">Review Notes</label>
                      <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} className="text-sm" placeholder="QA feedback..." />
                    </div>
                    <Button size="sm" variant="hero" onClick={handleApproveReview} disabled={isUpdating}>
                      <CheckCircle2 size={12} className="mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleRejectReview} disabled={isUpdating}>
                      Reject → Back to Work
                    </Button>
                  </>
                )}
                {req.status === "completed" && (
                  <Button size="sm" variant="hero" onClick={handleLaunch} disabled={isUpdating || !websiteUrl}>
                    <Rocket size={12} className="mr-1" /> Launch & Notify
                  </Button>
                )}
                {req.preview_url && (
                  <a href={req.preview_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink size={12} className="mr-1" /> Preview</Button>
                  </a>
                )}
                {req.website_url && (
                  <a href={req.website_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink size={12} className="mr-1" /> Live Site</Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact History */}
      {activeSection === "contacts" && (
        <div className="space-y-4">
          {/* Add entry */}
          <div className="rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-heading font-semibold text-sm">Log Communication</h3>
            <div className="flex gap-3 items-end">
              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "phone", "whatsapp", "meeting", "note"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1">
                <Textarea value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} rows={2} className="text-sm" placeholder="Summary of communication..." />
              </div>
              <Button size="sm" variant="hero" onClick={handleAddContact} disabled={addContactEntry.isPending || !contactMsg.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* History */}
          <div className="rounded-xl border border-border overflow-hidden">
            {Array.isArray(req.contact_history) && req.contact_history.length > 0 ? (
              <div className="divide-y divide-border">
                {[...req.contact_history].reverse().map((entry: any, i: number) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{entry.type}</Badge>
                      <span className="text-xs text-muted-foreground">{entry.date ? format(new Date(entry.date), "MMM d, yyyy h:mm a") : "—"}</span>
                    </div>
                    <p className="text-sm">{entry.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-muted-foreground text-sm">No contact history yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {activeSection === "audit" && (
        <div className="rounded-xl border border-border overflow-hidden">
          {auditLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditLog.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">No audit entries yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {auditLog.map((entry) => (
                <div key={entry.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">{entry.action.replace("_", " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{entry.admin_id.slice(0, 8)}…</span>
                  </div>
                  {Object.keys(entry.details).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 mt-1 overflow-x-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
