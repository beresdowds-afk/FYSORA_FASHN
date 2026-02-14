import { useState } from "react";
import { useOrders, statusLabels, statusColors, type OrderStatus, type Order } from "@/hooks/useOrders";
import { useOrgMembers, type AppRole } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateOrderDialog from "./CreateOrderDialog";
import OrderDetailSheet from "./OrderDetailSheet";
import { motion } from "framer-motion";
import { Plus, ShoppingBag, Filter, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrdersTabProps {
  orgId: string;
  currency: string;
  role: AppRole | null;
}

const OrdersTab = ({ orgId, currency, role }: OrdersTabProps) => {
  const { user } = useAuth();
  const { orders, loading, createOrder, updateOrderStatus, assignTailor, deleteOrder } = useOrders(orgId);
  const { members } = useOrgMembers(orgId);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const canManage = role === "org_admin" || role === "super_admin";

  const tailors = members
    .filter((m) => m.role === "tailor" || m.role === "org_admin")
    .map((m) => ({ id: m.user_id, display_name: (m as any).profile?.display_name || null }));

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await updateOrderStatus(orderId, newStatus);
    if (error) toast({ title: "Error", description: (error as any).message, variant: "destructive" });
    else toast({ title: `Order moved to ${statusLabels[newStatus]}` });
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-2xl">Orders</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <Filter size={12} className="mr-1" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {(Object.entries(statusLabels) as [OrderStatus, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && user && (
            <CreateOrderDialog orgId={orgId} currency={currency} userId={user.id} createOrder={createOrder}>
              <Button variant="hero" size="sm">
                <Plus size={16} className="mr-1" /> New Order
              </Button>
            </CreateOrderDialog>
          )}
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
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      {Number(order.total_amount).toLocaleString()} {order.currency}
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
      />
    </motion.div>
  );
};

export default OrdersTab;
