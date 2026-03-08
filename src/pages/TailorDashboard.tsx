import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";
import TailorCatalogueManager from "@/components/catalogue/TailorCatalogueManager";
import {
  LogOut, Package, Clock, BarChart3, Scissors, FileText,
  Wallet, User, ShoppingBag, CheckCircle2, ArrowRight,
  Shield, DollarSign, TrendingUp, Save, Globe, Download, Star, CreditCard
} from "lucide-react";
import FeaturedProductsPanel from "@/components/catalogue/FeaturedProductsPanel";
import PaymentGatewayPanel from "@/components/settings/PaymentGatewayPanel";
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from "@/components/ui/sidebar";

type TabId = "overview" | "work-queue" | "contracts" | "earnings" | "catalogue" | "featured" | "payments" | "profile";

const statusLabels: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", measuring: "Measuring",
  cutting: "Cutting", sewing: "Sewing", fitting: "Fitting",
  completed: "Completed", delivered: "Delivered", cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted-foreground", confirmed: "bg-primary", measuring: "bg-secondary",
  cutting: "bg-accent", sewing: "bg-primary", fitting: "bg-secondary",
  completed: "bg-green-500", delivered: "bg-green-600", cancelled: "bg-destructive",
};

const statusFlow = ["pending", "confirmed", "measuring", "cutting", "sewing", "fitting", "completed", "delivered"];

const navItems: { id: TabId; icon: any; label: string }[] = [
  { id: "overview", icon: BarChart3, label: "Overview" },
  { id: "work-queue", icon: Package, label: "Work Queue" },
  { id: "contracts", icon: FileText, label: "My Contracts" },
  { id: "earnings", icon: Wallet, label: "Earnings" },
  { id: "catalogue", icon: ShoppingBag, label: "Catalogue" },
  { id: "featured", icon: Star, label: "Featured Products" },
  { id: "payments", icon: CreditCard, label: "Payment Setup" },
  { id: "profile", icon: User, label: "Profile" },
];

