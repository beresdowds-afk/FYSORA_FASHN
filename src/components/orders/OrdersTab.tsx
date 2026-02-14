import { useState, useMemo } from "react";
import { useOrders, statusLabels, statusColors, type OrderStatus, type Order } from "@/hooks/useOrders";
import { useOrgMembers, type AppRole } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import CreateOrderDialog from "./CreateOrderDialog";
import OrderDetailSheet from "./OrderDetailSheet";
import { motion } from "framer-motion";
import { Plus, ShoppingBag, Filter, Trash2, Search, CalendarIcon, X, Download, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";

const exportOrdersCSV = (orders: Order[], currency: string) => {
  const headers = ["Order Number", "Title", "Status", "Customer", "Tailor", "Due Date", "Amount", "Currency", "Created"];
  const rows = orders.map((o) => [
    o.order_number,
    `"${o.title.replace(/"/g, '""')}"`,
    o.status,
    o.customer_profile?.display_name || "Unknown",
    o.tailor_profile?.display_name || "Unassigned",
    o.due_date || "",
    String(o.total_amount || 0),
    o.currency || currency,
    new Date(o.created_at).toLocaleDateString(),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

interface OrdersTabProps {
  orgId: string;
  currency: string;
  role: AppRole | null;
  orgName?: string;
  orgSettings?: {
    invoice_address?: string | null;
    invoice_payment_terms?: string | null;
    invoice_notes?: string | null;
    invoice_logo_url?: string | null;
  };
}

const OrdersTab = ({ orgId, currency, role, orgName, orgSettings }: OrdersTabProps) => {
  const { user } = useAuth();
  const { orders, loading, createOrder, updateOrderStatus, assignTailor, deleteOrder, refetch } = useOrders(orgId);
  const { members } = useOrgMembers(orgId);
  const { createNotification } = useNotifications();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const canManage = role === "org_admin" || role === "super_admin";

  const tailors = members
    .filter((m) => m.role === "tailor" || m.role === "org_admin")
    .map((m) => ({ id: m.user_id, display_name: (m as any).profile?.display_name || null }));

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);
    if (paymentFilter !== "all") result = result.filter((o) => o.payment_status === paymentFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.order_number.toLowerCase().includes(q) ||
          o.customer_profile?.display_name?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) result = result.filter((o) => new Date(o.created_at) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.created_at) <= end);
    }
    return result;
  }, [orders, statusFilter, paymentFilter, searchQuery, dateFrom, dateTo]);

  const hasFilters = searchQuery || dateFrom || dateTo || statusFilter !== "all" || paymentFilter !== "all";
  const clearFilters = () => { setSearchQuery(""); setDateFrom(undefined); setDateTo(undefined); setStatusFilter("all"); setPaymentFilter("all"); };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    const { error } = await updateOrderStatus(orderId, newStatus);
    if (error) toast({ title: "Error", description: (error as any).message, variant: "destructive" });
    else {
      toast({ title: `Order moved to ${statusLabels[newStatus]}` });
      // Notify relevant users
      if (order) {
        const notifyUsers = new Set<string>();
        if (order.customer_id) notifyUsers.add(order.customer_id);
        if (order.assigned_tailor_id) notifyUsers.add(order.assigned_tailor_id);
        // Don't notify yourself
        if (user) notifyUsers.delete(user.id);
        notifyUsers.forEach((uid) => {
          createNotification({
            org_id: orgId,
            user_id: uid,
            order_id: orderId,
            title: `Order ${statusLabels[newStatus]}`,
            message: `"${order.title}" (${order.order_number}) has been moved to ${statusLabels[newStatus]}.`,
          });
        });
      }
    }
  };

  const handleAssignTailor = async (orderId: string, tailorId: string) => {
    const { error } = await assignTailor(orderId, tailorId);
    if (error) toast({ title: "Error", description: (error as any).message, variant: "destructive" });
    else toast({ title: "Tailor assigned" });
  };

  const handleDelete = async (orderId: string) => {
    const { error } = await deleteOrder(orderId);
    if (error) toast({ title: "Error", description: (error as any).message, variant: "destructive" });
    else toast({ title: "Order deleted" });
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-2xl">Orders</h2>
          <div className="flex items-center gap-2">
            {orders.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => exportOrdersCSV(filteredOrders, currency)}>
                <Download size={12} className="mr-1" /> Export
              </Button>
            )}
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={clearFilters}>
                <X size={12} className="mr-1" /> Clear
              </Button>
            )}
            {canManage && user && (
              <CreateOrderDialog orgId={orgId} currency={currency} userId={user.id} createOrder={createOrder}>
                <Button variant="hero" size="sm">
                  <Plus size={16} className="mr-1" /> New Order
                </Button>
              </CreateOrderDialog>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <Filter size={12} className="mr-1" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.entries(statusLabels) as [OrderStatus, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <CreditCard size={12} className="mr-1" />
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1", dateFrom && "text-primary")}>
                <CalendarIcon size={12} />
                {dateFrom ? format(dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1", dateTo && "text-primary")}>
                <CalendarIcon size={12} />
                {dateTo ? format(dateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-2">No orders yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {statusFilter !== "all" ? `No ${statusLabels[statusFilter as OrderStatus]} orders found.` : "Create your first order to get started."}
          </p>
          {canManage && user && statusFilter === "all" && (
            <CreateOrderDialog orgId={orgId} currency={currency} userId={user.id} createOrder={createOrder}>
              <Button variant="hero" size="sm">
                <Plus size={16} className="mr-1" /> Create First Order
              </Button>
            </CreateOrderDialog>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Order</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Tailor</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Due Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Payment</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  {canManage && <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openDetail(order)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{order.title}</p>
                      <p className="text-[10px] text-muted-foreground">{order.order_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status as OrderStatus]}`}>
                        {statusLabels[order.status as OrderStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                      {order.customer_profile?.display_name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {order.tailor_profile?.display_name || <span className="text-muted-foreground">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {order.due_date ? new Date(order.due_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.payment_status === "paid"
                          ? "bg-secondary/15 text-secondary"
                          : order.payment_status === "partially_paid" || order.payment_status === "deposit_paid"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {order.payment_status === "paid" ? "Paid" : order.payment_status === "partially_paid" ? "Partial" : order.payment_status === "deposit_paid" ? "Deposit" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      <CurrencyDisplay amount={Number(order.total_amount)} currency={order.currency} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(order.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrderDetailSheet
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role={role}
        tailors={tailors}
        onStatusChange={handleStatusChange}
        onAssignTailor={handleAssignTailor}
        onRefetchOrders={refetch}
        orgId={orgId}
        orgName={orgName}
        orgSettings={orgSettings}
      />
    </motion.div>
  );
};

export default OrdersTab;
