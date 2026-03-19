import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import { useDynamicPlatformFees } from "@/hooks/usePlatformFees";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Package,
  FileText,
  CreditCard,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
  RefreshCw,
  Receipt,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import jsPDF from "jspdf";
import type { AppRole } from "@/hooks/useOrganization";

/* ─── Types ─── */
interface CatalogueItem {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  currency: string | null;
  is_available: boolean;
  description: string | null;
  image_url: string | null;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_type: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  platform_fee_amount: number;
  admin_fee_amount: number;
  notes: string | null;
}

interface FeeEntry {
  id: string;
  order_id: string | null;
  fee_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  order_number: string;
  title: string;
  customer_name: string | null;
  total_amount: number;
  amount_paid: number;
  currency: string;
  payment_status: string;
  status: string;
  created_at: string;
  due_date: string | null;
}

/* ─── Props ─── */
interface OrgBillingInvoicingTabProps {
  orgId: string;
  orgName: string;
  currency: string;
  role: AppRole | null;
}

/* ─── Component ─── */
const OrgBillingInvoicingTab = ({ orgId, orgName, currency, role }: OrgBillingInvoicingTabProps) => {
  const { toast } = useToast();
  const { surchargePercent, adminPercent, calculate } = useDynamicPlatformFees();
  const [activeView, setActiveView] = useState<"products" | "invoices" | "payments" | "fees" | "subscriptions">("products");
  const [loading, setLoading] = useState(true);
  const [subInvoices, setSubInvoices] = useState<any[]>([]);

  // Data
  const [products, setProducts] = useState<CatalogueItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fees, setFees] = useState<FeeEntry[]>([]);

  // Search/filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Product edit
  const [editProduct, setEditProduct] = useState<{ item: CatalogueItem; price: string } | null>(null);

  const canManage = role === "org_admin" || role === "manager" || role === "super_admin";

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [prodRes, orderRes, payRes, feeRes, subInvRes] = await Promise.all([
      supabase.from("org_catalogue_items").select("*").eq("org_id", orgId).order("sort_order"),
      supabase.from("orders").select("id, order_number, title, total_amount, amount_paid, currency, payment_status, status, created_at, due_date, customer_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
      supabase.from("payments").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
      supabase.from("platform_fee_ledger").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
      supabase.from("subscription_invoices").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
    ]);

    setProducts((prodRes.data as CatalogueItem[]) || []);

    // Resolve customer names for invoices
    const orders = orderRes.data || [];
    const customerIds = [...new Set(orders.map((o: any) => o.customer_id).filter(Boolean))];
    let profileMap: Record<string, string> = {};
    if (customerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", customerIds);
      profileMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
        acc[p.id] = p.display_name || "Unknown";
        return acc;
      }, {});
    }

    setInvoices(
      orders.map((o: any) => ({
        ...o,
        customer_name: profileMap[o.customer_id] || "Unknown",
      }))
    );
    setPayments((payRes.data as Payment[]) || []);
    setFees((feeRes.data as FeeEntry[]) || []);
    setSubInvoices((subInvRes.data as any[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── Stats ─── */
  const totalRevenue = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalFees = fees.reduce((s, f) => s + Number(f.amount), 0);
  const pendingPayments = invoices.filter(i => i.payment_status !== "paid").length;
  const productCount = products.length;

  /* ─── Product price update ─── */
  const saveProductPrice = async () => {
    if (!editProduct) return;
    const newPrice = parseFloat(editProduct.price);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("org_catalogue_items")
      .update({ price: newPrice })
      .eq("id", editProduct.item.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Price updated", description: `${editProduct.item.name}: ${currency} ${newPrice}` });
      setEditProduct(null);
      loadAll();
    }
  };

  /* ─── PDF Invoice generation ─── */
  const generateInvoicePDF = (inv: InvoiceRow) => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(orgName, 20, y);
    y += 10;

    doc.setFontSize(16);
    doc.text("INVOICE", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${inv.order_number}`, 20, y);
    doc.text(`Date: ${format(new Date(inv.created_at), "MMM d, yyyy")}`, 120, y);
    y += 6;
    doc.text(`Customer: ${inv.customer_name || "N/A"}`, 20, y);
    if (inv.due_date) {
      doc.text(`Due: ${format(new Date(inv.due_date), "MMM d, yyyy")}`, 120, y);
    }
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
    y += 8;

    const breakdown = calculate(inv.total_amount);
    doc.setFontSize(9);
    doc.text(`Platform Fee (${surchargePercent}%):`, 20, y);
    doc.text(`${inv.currency} ${breakdown.platformFee.toLocaleString()}`, 160, y, { align: "right" });
    y += 5;
    doc.text(`Admin Fee (${adminPercent}%):`, 20, y);
    doc.text(`${inv.currency} ${breakdown.adminFee.toLocaleString()}`, 160, y, { align: "right" });
    y += 8;

    doc.line(20, y, 190, y);
    y += 6;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Total:", 20, y);
    doc.text(`${inv.currency} ${breakdown.customerTotal.toLocaleString()}`, 160, y, { align: "right" });
    y += 6;
    doc.setFontSize(10);
    doc.text(`Paid: ${inv.currency} ${inv.amount_paid.toLocaleString()}`, 20, y);
    doc.text(`Balance: ${inv.currency} ${(breakdown.customerTotal - inv.amount_paid).toLocaleString()}`, 160, y, { align: "right" });
    y += 12;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${inv.payment_status.toUpperCase()}`, 20, y);

    doc.save(`Invoice-${inv.order_number}.pdf`);
    toast({ title: "📄 Invoice downloaded" });
  };

  /* ─── Filtering ─── */
  const filterItems = <T extends Record<string, any>>(items: T[], searchFields: string[]) => {
    let filtered = items;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        searchFields.some(f => String(item[f] || "").toLowerCase().includes(term))
      );
    }
    return filtered;
  };

  const filteredProducts = filterItems(products, ["name", "category"]);
  const filteredInvoices = filterItems(invoices, ["order_number", "title", "customer_name"])
    .filter(i => statusFilter === "all" || i.payment_status === statusFilter);
  const filteredPayments = filterItems(payments, ["order_id", "payment_method"])
    .filter(p => statusFilter === "all" || p.status === statusFilter);

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
            <Receipt size={22} className="text-primary" />
            Billing, Invoicing & Payments
          </h2>
          <p className="text-sm text-muted-foreground">Manage product pricing, generate invoices, and track payments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Products", value: productCount, icon: Package, color: "text-primary" },
          { label: "Total Revenue", value: <CurrencyDisplay amount={totalRevenue} currency={currency} />, icon: TrendingUp, color: "text-chart-2" },
          { label: "Platform Fees", value: <CurrencyDisplay amount={totalFees} currency={currency} />, icon: DollarSign, color: "text-chart-4" },
          { label: "Pending Invoices", value: pendingPayments, icon: Clock, color: "text-chart-5" },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card">
            <stat.icon size={20} className={`${stat.color} mb-2`} />
            <p className="font-heading font-bold text-xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "products" as const, label: "Product Pricing", icon: Package },
          { id: "invoices" as const, label: "Invoices", icon: FileText },
          { id: "payments" as const, label: "Payment History", icon: CreditCard },
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

      {/* Search bar */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {(activeView === "invoices" || activeView === "payments") && (
          <div className="flex gap-1.5">
            {["all", ...(activeView === "invoices" ? ["unpaid", "partial", "paid"] : ["pending", "completed", "failed"])].map((s) => (
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
        )}
      </div>

      {/* ═══ PRODUCT PRICING ═══ */}
      {activeView === "products" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_100px_80px] gap-4 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Product</span>
            <span>Price</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No products found.</div>
          ) : (
            filteredProducts.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_100px_80px] gap-4 px-5 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category || "Uncategorized"}</p>
                </div>
                <div>
                  <span className="font-heading font-bold text-sm">
                    <CurrencyDisplay amount={item.price || 0} currency={item.currency || currency} />
                  </span>
                  {item.price && (
                    <p className="text-[10px] text-muted-foreground">
                      Customer pays: <CurrencyDisplay amount={calculate(item.price).customerTotal} currency={item.currency || currency} />
                    </p>
                  )}
                </div>
                <div>
                  <Badge variant={item.is_available ? "default" : "secondary"} className="text-[10px]">
                    {item.is_available ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditProduct({ item, price: String(item.price || 0) })}
                    >
                      <Edit3 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ INVOICES ═══ */}
      {activeView === "invoices" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px_120px_100px_80px] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Invoice #</span>
            <span>Customer</span>
            <span>Amount</span>
            <span>Paid</span>
            <span>Status</span>
            <span>Actions</span>
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
                <p className="text-sm truncate">{inv.customer_name}</p>
                <span className="font-heading font-semibold text-sm">
                  <CurrencyDisplay amount={inv.total_amount} currency={inv.currency || currency} />
                </span>
                <span className="text-sm">
                  <CurrencyDisplay amount={inv.amount_paid} currency={inv.currency || currency} />
                </span>
                <Badge
                  variant={inv.payment_status === "paid" ? "default" : "secondary"}
                  className="text-[10px] capitalize"
                >
                  {inv.payment_status === "paid" ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                  {inv.payment_status}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateInvoicePDF(inv)}>
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
          <div className="grid grid-cols-[1fr_120px_120px_100px_140px] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Order</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No payments found.</div>
          ) : (
            filteredPayments.map((pay) => (
              <div key={pay.id} className="grid grid-cols-[1fr_120px_120px_100px_140px] gap-3 px-5 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors">
                <p className="text-sm font-medium truncate">{pay.order_id.slice(0, 8)}...</p>
                <span className="font-heading font-semibold text-sm">
                  <CurrencyDisplay amount={pay.amount} currency={pay.currency || currency} />
                </span>
                <span className="text-sm capitalize">{pay.payment_method?.replace("_", " ") || "—"}</span>
                <Badge
                  variant={pay.status === "completed" ? "default" : pay.status === "failed" ? "destructive" : "secondary"}
                  className="text-[10px] capitalize"
                >
                  {pay.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {pay.paid_at ? format(new Date(pay.paid_at), "MMM d, yyyy h:mm a") : "Pending"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ FEE LEDGER ═══ */}
      {activeView === "fees" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card border-l-4 border-l-primary">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight size={12} /> Customer Surcharge ({surchargePercent}%)</p>
              <p className="font-heading font-bold text-lg mt-1">
                <CurrencyDisplay
                  amount={fees.filter(f => f.fee_type === "customer_surcharge").reduce((s, f) => s + Number(f.amount), 0)}
                  currency={currency}
                />
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card border-l-4 border-l-secondary">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownLeft size={12} /> Admin Fee ({adminPercent}%)</p>
              <p className="font-heading font-bold text-lg mt-1">
                <CurrencyDisplay
                  amount={fees.filter(f => f.fee_type === "org_admin_fee").reduce((s, f) => s + Number(f.amount), 0)}
                  currency={currency}
                />
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_100px_140px] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
              <span>Fee Type</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Date</span>
            </div>
            {fees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No fee entries yet.</div>
            ) : (
              fees.map((fee) => (
                <div key={fee.id} className="grid grid-cols-[1fr_120px_100px_140px] gap-3 px-5 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors">
                  <span className="text-sm capitalize">{fee.fee_type.replace("_", " ")}</span>
                  <span className="font-heading font-semibold text-sm">
                    <CurrencyDisplay amount={fee.amount} currency={fee.currency || currency} />
                  </span>
                  <Badge variant={fee.status === "settled" ? "default" : "secondary"} className="text-[10px] capitalize">
                    {fee.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(fee.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Edit Product Price Dialog ─── */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Price — {editProduct?.item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current price</p>
              <p className="font-heading font-bold text-lg">
                <CurrencyDisplay amount={editProduct?.item.price || 0} currency={editProduct?.item.currency || currency} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">New price ({currency})</p>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editProduct?.price || ""}
                onChange={(e) => editProduct && setEditProduct({ ...editProduct, price: e.target.value })}
              />
              {editProduct?.price && !isNaN(parseFloat(editProduct.price)) && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <p>Customer will pay: <strong><CurrencyDisplay amount={calculate(parseFloat(editProduct.price)).customerTotal} currency={currency} /></strong> (incl. {surchargePercent}% platform fee)</p>
                  <p>Your net revenue: <strong><CurrencyDisplay amount={calculate(parseFloat(editProduct.price)).orgNetRevenue} currency={currency} /></strong> (after {adminPercent}% admin fee)</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>Cancel</Button>
            <Button onClick={saveProductPrice}>Save Price</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default OrgBillingInvoicingTab;
