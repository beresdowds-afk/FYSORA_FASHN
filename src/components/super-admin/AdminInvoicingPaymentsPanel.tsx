import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  FileText,
  CreditCard,
  Search,
  RefreshCw,
  Receipt,
  TrendingUp,
  Building2,
  Download,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import jsPDF from "jspdf";

/* ─── Types ─── */
interface PlatformInvoice {
  id: string;
  order_number: string;
  title: string;
  org_name: string;
  org_id: string;
  total_amount: number;
  amount_paid: number;
  currency: string;
  payment_status: string;
  platform_fee: number;
  admin_fee: number;
  created_at: string;
}

interface PlatformPayment {
  id: string;
  order_id: string;
  org_id: string;
  org_name: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  platform_fee_amount: number;
  admin_fee_amount: number;
  paid_at: string | null;
  created_at: string;
}

interface FeeEntry {
  id: string;
  org_id: string;
  org_name: string;
  order_id: string | null;
  fee_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

/* ─── Component ─── */
const AdminInvoicingPaymentsPanel = () => {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"overview" | "invoices" | "payments" | "fees" | "premium" | "verifications">("overview");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Data
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [fees, setFees] = useState<FeeEntry[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, string>>({});
  const [measurementBookings, setMeasurementBookings] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<{ orgs: any[]; profiles: any[] }>({ orgs: [], profiles: [] });

  const loadAll = useCallback(async () => {
    setLoading(true);

    // Load orgs for name mapping
    const { data: orgs } = await supabase.from("organizations").select("id, name");
    const map: Record<string, string> = {};
    (orgs || []).forEach((o: any) => { map[o.id] = o.name; });
    setOrgMap(map);

    const [orderRes, payRes, feeRes] = await Promise.all([
      supabase.from("orders").select("id, order_number, title, org_id, total_amount, amount_paid, currency, payment_status, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("platform_fee_ledger").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    setInvoices(
      (orderRes.data || []).map((o: any) => ({
        ...o,
        org_name: map[o.org_id] || "Unknown",
        platform_fee: 0,
        admin_fee: 0,
      }))
    );

    setPayments(
      (payRes.data || []).map((p: any) => ({
        ...p,
        org_name: map[p.org_id] || "Unknown",
      }))
    );

    setFees(
      (feeRes.data || []).map((f: any) => ({
        ...f,
        org_name: map[f.org_id] || "Unknown",
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── Stats ─── */
  const totalPlatformRevenue = payments
    .filter(p => p.status === "completed")
    .reduce((s, p) => s + p.platform_fee_amount + p.admin_fee_amount, 0);
  const totalOrderVolume = payments
    .filter(p => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);
  const totalSurcharges = fees
    .filter(f => f.fee_type === "customer_surcharge")
    .reduce((s, f) => s + Number(f.amount), 0);
  const totalAdminFees = fees
    .filter(f => f.fee_type === "org_admin_fee")
    .reduce((s, f) => s + Number(f.amount), 0);
  const pendingCount = invoices.filter(i => i.payment_status !== "paid").length;

  /* ─── PDF ─── */
  const generatePlatformInvoicePDF = (inv: PlatformInvoice) => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Fashion Stitches Africa", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Platform Invoice", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Invoice #: ${inv.order_number}`, 20, y);
    doc.text(`Date: ${format(new Date(inv.created_at), "MMM d, yyyy")}`, 130, y);
    y += 6;
    doc.text(`Organization: ${inv.org_name}`, 20, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, y);
    doc.text("Amount", 160, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text(inv.title, 20, y);
    doc.text(`${inv.currency} ${inv.total_amount.toLocaleString()}`, 160, y, { align: "right" });
    y += 6;
    doc.text(`Amount Paid`, 20, y);
    doc.text(`${inv.currency} ${inv.amount_paid.toLocaleString()}`, 160, y, { align: "right" });
    y += 6;
    doc.text(`Balance Due`, 20, y);
    doc.text(`${inv.currency} ${(inv.total_amount - inv.amount_paid).toLocaleString()}`, 160, y, { align: "right" });
    y += 10;

    doc.line(20, y, 190, y);
    y += 6;
    doc.setFontSize(8);
    doc.text(`Payment Status: ${inv.payment_status.toUpperCase()}`, 20, y);

    doc.save(`Platform-Invoice-${inv.order_number}.pdf`);
    toast({ title: "📄 Platform invoice downloaded" });
  };

  /* ─── Filtering ─── */
  const filterBySearch = <T extends Record<string, any>>(items: T[], fields: string[]) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => fields.some(f => String(item[f] || "").toLowerCase().includes(term)));
  };

  const filteredInvoices = filterBySearch(invoices, ["order_number", "title", "org_name"])
    .filter(i => statusFilter === "all" || i.payment_status === statusFilter);
  const filteredPayments = filterBySearch(payments, ["org_name", "order_id"])
    .filter(p => statusFilter === "all" || p.status === statusFilter);
  const filteredFees = filterBySearch(fees, ["org_name", "fee_type"]);

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
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Receipt size={24} className="text-primary" />
            Platform Invoicing & Payments
          </h1>
          <p className="text-sm text-muted-foreground">Global view of all invoices, payments, and fee collections across organizations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Order Volume", value: `$${totalOrderVolume.toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
          { label: "Platform Revenue", value: `$${totalPlatformRevenue.toLocaleString()}`, icon: DollarSign, color: "text-chart-2" },
          { label: "Customer Surcharges", value: `$${totalSurcharges.toLocaleString()}`, icon: ArrowUpRight, color: "text-chart-3" },
          { label: "Admin Fees", value: `$${totalAdminFees.toLocaleString()}`, icon: ArrowDownLeft, color: "text-chart-4" },
          { label: "Pending Invoices", value: pendingCount, icon: Clock, color: "text-chart-5" },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card">
            <stat.icon size={20} className={`${stat.color} mb-2`} />
            <p className="font-heading font-bold text-lg">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "overview" as const, label: "Overview", icon: TrendingUp },
          { id: "invoices" as const, label: "All Invoices", icon: FileText },
          { id: "payments" as const, label: "All Payments", icon: CreditCard },
          { id: "fees" as const, label: "Fee Ledger", icon: DollarSign },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveView(tab.id); setStatusFilter("all"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeView === tab.id
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      {activeView !== "overview" && (
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by org, order..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          {(activeView === "invoices" || activeView === "payments") && (
            <div className="flex gap-1.5">
              {["all", ...(activeView === "invoices" ? ["unpaid", "partial", "paid"] : ["pending", "completed", "failed"])].map((s) => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="text-xs capitalize">
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ OVERVIEW ═══ */}
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* Top Orgs by payment volume */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <span className="font-heading font-semibold text-sm">Top Organizations by Revenue</span>
            </div>
            <div className="divide-y divide-border">
              {Object.entries(
                payments
                  .filter(p => p.status === "completed")
                  .reduce<Record<string, { name: string; total: number; fees: number; count: number }>>((acc, p) => {
                    if (!acc[p.org_id]) acc[p.org_id] = { name: p.org_name, total: 0, fees: 0, count: 0 };
                    acc[p.org_id].total += p.amount;
                    acc[p.org_id].fees += p.platform_fee_amount + p.admin_fee_amount;
                    acc[p.org_id].count++;
                    return acc;
                  }, {})
              )
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 10)
                .map(([orgId, data]) => (
                  <div key={orgId} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{data.name}</p>
                      <p className="text-xs text-muted-foreground">{data.count} payments</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold text-sm">${data.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Fees: ${data.fees.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              {payments.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">No payment data yet.</div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <span className="font-heading font-semibold text-sm">Recent Payments</span>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {payments.slice(0, 20).map((pay) => (
                <div key={pay.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{pay.org_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pay.payment_method?.replace("_", " ") || "—"} • {pay.paid_at ? format(new Date(pay.paid_at), "MMM d, h:mm a") : "Pending"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-semibold text-sm">${pay.amount.toLocaleString()}</span>
                    <Badge variant={pay.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">
                      {pay.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">No payments yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ INVOICES ═══ */}
      {activeView === "invoices" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px_120px_100px_80px] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Invoice</span>
            <span>Organization</span>
            <span>Amount</span>
            <span>Paid</span>
            <span>Status</span>
            <span>PDF</span>
          </div>
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No invoices found.</div>
          ) : (
            filteredInvoices.map((inv) => (
              <div key={inv.id} className="grid grid-cols-[1fr_1fr_120px_120px_100px_80px] gap-3 px-5 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-medium text-sm">{inv.order_number}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                </div>
                <p className="text-sm truncate">{inv.org_name}</p>
                <span className="font-semibold text-sm">${inv.total_amount.toLocaleString()}</span>
                <span className="text-sm">${inv.amount_paid.toLocaleString()}</span>
                <Badge
                  variant={inv.payment_status === "paid" ? "default" : "secondary"}
                  className="text-[10px] capitalize"
                >
                  {inv.payment_status === "paid" ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                  {inv.payment_status}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generatePlatformInvoicePDF(inv)}>
                  <Download size={14} />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ PAYMENTS ═══ */}
      {activeView === "payments" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px_100px_80px_80px_140px] gap-2 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Organization</span>
            <span>Order</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Fees</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No payments found.</div>
          ) : (
            filteredPayments.map((pay) => (
              <div key={pay.id} className="grid grid-cols-[1fr_1fr_120px_100px_80px_80px_140px] gap-2 px-5 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors">
                <p className="text-sm truncate">{pay.org_name}</p>
                <p className="text-xs text-muted-foreground truncate">{pay.order_id.slice(0, 8)}...</p>
                <span className="font-semibold text-sm">${pay.amount.toLocaleString()}</span>
                <span className="text-xs capitalize">{pay.payment_method?.replace("_", " ") || "—"}</span>
                <span className="text-xs text-muted-foreground">${(pay.platform_fee_amount + pay.admin_fee_amount).toLocaleString()}</span>
                <Badge variant={pay.status === "completed" ? "default" : pay.status === "failed" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                  {pay.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {pay.paid_at ? format(new Date(pay.paid_at), "MMM d, yyyy h:mm a") : "Pending"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ FEE LEDGER ═══ */}
      {activeView === "fees" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px_100px_100px_140px] gap-2 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Organization</span>
            <span>Fee Type</span>
            <span>Amount</span>
            <span>Currency</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          {filteredFees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No fee records.</div>
          ) : (
            filteredFees.map((fee) => (
              <div key={fee.id} className="grid grid-cols-[1fr_1fr_120px_100px_100px_140px] gap-2 px-5 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors">
                <p className="text-sm truncate">{fee.org_name}</p>
                <span className="text-sm capitalize">{fee.fee_type.replace(/_/g, " ")}</span>
                <span className="font-semibold text-sm">${Number(fee.amount).toLocaleString()}</span>
                <span className="text-xs">{fee.currency}</span>
                <Badge variant={fee.status === "settled" ? "default" : "secondary"} className="text-[10px] capitalize">{fee.status}</Badge>
                <span className="text-[10px] text-muted-foreground">{format(new Date(fee.created_at), "MMM d, yyyy")}</span>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
};

export default AdminInvoicingPaymentsPanel;
