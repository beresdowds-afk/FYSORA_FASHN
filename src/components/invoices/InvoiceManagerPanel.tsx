import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import InvoiceCreatorDialog, { type InvoiceFormData } from "./InvoiceCreatorDialog";
import { motion } from "framer-motion";
import {
  FileText, Plus, Search, Download, RefreshCw, Edit3,
  Clock, CheckCircle2, Send, XCircle, Trash2, Forward,
} from "lucide-react";
import ForwardInvoiceDialog from "./ForwardInvoiceDialog";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface CustomInvoice {
  id: string;
  org_id: string | null;
  created_by: string;
  recipient_type: string;
  recipient_name: string;
  recipient_email: string | null;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  due_date: string | null;
  notes: string | null;
  payment_terms: string | null;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

interface InvoiceManagerPanelProps {
  orgId?: string;
  orgName?: string;
  currency?: string;
  isSuperAdmin?: boolean;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  draft: { icon: Edit3, color: "text-muted-foreground", bg: "bg-muted" },
  sent: { icon: Send, color: "text-blue-600", bg: "bg-blue-500/10" },
  paid: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10" },
  overdue: { icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50" },
};

const InvoiceManagerPanel = ({ orgId, orgName, currency = "NGN", isSuperAdmin = false }: InvoiceManagerPanelProps) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<CustomInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editInvoice, setEditInvoice] = useState<InvoiceFormData | null>(null);
  const [orgMap, setOrgMap] = useState<Record<string, string>>({});
  const [forwardInvoice, setForwardInvoice] = useState<CustomInvoice | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("custom_invoices").select("*").order("created_at", { ascending: false });

    if (!isSuperAdmin && orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data } = await query;
    setInvoices((data as CustomInvoice[]) || []);

    // Load org names for super admin
    if (isSuperAdmin) {
      const { data: orgs } = await supabase.from("organizations").select("id, name");
      const map: Record<string, string> = {};
      (orgs || []).forEach((o: any) => { map[o.id] = o.name; });
      setOrgMap(map);
    }

    setLoading(false);
  }, [orgId, isSuperAdmin]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleEdit = async (inv: CustomInvoice) => {
    // Load items
    const { data: items } = await supabase
      .from("custom_invoice_items")
      .select("*")
      .eq("invoice_id", inv.id)
      .order("sort_order");

    setEditInvoice({
      id: inv.id,
      recipient_type: inv.recipient_type,
      recipient_name: inv.recipient_name,
      recipient_email: inv.recipient_email || "",
      recipient_org_id: inv.org_id || undefined,
      currency: inv.currency,
      due_date: inv.due_date ? inv.due_date.split("T")[0] : "",
      notes: inv.notes || "",
      payment_terms: inv.payment_terms || "",
      tax_rate: Number(inv.tax_rate),
      discount_amount: Number(inv.discount_amount),
      items: (items || []).map((it: any) => ({
        id: it.id,
        description: it.description,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        total: Number(it.total),
      })),
    });
    setShowCreate(true);
  };

  const markAsPaid = async (inv: CustomInvoice) => {
    await supabase.from("custom_invoices").update({ status: "paid", paid_at: new Date().toISOString() } as any).eq("id", inv.id);
    toast({ title: "Invoice marked as paid" });
    loadInvoices();
  };

  const deleteInvoice = async (inv: CustomInvoice) => {
    if (inv.status !== "draft") {
      toast({ title: "Only draft invoices can be deleted", variant: "destructive" });
      return;
    }
    await supabase.from("custom_invoice_items").delete().eq("invoice_id", inv.id);
    await supabase.from("custom_invoices").delete().eq("id", inv.id);
    toast({ title: "Invoice deleted" });
    loadInvoices();
  };

  const generatePDF = async (inv: CustomInvoice) => {
    const { data: items } = await supabase
      .from("custom_invoice_items")
      .select("*")
      .eq("invoice_id", inv.id)
      .order("sort_order");

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    const issuerName = isSuperAdmin ? "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)" : (orgName || "Invoice");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(issuerName, 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("INVOICE", pw - 20, 20, { align: "right" });
    doc.setFontSize(8);
    doc.text(`Invoice #: ${inv.invoice_number}`, pw - 20, 27, { align: "right" });
    doc.text(`Date: ${format(new Date(inv.created_at), "MMM d, yyyy")}`, pw - 20, 33, { align: "right" });
    if (inv.due_date) {
      doc.text(`Due: ${format(new Date(inv.due_date), "MMM d, yyyy")}`, pw - 20, 39, { align: "right" });
    }

    // Recipient
    doc.setTextColor(50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(inv.recipient_name, 20, y);
    y += 4;
    if (inv.recipient_email) {
      doc.setFontSize(8);
      doc.text(inv.recipient_email, 20, y);
      y += 4;
    }
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Type: ${inv.recipient_type.charAt(0).toUpperCase() + inv.recipient_type.slice(1)}`, 20, y);
    y += 8;

    // Divider
    doc.setDrawColor(200);
    doc.line(20, y, pw - 20, y);
    y += 8;

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, pw - 40, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.text("Description", 22, y + 5.5);
    doc.text("Qty", 110, y + 5.5);
    doc.text("Unit Price", 130, y + 5.5);
    doc.text("Total", pw - 22, y + 5.5, { align: "right" });
    y += 12;

    // Items
    doc.setFont("helvetica", "normal");
    (items || []).forEach((item: any) => {
      doc.text(item.description, 22, y);
      doc.text(String(Number(item.quantity)), 110, y);
      doc.text(`${inv.currency} ${Number(item.unit_price).toLocaleString()}`, 130, y);
      doc.text(`${inv.currency} ${Number(item.total).toLocaleString()}`, pw - 22, y, { align: "right" });
      y += 6;
    });

    y += 4;
    doc.line(20, y, pw - 20, y);
    y += 6;

    // Totals
    doc.setFontSize(9);
    doc.text("Subtotal:", pw - 70, y);
    doc.text(`${inv.currency} ${Number(inv.subtotal).toLocaleString()}`, pw - 22, y, { align: "right" });
    y += 5;

    if (Number(inv.tax_amount) > 0) {
      doc.text(`Tax (${Number(inv.tax_rate)}%):`, pw - 70, y);
      doc.text(`${inv.currency} ${Number(inv.tax_amount).toLocaleString()}`, pw - 22, y, { align: "right" });
      y += 5;
    }

    if (Number(inv.discount_amount) > 0) {
      doc.text("Discount:", pw - 70, y);
      doc.text(`-${inv.currency} ${Number(inv.discount_amount).toLocaleString()}`, pw - 22, y, { align: "right" });
      y += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total:", pw - 70, y + 2);
    doc.text(`${inv.currency} ${Number(inv.total_amount).toLocaleString()}`, pw - 22, y + 2, { align: "right" });
    y += 10;

    // Payment terms
    if (inv.payment_terms) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text("Payment Terms", 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      const lines = doc.splitTextToSize(inv.payment_terms, pw - 40);
      doc.text(lines, 20, y);
      y += lines.length * 3.5;
    }

    // Notes
    if (inv.notes) {
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120);
      const noteLines = doc.splitTextToSize(inv.notes, pw - 40);
      doc.text(noteLines, 20, y);
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Status: ${inv.status.toUpperCase()}`, 20, doc.internal.pageSize.getHeight() - 15);
    doc.text(`Generated on ${format(new Date(), "MMM d, yyyy")}`, pw - 20, doc.internal.pageSize.getHeight() - 15, { align: "right" });

    doc.save(`${inv.invoice_number}.pdf`);
    toast({ title: "📄 Invoice PDF downloaded" });
  };

  // Filtering
  const filtered = invoices
    .filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          inv.recipient_name.toLowerCase().includes(t) ||
          inv.invoice_number.toLowerCase().includes(t) ||
          inv.recipient_type.toLowerCase().includes(t)
        );
      }
      return true;
    });

  // Stats
  const totalDraft = invoices.filter((i) => i.status === "draft").length;
  const totalSent = invoices.filter((i) => i.status === "sent").length;
  const totalPaid = invoices.filter((i) => i.status === "paid").length;
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <FileText size={22} className="text-primary" />
            Invoice Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Create and manage invoices for organizations, tailors, and designers."
              : "Create and manage invoices for your clients."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadInvoices}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditInvoice(null); setShowCreate(true); }}>
            <Plus size={14} className="mr-1" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Drafts", value: totalDraft, icon: Edit3, color: "text-muted-foreground" },
          { label: "Sent", value: totalSent, icon: Send, color: "text-blue-600" },
          { label: "Paid", value: totalPaid, icon: CheckCircle2, color: "text-green-600" },
          { label: "Revenue", value: `${currency} ${totalRevenue.toLocaleString()}`, icon: FileText, color: "text-primary" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card">
            <s.icon size={18} className={`${s.color} mb-2`} />
            <p className="font-heading font-bold text-lg">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["all", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground mb-2 opacity-40" />
          <p className="text-muted-foreground text-sm">No invoices found. Create your first invoice!</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice #</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Recipient</th>
                  {isSuperAdmin && <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>}
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Due</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const sc = statusConfig[inv.status] || statusConfig.draft;
                  const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status === "sent";
                  return (
                    <tr
                      key={inv.id}
                      className={`border-t border-border hover:bg-muted/30 transition-colors ${isOverdue ? "bg-destructive/5" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">{inv.invoice_number}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{inv.recipient_name}</p>
                        {inv.recipient_email && (
                          <p className="text-[10px] text-muted-foreground">{inv.recipient_email}</p>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {inv.org_id ? orgMap[inv.org_id] || "Unknown" : "Platform"}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {inv.recipient_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-heading font-semibold text-sm">
                        {inv.currency} {Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>
                          {isOverdue ? "overdue" : inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {inv.due_date ? (
                          <span className={isOverdue ? "text-destructive font-medium" : ""}>
                            {format(new Date(inv.due_date), "MMM d")}
                            {isOverdue && " ⚠"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(inv.created_at), "MMM d, yy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generatePDF(inv)} title="Download PDF">
                            <Download size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setForwardInvoice(inv)} title="Forward to Customer">
                            <Forward size={13} className="text-primary" />
                          </Button>
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(inv)} title="Edit">
                              <Edit3 size={13} />
                            </Button>
                          )}
                          {inv.status === "sent" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsPaid(inv)} title="Mark Paid">
                              <CheckCircle2 size={13} className="text-green-600" />
                            </Button>
                          )}
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteInvoice(inv)} title="Delete">
                              <Trash2 size={13} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creator Dialog */}
      <InvoiceCreatorDialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) setEditInvoice(null);
        }}
        orgId={orgId}
        orgName={orgName}
        currency={currency}
        editInvoice={editInvoice}
        onSaved={loadInvoices}
        isSuperAdmin={isSuperAdmin}
      />

      <ForwardInvoiceDialog
        open={!!forwardInvoice}
        onOpenChange={(open) => { if (!open) setForwardInvoice(null); }}
        invoice={forwardInvoice}
        issuerName={isSuperAdmin ? "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)" : (orgName || "Invoice")}
      />
    </motion.div>
  );
};

export default InvoiceManagerPanel;