// ── Sidebar ──────────────────────────────────────────────────────────────────
const TailorSidebar = ({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Scissors size={14} className="text-primary" />
                <span>Tailor Studio</span>
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const TailorDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [contracts, setContracts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, contractsRes, delegationsRes, earningsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("tailor_contracts").select("*, organizations(name, slug, logo_url, currency)").eq("tailor_id", user.id).order("created_at", { ascending: false }),
        supabase.from("order_delegations").select("*, orders(title, order_number, status, total_amount, currency, due_date, customer_id)").eq("tailor_id", user.id).order("created_at", { ascending: false }),
        supabase.from("contract_payments").select("*").eq("tailor_id", user.id).order("created_at", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setContracts(contractsRes.data || []);
      setDelegations(delegationsRes.data || []);
      setEarnings(earningsRes.data || []);

      // Fetch assigned orders across all orgs
      const orgIds = (contractsRes.data || []).map((c: any) => c.org_id);
      if (orgIds.length > 0) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("*, organizations(name, currency)")
          .eq("assigned_tailor_id", user.id)
          .not("status", "eq", "delivered")
          .not("status", "eq", "cancelled")
          .order("created_at", { ascending: false });
        setOrders(orderData || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TailorSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
            <SidebarTrigger />
            <div className="h-1 flex-1 max-w-[100px] bg-gradient-brand rounded-full" />
            <div className="flex-1 flex items-center gap-2">
              <Scissors size={16} className="text-primary" />
              <span className="font-heading font-bold text-sm hidden sm:block">Tailor Studio</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={() => navigate("/install")} title="Install FSA App" className="text-primary">
                <Download size={16} className="mr-1" /> <span className="hidden sm:inline text-xs">Install App</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/platform-catalogue")} title="Platform Catalogue" className="text-primary">
                <ShoppingBag size={16} className="mr-1" /> <span className="hidden sm:inline text-xs">Catalogue</span>
              </Button>
              <span className="text-sm text-muted-foreground hidden md:block">
                {profile?.display_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} />
              </Button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {activeTab === "overview" && (
              <OverviewTab
                orders={orders}
                contracts={contracts}
                delegations={delegations}
                earnings={earnings}
                profile={profile}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === "work-queue" && (
              <WorkQueueTab orders={orders} delegations={delegations} setOrders={setOrders} setDelegations={setDelegations} />
            )}
            {activeTab === "contracts" && (
              <ContractsTab contracts={contracts} />
            )}
            {activeTab === "earnings" && (
              <EarningsTab earnings={earnings} />
            )}
            {activeTab === "catalogue" && user && (
              <div>
                <h2 className="font-heading font-bold text-2xl mb-6">My Catalogue</h2>
                <TailorCatalogueManager tailorId={user.id} />
              </div>
            )}
            {activeTab === "featured" && user && (
              <FeaturedProductsPanel orgId={contracts[0]?.org_id || ""} userRole="designer" />
            )}
            {activeTab === "payments" && user && contracts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <PaymentGatewayPanel orgId={contracts[0]?.org_id} />
              </motion.div>
            {activeTab === "profile" && user && (
              <ProfileTab userId={user.id} profile={profile} setProfile={setProfile} />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// ── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab = ({ orders, contracts, delegations, earnings, profile, onNavigate }: {
  orders: any[]; contracts: any[]; delegations: any[]; earnings: any[]; profile: any;
  onNavigate: (t: TabId) => void;
}) => {
  const activeContracts = contracts.filter((c: any) => c.status === "active");
  const pendingDelegations = delegations.filter((d: any) => d.status === "assigned");
  const totalEarned = earnings.filter((e: any) => e.status === "paid").reduce((sum: number, e: any) => sum + (e.tailor_payout_amount || 0), 0);
  const pendingPayout = earnings.filter((e: any) => e.status === "pending").reduce((sum: number, e: any) => sum + (e.tailor_payout_amount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h2 className="font-heading font-bold text-2xl">
          Welcome back, {profile?.display_name || "Tailor"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Here's your studio at a glance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Package, label: "Active Orders", value: orders.length, color: "text-primary", bg: "bg-primary/10" },
          { icon: FileText, label: "Active Contracts", value: activeContracts.length, color: "text-secondary", bg: "bg-secondary/10" },
          { icon: DollarSign, label: "Total Earned", value: `₦${totalEarned.toLocaleString()}`, color: "text-green-600", bg: "bg-green-500/10" },
          { icon: Clock, label: "Pending Tasks", value: pendingDelegations.length, color: "text-accent", bg: "bg-accent/10" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.bg}`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <p className="font-heading font-bold text-2xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Pending Delegations Alert */}
      {pendingDelegations.length > 0 && (
        <Card className="p-5 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Shield size={14} className="text-primary" /> Pending Delegation Requests
            </h3>
            <Badge variant="secondary">{pendingDelegations.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">You have new work assignments waiting for your acceptance.</p>
          <Button variant="hero" size="sm" onClick={() => onNavigate("work-queue")}>
            View Work Queue <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>
      )}

      {/* Pending Payout */}
      {pendingPayout > 0 && (
        <Card className="p-5 mb-6 border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Pending Payout</p>
              <p className="font-heading font-bold text-xl text-green-600">₦{pendingPayout.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Package, label: "Work Queue", desc: `${orders.length} active orders`, tab: "work-queue" as TabId },
          { icon: ShoppingBag, label: "My Catalogue", desc: "Manage your portfolio", tab: "catalogue" as TabId },
          { icon: FileText, label: "Contracts", desc: `${activeContracts.length} active`, tab: "contracts" as TabId },
        ].map(link => (
          <Card
            key={link.label}
            className="p-5 cursor-pointer hover:border-primary/30 hover:shadow-gold transition-all group"
            onClick={() => onNavigate(link.tab)}
          >
            <link.icon size={20} className="text-primary mb-3" />
            <h4 className="font-heading font-semibold text-sm mb-1">{link.label}</h4>
            <p className="text-xs text-muted-foreground">{link.desc}</p>
            <span className="text-xs text-primary font-medium mt-2 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Open <ArrowRight size={12} />
            </span>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="p-6">
        <h3 className="font-heading font-semibold text-lg mb-4">Recent Orders</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No active orders. New assignments will appear here.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusColors[order.status] || "bg-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{order.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_number} · {order.organizations?.name || "Organization"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{(order.total_amount || 0).toLocaleString()} {order.organizations?.currency || "NGN"}</p>
                  <span className="text-[10px] text-muted-foreground">{statusLabels[order.status] || order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

// ── Work Queue ───────────────────────────────────────────────────────────────
const WorkQueueTab = ({ orders, delegations, setOrders, setDelegations }: {
  orders: any[]; delegations: any[];
  setOrders: React.Dispatch<React.SetStateAction<any[]>>;
  setDelegations: React.Dispatch<React.SetStateAction<any[]>>;
}) => {
  const { toast } = useToast();

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
    if (error) toast({ title: "Error updating status", variant: "destructive" });
    else {
      toast({ title: `Moved to ${statusLabels[newStatus] || newStatus}` });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const acceptDelegation = async (delId: string) => {
    await supabase.from("order_delegations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", delId);
    setDelegations(prev => prev.map(d => d.id === delId ? { ...d, status: "accepted" } : d));
    toast({ title: "Delegation accepted" });
  };

  const pendingDelegations = delegations.filter(d => d.status === "assigned");

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">Work Queue</h2>
      <p className="text-sm text-muted-foreground mb-6">Orders assigned to you across all organizations.</p>

      {/* Stat chips */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <Package size={14} className="text-primary" /> {orders.length} Active
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <Clock size={14} className="text-accent" /> {pendingDelegations.length} Pending
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <CheckCircle2 size={14} className="text-green-500" /> {delegations.filter(d => d.status === "completed").length} Completed
        </Badge>
      </div>

      {/* Pending Delegations */}
      {pendingDelegations.length > 0 && (
        <Card className="p-5 mb-6 border-primary/20 bg-primary/5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Shield size={14} className="text-primary" /> Pending Delegation Requests
          </h3>
          <div className="space-y-2">
            {pendingDelegations.map(del => (
              <div key={del.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm font-medium">{del.orders?.title || "Order"}</p>
                  <p className="text-xs text-muted-foreground">
                    {del.orders?.order_number} · Priority: {del.priority}
                    {del.deadline && ` · Due: ${new Date(del.deadline).toLocaleDateString()}`}
                  </p>
                </div>
                <Button variant="hero" size="sm" onClick={() => acceptDelegation(del.id)}>Accept</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Orders */}
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active orders assigned to you.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{order.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_number} · {order.organizations?.name}
                    {order.due_date && ` · Due: ${new Date(order.due_date).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-sm">
                    {(order.total_amount || 0).toLocaleString()} {order.organizations?.currency || "NGN"}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    <div className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColors[order.status] || "bg-muted-foreground"}`} />
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
              </div>
              {order.description && <p className="text-xs text-muted-foreground mb-3">{order.description}</p>}

              {/* Status progression */}
              <div className="flex gap-1 mb-3 overflow-x-auto">
                {statusFlow.map((s) => {
                  const currentIdx = statusFlow.indexOf(order.status);
                  const thisIdx = statusFlow.indexOf(s);
                  return (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full min-w-[20px] ${
                        thisIdx <= currentIdx ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex gap-2 flex-wrap">
                {statusFlow.map((s, i) => {
                  const currentIdx = statusFlow.indexOf(order.status);
                  if (i !== currentIdx + 1) return null;
                  return (
                    <Button key={s} variant="hero" size="sm" className="text-xs" onClick={() => updateStatus(order.id, s)}>
                      Move to {statusLabels[s] || s}
                    </Button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ── Contracts ────────────────────────────────────────────────────────────────
const ContractsTab = ({ contracts }: { contracts: any[] }) => {
  const contractStatusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600",
    pending: "bg-primary/10 text-primary",
    expired: "bg-muted text-muted-foreground",
    terminated: "bg-destructive/10 text-destructive",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">My Contracts</h2>
      <p className="text-sm text-muted-foreground mb-6">Overview of all your organization contracts.</p>

      {contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No contracts yet. Contracts will appear here when organizations engage you.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map(contract => (
            <Card key={contract.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {contract.organizations?.logo_url ? (
                    <img src={contract.organizations.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scissors size={18} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-heading font-semibold">{contract.organizations?.name || "Organization"}</p>
                    <p className="text-xs text-muted-foreground">
                      Since {new Date(contract.created_at).toLocaleDateString()}
                      {contract.commission_rate && ` · ${contract.commission_rate}% commission`}
                    </p>
                  </div>
                </div>
                <Badge className={`text-[10px] ${contractStatusColors[contract.status] || "bg-muted text-muted-foreground"}`}>
                  {contract.status}
                </Badge>
              </div>

              {contract.terms && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{contract.terms}</p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Currency</p>
                  <p className="font-heading font-bold text-sm">{contract.organizations?.currency || "NGN"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rate</p>
                  <p className="font-heading font-bold text-sm">{contract.commission_rate || 0}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="font-heading font-bold text-sm capitalize">{contract.status}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ── Earnings ─────────────────────────────────────────────────────────────────
const EarningsTab = ({ earnings }: { earnings: any[] }) => {
  const paid = earnings.filter(e => e.status === "paid");
  const pending = earnings.filter(e => e.status === "pending");
  const totalEarned = paid.reduce((s, e) => s + (e.tailor_payout_amount || 0), 0);
  const totalPending = pending.reduce((s, e) => s + (e.tailor_payout_amount || 0), 0);
  const totalFees = paid.reduce((s, e) => s + (e.agency_fee_amount || 0), 0);

  // Monthly breakdown
  const monthlyMap: Record<string, number> = {};
  paid.forEach(e => {
    const month = new Date(e.paid_at || e.created_at).toLocaleDateString("en", { month: "short", year: "2-digit" });
    monthlyMap[month] = (monthlyMap[month] || 0) + (e.tailor_payout_amount || 0);
  });
  const monthlyData = Object.entries(monthlyMap).slice(-6);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">Earnings & Payouts</h2>
      <p className="text-sm text-muted-foreground mb-6">Track your income across all organizations.</p>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-green-600" />
          </div>
          <p className="font-heading font-bold text-2xl text-green-600">₦{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Clock size={20} className="text-primary" />
          </div>
          <p className="font-heading font-bold text-2xl text-primary">₦{totalPending.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Payout</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-accent" />
          </div>
          <p className="font-heading font-bold text-2xl">₦{totalFees.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Platform Fees Paid</p>
        </Card>
      </div>

      {/* Monthly Bar Chart */}
      {monthlyData.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Monthly Earnings</h3>
          <div className="flex items-end gap-3 h-32">
            {monthlyData.map(([month, amount]) => {
              const max = Math.max(...monthlyData.map(([, a]) => a), 1);
              const pct = Math.max((amount / max) * 100, 4);
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {amount > 0 ? `${(amount / 1000).toFixed(0)}k` : "0"}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-10 bg-primary/80 rounded-t-md hover:bg-primary transition-colors"
                      style={{ height: `${pct}%`, minHeight: 4, maxHeight: 100 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{month}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Payment History */}
      <Card className="p-6">
        <h3 className="font-heading font-semibold text-lg mb-4">Payment History</h3>
        {earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {earnings.map(e => (
              <div key={e.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">₦{(e.tailor_payout_amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.paid_at || e.created_at).toLocaleDateString()}
                    {e.agency_fee_amount > 0 && ` · Fee: ₦${e.agency_fee_amount.toLocaleString()}`}
                  </p>
                </div>
                <Badge className={e.status === "paid" ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"}>
                  {e.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

// ── Profile ──────────────────────────────────────────────────────────────────
const ProfileTab = ({ userId, profile, setProfile }: { userId: string; profile: any; setProfile: (p: any) => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    specialty: profile?.specialty || "",
    instagram_url: profile?.instagram_url || "",
    facebook_url: profile?.facebook_url || "",
    twitter_url: profile?.twitter_url || "",
    tiktok_url: profile?.tiktok_url || "",
    youtube_url: profile?.youtube_url || "",
    linkedin_url: profile?.linkedin_url || "",
    portfolio_url: profile?.portfolio_url || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", userId);
    setSaving(false);
    if (error) toast({ title: "Error saving profile", variant: "destructive" });
    else {
      toast({ title: "Profile updated" });
      setProfile({ ...profile, ...form });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">Profile Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your public profile and social links.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <User size={16} className="text-primary" /> Basic Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Display Name</label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Specialty</label>
              <Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Agbada Specialist, Bridal Couture" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Bio</label>
              <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Tell customers about your craft..." />
            </div>
          </div>
        </Card>

        {/* Social Links */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Globe size={16} className="text-primary" /> Social & Portfolio
          </h3>
          <div className="space-y-3">
            {[
              { key: "portfolio_url", label: "Portfolio URL", placeholder: "https://yourportfolio.com" },
              { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/..." },
              { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/..." },
              { key: "twitter_url", label: "X (Twitter)", placeholder: "https://x.com/..." },
              { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@..." },
              { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/..." },
              { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
            ].map(field => (
              <div key={field.key}>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{field.label}</label>
                <Input
                  value={(form as any)[field.key] || ""}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="hero" onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </motion.div>
  );
};

export default TailorDashboard;
