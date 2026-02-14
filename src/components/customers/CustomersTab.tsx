import { useState, useMemo } from "react";
import { useOrders, type Order } from "@/hooks/useOrders";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Search, Users, ShoppingBag, DollarSign } from "lucide-react";

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

const CustomersTab = ({ orgId, currency }: CustomersTabProps) => {
  const { orders, loading } = useOrders(orgId);
  const [search, setSearch] = useState("");

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
                    <tr key={customer.id} className="border-t border-border hover:bg-muted/30 transition-colors">
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
    </motion.div>
  );
};

export default CustomersTab;
