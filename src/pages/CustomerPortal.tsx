import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut, Package, CreditCard, Bell, Ruler, Clock, ChevronRight,
  CheckCircle2, AlertCircle, KeyRound, Loader2, Video, Search,
  MapPin, Heart, HelpCircle, Sparkles
} from "lucide-react";
import FeatureGate from "@/components/shared/FeatureGate";
import UserNotificationPreferences from "@/components/communications/UserNotificationPreferences";
import BookMeasurementDialog from "@/components/measurements/BookMeasurementDialog";
import MeasurementBookingsTab from "@/components/measurements/MeasurementBookingsTab";
import WishlistReviewsPanel from "@/components/customer/WishlistReviewsPanel";
import CustomerSubscriptionPanel from "@/components/customer/CustomerSubscriptionPanel";
import TourGuide from "@/components/shared/TourGuide";
import { useTourGuide } from "@/hooks/useTourGuide";
import { customerTourSteps } from "@/config/tourSteps";
import { useToast } from "@/hooks/use-toast";
import { DisclaimerBanner } from "@/components/shared/DisclaimerDialog";

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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tour = useTourGuide("customer-portal", customerTourSteps);

  // Self-registration state
  const [inviteCode, setInviteCode] = useState("");
  const [joiningOrg, setJoiningOrg] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?portal=1");
  }, [user, authLoading, navigate]);

  // Verify measurement payment callback
  useEffect(() => {
    const measStatus = searchParams.get("meas_status");
    const trxref = searchParams.get("trxref") || searchParams.get("reference");

    if (measStatus === "success" && trxref) {
      supabase.functions.invoke("verify-measurement-payment", {
        body: { reference: trxref },
      }).then(({ data }) => {
        if (data?.status === "success" || data?.status === "already_paid") {
          toast({ title: "Measurement booking confirmed!" });
        }
      });
    }
  }, [searchParams]);

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
          .select("id, name, currency, invite_code")
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

  // Fetch orders and payments for selected org
  useEffect(() => {
    if (!user || !selectedOrgId) return;
    const load = async () => {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("org_id", selectedOrgId).eq("customer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("org_id", selectedOrgId).order("created_at", { ascending: false }),
      ]);

      setOrders(ordersRes.data || []);
      const customerOrderIds = new Set((ordersRes.data || []).map((o: any) => o.id));
      setPayments((paymentsRes.data || []).filter((p: any) => customerOrderIds.has(p.order_id)));
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

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const orgCurrency = selectedOrg?.currency || "NGN";

  // Join org via invite code
  const handleJoinOrg = async () => {
    if (!user || !inviteCode.trim()) return;
    setJoiningOrg(true);

    // Lookup org by invite code
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("invite_code", inviteCode.trim().toLowerCase())
      .single();

    if (orgError || !org) {
      toast({ title: "Invalid invite code", description: "No organization found with this code.", variant: "destructive" });
      setJoiningOrg(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      toast({ title: "Already a member", description: `You're already part of ${org.name}.` });
      setSelectedOrgId(org.id);
      setJoiningOrg(false);
      return;
    }

    // Add as customer member
    const { error: joinError } = await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "customer",
    });

    if (joinError) {
      toast({ title: "Error", description: joinError.message, variant: "destructive" });
    } else {
      toast({ title: "Joined!", description: `You've been added to ${org.name} as a customer.` });
      // Refresh orgs
      setOrgs((prev) => [...prev, { id: org.id, name: org.name }]);
      setSelectedOrgId(org.id);
      setInviteCode("");

      // Notify org admins (fire-and-forget)
      supabase.functions.invoke("notify-admin-registration", {
        body: {
          org_id: org.id,
          user_id: user.id,
          user_name: profile?.display_name || undefined,
          user_email: user.email,
          org_name: org.name,
        },
      }).catch(console.error);
    }
    setJoiningOrg(false);
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
      <TourGuide {...tour} />
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
            <Button variant="ghost" size="icon" onClick={tour.restart} title="Restart tour guide" className="text-muted-foreground">
              <HelpCircle size={16} />
            </Button>
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
        {/* No org - show join flow */}
        {!selectedOrgId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border p-8 text-center"
          >
            <KeyRound size={40} className="mx-auto text-primary mb-4" />
            <h2 className="font-heading font-bold text-xl mb-2">Join an Organization</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Enter the invite code provided by your tailor to get started.
            </p>
            <div className="max-w-sm mx-auto space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. a1b2c3d4"
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button variant="hero" className="w-full" onClick={handleJoinOrg} disabled={joiningOrg || !inviteCode.trim()}>
                {joiningOrg ? <><Loader2 size={16} className="mr-2 animate-spin" /> Joining...</> : "Join Organization"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Portal Content (free access to dashboard) */}
        {selectedOrgId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Tabs defaultValue="orders">
              <TabsList className="mb-6 flex-wrap">
                <TabsTrigger value="orders" data-tour="customer-orders-tab" className="gap-2"><Package size={14} /> My Orders</TabsTrigger>
                <TabsTrigger value="browse" className="gap-2"><Search size={14} /> Browse</TabsTrigger>
                <TabsTrigger value="features" className="gap-2"><Sparkles size={14} /> Features</TabsTrigger>
                <TabsTrigger value="measurements" data-tour="customer-measurements-tab" className="gap-2"><Ruler size={14} /> AI Measurements</TabsTrigger>
                <TabsTrigger value="payments" data-tour="customer-payments-tab" className="gap-2"><CreditCard size={14} /> Payments</TabsTrigger>
                <TabsTrigger value="wishlist" data-tour="customer-wishlist-tab" className="gap-2"><Heart size={14} /> Wishlist & Reviews</TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2"><Bell size={14} /> Notifications</TabsTrigger>
              </TabsList>

              {/* Wishlist & Reviews Tab */}
              <TabsContent value="wishlist">
                <WishlistReviewsPanel />
              </TabsContent>

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

              {/* Browse Organizations Tab */}
              <TabsContent value="browse">
                <BrowseOrgsMini navigate={navigate} user={user} />
              </TabsContent>

              {/* Feature Access Requests Tab */}
              <TabsContent value="features">
                <FeatureRequestsTab userId={user.id} />
              </TabsContent>

              {/* AI Measurements Tab (Paid Feature) */}
              <TabsContent value="measurements">
                <FeatureGate featureKey="basic_measurement" showLocked>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-heading font-bold text-xl">AI Measurement Sessions</h2>
                      <BookMeasurementDialog orgId={selectedOrgId}>
                        <Button variant="hero" size="sm">
                          <Video size={14} className="mr-1" /> Book Session
                        </Button>
                      </BookMeasurementDialog>
                    </div>
                    <MeasurementBookingsTab orgId={selectedOrgId} />
                  </div>
                </FeatureGate>
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

              {/* Notifications Tab (Paid Feature) */}
              <TabsContent value="notifications">
                <FeatureGate featureKey="email_notifications" showLocked>
                  <UserNotificationPreferences orgId={selectedOrgId} />
                </FeatureGate>
              </TabsContent>
            </Tabs>
          </motion.div>
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
      <div className="mt-8">
        <DisclaimerBanner />
      </div>
    </div>
  );
};

// Inline browse organizations mini component
const BrowseOrgsMini = ({ navigate, user }: { navigate: any; user: any }) => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [myOrgIds, setMyOrgIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: orgData }, { data: memberData }] = await Promise.all([
        supabase.from("organizations").select("id, name, slug, country, currency, logo_url").eq("is_active", true).order("name"),
        user ? supabase.from("org_members").select("org_id").eq("user_id", user.id).eq("is_active", true) : { data: [] },
      ]);
      setOrgs(orgData || []);
      setMyOrgIds(new Set((memberData || []).map((m: any) => m.org_id)));
      setLoading(false);
    };
    load();
  }, [user]);

  const handleJoin = async (org: any) => {
    if (!user) { navigate("/auth?portal=1"); return; }
    setJoiningId(org.id);
    const { error } = await supabase.from("org_members").insert({ org_id: org.id, user_id: user.id, role: "customer" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Joined!", description: `Added to ${org.name}` });
      setMyOrgIds(prev => new Set([...prev, org.id]));
    }
    setJoiningId(null);
  };

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || (o.country || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Browse Fashion Houses</h2>
        <Button variant="outline" size="sm" onClick={() => navigate("/browse")}>View All</Button>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No organizations found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.slice(0, 12).map(org => (
            <div key={org.id} className="rounded-xl bg-card border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
                  <span className="font-heading font-bold text-primary-foreground text-sm">{org.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {org.country && <><MapPin size={10} /> {org.country}</>}
                    {org.currency && <span className="ml-1">· {org.currency}</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigate(`/catalogue/${org.id}`)}>
                  View Catalogue
                </Button>
                {myOrgIds.has(org.id) ? (
                  <Badge className="self-center">Joined</Badge>
                ) : (
                  <Button variant="hero" size="sm" className="text-xs" onClick={() => handleJoin(org)} disabled={joiningId === org.id}>
                    {joiningId === org.id ? <Loader2 size={14} className="animate-spin" /> : "Join"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Feature Requests Tab
const PLATFORM_FEATURES = [
  { key: "ai_measurements", name: "AI Body Measurements", desc: "Video-based AI measurements for precise tailoring", icon: Ruler, price: 10, billing: "per_session" },
  { key: "virtual_tryon", name: "Virtual Try-On", desc: "See garments on your body using AI", icon: Sparkles, price: 5, billing: "per_use" },
  { key: "video_consultation", name: "Video Consultation", desc: "Live video sessions with tailors", icon: Video, price: 15, billing: "per_session" },
  { key: "priority_orders", name: "Priority Orders", desc: "Fast-tracked order handling", icon: Package, price: 25, billing: "one_time" },
  { key: "premium_catalogue", name: "Premium Catalogue Access", desc: "Access exclusive premium garment collections", icon: Heart, price: 10, billing: "monthly" },
];

const FeatureRequestsTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingKey, setRequestingKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("feature_access_requests").select("*").eq("user_id", userId).then(({ data }) => {
      setRequests(data || []);
      setLoading(false);
    });
  }, [userId]);

  const handleRequest = async (feature: typeof PLATFORM_FEATURES[0]) => {
    setRequestingKey(feature.key);
    const { error } = await supabase.from("feature_access_requests").insert({
      user_id: userId,
      feature_key: feature.key,
      feature_name: feature.name,
      description: feature.desc,
      billing_type: feature.billing,
      price_amount: feature.price,
      price_currency: "USD",
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Request submitted!", description: `Your request for ${feature.name} is pending approval.` });
      setRequests(prev => [...prev, { feature_key: feature.key, status: "pending" }]);
    }
    setRequestingKey(null);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-xl mb-1">Premium Features</h2>
        <p className="text-sm text-muted-foreground">Request access to billed premium platform features.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORM_FEATURES.map(feature => {
          const existing = requests.find(r => r.feature_key === feature.key);
          const Icon = feature.icon;
          return (
            <div key={feature.key} className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-heading font-semibold text-sm">{feature.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-xs">${feature.price} / {feature.billing.replace("_", " ")}</Badge>
                    {existing ? (
                      <Badge className={
                        existing.status === "approved" ? "bg-secondary/10 text-secondary" :
                        existing.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-primary/10 text-primary"
                      }>
                        {existing.status === "approved" ? <><CheckCircle2 size={10} className="mr-1" /> Approved</> :
                         existing.status === "rejected" ? "Rejected" : "Pending"}
                      </Badge>
                    ) : (
                      <Button size="sm" variant="hero" onClick={() => handleRequest(feature)} disabled={requestingKey === feature.key} className="gap-1">
                        {requestingKey === feature.key ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                        Request
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Existing requests */}
      {requests.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-base mb-3">Your Requests</h3>
          <div className="space-y-2">
            {requests.map((r, i) => (
              <div key={i} className="rounded-lg border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.feature_name || r.feature_key}</p>
                  <p className="text-[10px] text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "Just now"}</p>
                </div>
                <Badge className={
                  r.status === "approved" ? "bg-secondary/10 text-secondary" :
                  r.status === "paid" ? "bg-secondary/10 text-secondary" :
                  r.status === "rejected" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
