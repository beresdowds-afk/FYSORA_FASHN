import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut, Package, CreditCard, Bell, Ruler, Clock, ChevronRight,
  CheckCircle2, AlertCircle, Lock
} from "lucide-react";
import UserNotificationPreferences from "@/components/communications/UserNotificationPreferences";

const statusLabels: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", measuring: "Measuring",
  cutting: "Cutting", sewing: "Sewing", fitting: "Fitting",
  completed: "Completed", delivered: "Delivered", cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground", confirmed: "bg-primary/15 text-primary",
  measuring: "bg-secondary/15 text-secondary", cutting: "bg-accent/15 text-accent-foreground",
  sewing: "bg-primary/15 text-primary", fitting: "bg-secondary/15 text-secondary",
  completed: "bg-green-100 text-green-700", delivered: "bg-green-200 text-green-800",
  cancelled: "bg-destructive/15 text-destructive",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "Unpaid", deposit_paid: "Deposit Paid",
  partially_paid: "Partially Paid", paid: "Fully Paid",
};

const CustomerPortal = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [registration, setRegistration] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Fetch profile & orgs
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, membershipsRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.from("org_members").select("org_id, role").eq("user_id", user.id).eq("is_active", true),
      ]);
      setProfile(profileRes.data);

      if (membershipsRes.data && membershipsRes.data.length > 0) {
        const orgIds = membershipsRes.data.map((m) => m.org_id);
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, name, currency")
          .in("id", orgIds);
        setOrgs(orgData || []);
        if (orgData && orgData.length > 0) {
          setSelectedOrgId(orgData[0].id);
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Fetch orders, payments, registration for selected org
  useEffect(() => {
    if (!user || !selectedOrgId) return;
    const load = async () => {
      const [ordersRes, paymentsRes, regRes, rateRes] = await Promise.all([
        supabase.from("orders").select("*").eq("org_id", selectedOrgId).eq("customer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("org_id", selectedOrgId).order("created_at", { ascending: false }),
        supabase.from("customer_registrations").select("*").eq("org_id", selectedOrgId).eq("user_id", user.id).maybeSingle(),
        supabase.from("exchange_rates").select("rate").eq("target_currency", "USD").single(),
      ]);

      setOrders(ordersRes.data || []);
      // Filter payments to only customer's orders
      const customerOrderIds = new Set((ordersRes.data || []).map((o: any) => o.id));
      setPayments((paymentsRes.data || []).filter((p: any) => customerOrderIds.has(p.order_id)));
      setRegistration(regRes.data);
      if (rateRes.data) setExchangeRate(rateRes.data.rate);
    };
    load();
  }, [user, selectedOrgId]);

  // Fetch order items when order selected
  useEffect(() => {
    if (!selectedOrder) { setOrderItems([]); return; }
    supabase.from("order_items").select("*").eq("order_id", selectedOrder.id).order("created_at").then(({ data }) => {
      setOrderItems(data || []);
    });
  }, [selectedOrder]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isPaid = registration?.status === "paid" || registration?.status === "waived";
  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const orgCurrency = selectedOrg?.currency || "NGN";

  // Calculate local equivalent of $5
  const localFeeAmount = exchangeRate && exchangeRate > 0 ? Math.round(5 / exchangeRate) : null;

  const handlePayRegistration = async () => {
    if (!user || !selectedOrgId) return;
    // Create registration record if not exists
    if (!registration) {
      await supabase.from("customer_registrations").insert({
        user_id: user.id,
        org_id: selectedOrgId,
        fee_amount: 5,
        fee_currency: "USD",
        local_amount: localFeeAmount,
        local_currency: orgCurrency,
      });
    }
    // For now, simulate payment success (real integration would redirect to Paystack/Stripe)
    await supabase.from("customer_registrations")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_gateway: "manual" })
      .eq("user_id", user.id)
      .eq("org_id", selectedOrgId);
    
    setRegistration((prev: any) => ({ ...prev, status: "paid", paid_at: new Date().toISOString() }));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <div>
              <span className="font-heading font-bold text-sm">Customer Portal</span>
              {selectedOrg && (
                <p className="text-[10px] text-muted-foreground">{selectedOrg.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.display_name || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        {/* Registration Fee Gate */}
        {!isPaid && selectedOrgId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border p-8 text-center mb-8"
          >
            <Lock size={40} className="mx-auto text-primary mb-4" />
            <h2 className="font-heading font-bold text-xl mb-2">Registration Fee Required</h2>
            <p className="text-muted-foreground text-sm mb-4">
              A one-time registration fee of <strong>$5.00 USD</strong>
              {localFeeAmount && ` (≈ ${orgCurrency} ${localFeeAmount.toLocaleString()})`} is required to access your orders and portal features.
            </p>
            <Button variant="hero" onClick={handlePayRegistration} className="min-w-[200px]">
              <CreditCard size={16} className="mr-2" />
              Pay Registration Fee
            </Button>
            <p className="text-[10px] text-muted-foreground mt-3">
              You'll be able to choose your preferred payment method
            </p>
          </motion.div>
        )}

        {/* Portal Content (locked behind payment) */}
        {isPaid && selectedOrgId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Tabs defaultValue="orders">
              <TabsList className="mb-6">
                <TabsTrigger value="orders" className="gap-2"><Package size={14} /> My Orders</TabsTrigger>
                <TabsTrigger value="payments" className="gap-2"><CreditCard size={14} /> Payments</TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2"><Bell size={14} /> Notifications</TabsTrigger>
              </TabsList>

              {/* Orders Tab */}
              <TabsContent value="orders">
                {selectedOrder ? (
                  <OrderDetail
                    order={selectedOrder}
                    items={orderItems}
                    currency={orgCurrency}
                    onBack={() => setSelectedOrder(null)}
                  />
                ) : (
                  <div className="space-y-3">
                    <h2 className="font-heading font-bold text-xl mb-4">Your Orders</h2>
                    {orders.length === 0 ? (
                      <div className="rounded-xl bg-card border border-border p-12 text-center">
                        <Package size={40} className="mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No orders yet.</p>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="w-full text-left rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{order.title}</p>
                                <Badge className={`text-[10px] ${statusColors[order.status] || ""}`}>
                                  {statusLabels[order.status] || order.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{order.order_number}</span>
                                <Clock size={10} />
                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-heading font-bold text-sm">
                                  {orgCurrency} {(order.customer_total || order.total_amount || 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {paymentStatusLabels[order.payment_status] || order.payment_status}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-muted-foreground" />
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments">
                <h2 className="font-heading font-bold text-xl mb-4">Payment History</h2>
                {payments.length === 0 ? (
                  <div className="rounded-xl bg-card border border-border p-12 text-center">
                    <CreditCard size={40} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="rounded-lg bg-card border border-border p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {p.payment_type === "deposit" ? "Deposit" : "Payment"} — {p.currency} {Number(p.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "Pending"}
                            {p.payment_method && ` · ${p.payment_method}`}
                          </p>
                        </div>
                        <Badge variant={p.status === "completed" ? "default" : "outline"}>
                          {p.status === "completed" ? (
                            <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Paid</span>
                          ) : (
                            <span className="flex items-center gap-1"><AlertCircle size={12} /> {p.status}</span>
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <UserNotificationPreferences orgId={selectedOrgId} />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {!selectedOrgId && (
          <div className="rounded-xl bg-card border border-border p-12 text-center">
            <p className="text-muted-foreground">You're not associated with any organization yet. Ask your tailor to add you.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Order Detail sub-component
const OrderDetail = ({ order, items, currency, onBack }: {
  order: any; items: any[]; currency: string; onBack: () => void;
}) => {
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        ← Back to Orders
      </Button>

      <div className="rounded-xl bg-card border border-border p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl">{order.title}</h2>
            <p className="text-sm text-muted-foreground">{order.order_number}</p>
          </div>
          <Badge className={`${statusColors[order.status] || ""}`}>
            {statusLabels[order.status] || order.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold">{currency} {(order.customer_total || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-bold">{currency} {(order.amount_paid || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-bold">{currency} {Math.max(0, (order.customer_total || 0) - (order.amount_paid || 0)).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="font-bold">{order.due_date ? new Date(order.due_date).toLocaleDateString() : "—"}</p>
          </div>
        </div>

        {order.description && (
          <p className="text-sm text-muted-foreground">{order.description}</p>
        )}
      </div>

      {/* Order Items with Measurements */}
      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
          <Ruler size={18} className="text-primary" /> Items & Measurements
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items in this order.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{item.quantity} × {currency} {(item.unit_price || 0).toLocaleString()}</p>
                    <Badge className={`text-[10px] ${statusColors[item.status] || ""}`}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  </div>
                </div>
                {item.fabric_details && (
                  <p className="text-xs text-muted-foreground mb-2">Fabric: {item.fabric_details}</p>
                )}
                {item.measurements && Object.keys(item.measurements).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Measurements</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(item.measurements).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPortal;
