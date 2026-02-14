import { useState, useMemo } from "react";
import { useOrders, statusLabels, statusColors, type Order, type OrderStatus } from "@/hooks/useOrders";
import { useOrderDetail } from "@/hooks/useOrders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { Search, Users, ShoppingBag, ArrowLeft, Package, Ruler, Clock } from "lucide-react";

interface CustomersTabProps {
  orgId: string;
  currency: string;
}

interface CustomerSummary {
  id: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  statuses: Record<string, number>;
}

const CustomerDetailSheet = ({
  customer,
  orders,
  currency,
  open,
  onOpenChange,
}: {
  customer: CustomerSummary | null;
  orders: Order[];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const { items } = useOrderDetail(selectedOrderId);

  if (!customer) return null;

  const customerOrders = orders.filter((o) => o.customer_id === customer.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {customer.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
              <p className="text-lg font-bold">{customer.orderCount}</p>
              <p className="text-[10px] text-muted-foreground">Orders</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
              <p className="text-lg font-bold">{customer.totalSpent.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{currency} Spent</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
              <p className="text-lg font-bold">
                {Object.entries(customer.statuses)
                  .filter(([s]) => s !== "delivered" && s !== "cancelled")
                  .reduce((sum, [, c]) => sum + c, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
          </div>

          {/* Orders List */}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">All Orders</h4>
            <div className="space-y-2">
              {customerOrders.map((order) => (
                <div key={order.id}>
                  <button
                    onClick={() => setSelectedOrderId(selectedOrderId === order.id ? undefined : order.id)}
                    className="w-full p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{order.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {new Date(order.created_at).toLocaleDateString()}
                          <span className="ml-2">{order.order_number}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Number(order.total_amount).toLocaleString()} {order.currency}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[order.status as OrderStatus]}`}>
                          {statusLabels[order.status as OrderStatus]}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded order items with measurements */}
                  {selectedOrderId === order.id && items.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="ml-4 mt-1 space-y-2"
                    >
                      {items.map((item) => {
                        const measurements = item.measurements as Record<string, string> | null;
                        const hasMeasurements = measurements && Object.values(measurements).some((v) => v && String(v).trim() !== "");
                        return (
                          <div key={item.id} className="p-2.5 rounded-lg border border-border/50 bg-muted/20">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{item.name}</span>
                              <span>{item.quantity} × {Number(item.unit_price).toLocaleString()}</span>
                            </div>
                            {item.fabric_details && (
                              <p className="text-[10px] text-muted-foreground mt-1">{item.fabric_details}</p>
                            )}
                            {hasMeasurements && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                  <Ruler size={10} /> Measurements
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                  {Object.entries(measurements!)
                                    .filter(([, v]) => v && String(v).trim() !== "")
                                    .map(([key, value]) => (
                                      <div key={key} className="flex justify-between text-[10px]">
                                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                                        <span className="font-medium">{value} cm</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const CustomersTab = ({ orgId, currency }: CustomersTabProps) => {
  const { orders, loading } = useOrders(orgId);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    orders.forEach((order: Order) => {
      const existing = map.get(order.customer_id);
      if (existing) {
        existing.orderCount++;
        existing.totalSpent += Number(order.total_amount) || 0;
        if (order.created_at > existing.lastOrderDate) existing.lastOrderDate = order.created_at;
        existing.statuses[order.status] = (existing.statuses[order.status] || 0) + 1;
      } else {
        map.set(order.customer_id, {
          id: order.customer_id,
          name: order.customer_profile?.display_name || "Unknown",
          orderCount: 1,
          totalSpent: Number(order.total_amount) || 0,
          lastOrderDate: order.created_at,
          statuses: { [order.status]: 1 },
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.orderCount - a.orderCount);
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  const openCustomerDetail = (customer: CustomerSummary) => {
    setSelectedCustomer(customer);
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
        <h2 className="font-heading font-bold text-2xl">Customers</h2>
        <span className="text-sm text-muted-foreground">{customers.length} total</span>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Users size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-2">
            {search ? "No customers found" : "No customers yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different search term." : "Customers will appear here once orders are created."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Orders</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Total Spent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Last Order</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Active</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => {
                  const activeCount = Object.entries(customer.statuses)
                    .filter(([s]) => s !== "delivered" && s !== "cancelled")
                    .reduce((sum, [, c]) => sum + c, 0);
                  return (
                    <tr
                      key={customer.id}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => openCustomerDetail(customer)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm">
                          <ShoppingBag size={12} className="text-muted-foreground" />
                          {customer.orderCount}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium hidden sm:table-cell">
                        {customer.totalSpent.toLocaleString()} {currency}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {activeCount > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                            {activeCount} active
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerDetailSheet
        customer={selectedCustomer}
        orders={orders}
        currency={currency}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </motion.div>
  );
};

export default CustomersTab;
