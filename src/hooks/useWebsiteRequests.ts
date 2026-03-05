import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WebsiteRequest {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  one_time_fee: number;
  platform_fee: number;
  monthly_maintenance: number;
  payment_gateway: string | null;
  gateway_reference: string | null;
  payment_status: string;
  paid_at: string | null;
  assigned_to: string | null;
  assigned_admin_id: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  website_url: string | null;
  preview_url: string | null;
  notes: string | null;
  implementation_notes: string | null;
  priority: string;
  deadline: string | null;
  review_status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  launched_at: string | null;
  contact_history: any[];
  requested_at: string;
  created_at: string;
  updated_at: string;
  organizations?: { name: string; slug: string; email: string | null };
}

export interface AuditEntry {
  id: string;
  request_id: string;
  admin_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface RequestFilters {
  status?: string;
  priority?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useWebsiteRequests(filters: RequestFilters = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["website-requests", filters],
    queryFn: async () => {
      let query = supabase
        .from("website_builder_requests" as any)
        .select("*, organizations(name, slug, email)")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }
      if (filters.dateFrom) {
        query = query.gte("requested_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("requested_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as unknown as WebsiteRequest[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (r) =>
            r.organizations?.name?.toLowerCase().includes(s) ||
            r.organizations?.slug?.toLowerCase().includes(s) ||
            r.organizations?.email?.toLowerCase().includes(s) ||
            r.id.toLowerCase().includes(s)
        );
      }

      return results;
    },
  });

  const { data: superAdmins = [] } = useQuery({
    queryKey: ["super-admins-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(display_name)")
        .eq("role", "super_admin");
      return (data || []).map((a: any) => ({
        user_id: a.user_id,
        display_name: (a.profiles as any)?.display_name || "Admin",
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const logAudit = async (requestId: string, action: string, details: Record<string, any> = {}) => {
    if (!user) return;
    await supabase.from("website_request_audit_log" as any).insert({
      request_id: requestId,
      admin_id: user.id,
      action,
      details,
    } as any);
  };

  const updateRequest = useMutation({
    mutationFn: async ({ id, updates, auditAction }: { id: string; updates: Record<string, any>; auditAction?: string }) => {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from("website_builder_requests" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      if (auditAction) await logAudit(id, auditAction, updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["website-requests"] }),
  });

  const addContactEntry = useMutation({
    mutationFn: async ({ id, entry }: { id: string; entry: { type: string; message: string; date: string } }) => {
      const request = requests.find((r) => r.id === id);
      const history = Array.isArray(request?.contact_history) ? [...request.contact_history, entry] : [entry];
      const { error } = await supabase
        .from("website_builder_requests" as any)
        .update({ contact_history: history, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      await logAudit(id, "contact_added", entry);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["website-requests"] }),
  });

  const fetchAuditLog = async (requestId: string): Promise<AuditEntry[]> => {
    const { data } = await supabase
      .from("website_request_audit_log" as any)
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    return (data || []) as unknown as AuditEntry[];
  };

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
    review: requests.filter((r) => r.status === "review").length,
    completed: requests.filter((r) => r.status === "completed").length,
    launched: requests.filter((r) => r.status === "launched").length,
    overdue: requests.filter((r) => r.deadline && new Date(r.deadline) < new Date() && !["completed", "launched", "cancelled"].includes(r.status)).length,
    totalFees: requests.reduce((s, r) => s + (r.platform_fee || 0), 0),
    totalRevenue: requests.reduce((s, r) => s + (r.one_time_fee || 0), 0),
  };

  const exportCSV = () => {
    const headers = ["Organization", "Status", "Priority", "Payment", "Fee", "Platform Fee", "Assigned To", "Deadline", "Requested", "Completed"];
    const rows = requests.map((r) => [
      r.organizations?.name || r.org_id,
      r.status,
      r.priority,
      r.payment_status,
      r.one_time_fee,
      r.platform_fee,
      r.assigned_to || "",
      r.deadline ? new Date(r.deadline).toLocaleDateString() : "",
      new Date(r.requested_at).toLocaleDateString(),
      r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `website-requests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    requests,
    isLoading,
    stats,
    superAdmins,
    updateRequest,
    addContactEntry,
    fetchAuditLog,
    exportCSV,
  };
}
