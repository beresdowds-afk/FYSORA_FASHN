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
import FeaturedProductsPanel from "@/components/catalogue/FeaturedProductsPanel";
import {
  LogOut, Package, Clock, BarChart3, Palette, FileText,
  Wallet, User, ShoppingBag, CheckCircle2, ArrowRight,
  Shield, DollarSign, TrendingUp, Save, Globe, Download, Star
} from "lucide-react";
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from "@/components/ui/sidebar";
import fsaLogo from "@/assets/fsa-logo.png";

type TabId = "overview" | "work-queue" | "contracts" | "earnings" | "catalogue" | "featured" | "website" | "profile";

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
  { id: "website", icon: Globe, label: "My Website" },
  { id: "profile", icon: User, label: "Profile" },
];

const DesignerSidebar = ({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-primary" />
                <span>Designer Studio</span>
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

const DesignerPortal = () => {
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
    if (!authLoading && !user) navigate("/auth?role=designer");
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
        <DesignerSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
            <SidebarTrigger />
            <div className="h-1 flex-1 max-w-[100px] bg-gradient-brand rounded-full" />
            <div className="flex-1 flex items-center gap-2">
              <img src={fsaLogo} alt="FSA" className="w-6 h-6 object-contain" />
              <span className="font-heading font-bold text-sm hidden sm:block">Designer Studio</span>
              <Badge className="bg-primary/15 text-primary text-[10px]">Designer</Badge>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={() => navigate("/install")} title="Install FSA App" className="text-primary">
                <Download size={16} className="mr-1" /> <span className="hidden sm:inline text-xs">Install App</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/platform-catalogue")} title="Platform Catalogue">
                <ShoppingBag size={16} />
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
            {activeTab === "contracts" && <ContractsTab contracts={contracts} />}
            {activeTab === "earnings" && <EarningsTab earnings={earnings} />}
            {activeTab === "catalogue" && user && (
              <div>
                <h2 className="font-heading font-bold text-2xl mb-6">My Catalogue</h2>
                <TailorCatalogueManager tailorId={user.id} />
              </div>
            )}
            {activeTab === "featured" && user && (
              <FeaturedProductsPanel orgId={contracts[0]?.org_id || ""} userRole="designer" />
            )}
            {activeTab === "website" && user && (
              <WebsiteTab userId={user.id} profile={profile} contracts={contracts} />
            )}
            {activeTab === "profile" && user && (
              <ProfileTab userId={user.id} profile={profile} setProfile={setProfile} />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

/* ── Overview ─────────────────────────────────────────────────────── */
const OverviewTab = ({ orders, contracts, delegations, earnings, profile, onNavigate }: {
  orders: any[]; contracts: any[]; delegations: any[]; earnings: any[];
  profile: any; onNavigate: (t: TabId) => void;
}) => {
  const activeContracts = contracts.filter((c: any) => c.status === "active");
  const pendingDelegations = delegations.filter((d: any) => d.status === "assigned");
  const totalEarned = earnings.filter((e: any) => e.status === "paid").reduce((sum: number, e: any) => sum + (e.tailor_payout_amount || 0), 0);
  const pendingPayout = earnings.filter((e: any) => e.status === "pending").reduce((sum: number, e: any) => sum + (e.tailor_payout_amount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h2 className="font-heading font-bold text-2xl">
          Welcome back, {profile?.display_name || "Designer"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Your designer studio at a glance.</p>
      </div>

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

      {pendingDelegations.length > 0 && (
        <Card className="p-5 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Shield size={14} className="text-primary" /> Pending Delegation Requests
            </h3>
            <Badge variant="secondary">{pendingDelegations.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">You have new work assignments waiting.</p>
          <Button variant="hero" size="sm" onClick={() => onNavigate("work-queue")}>
            View Work Queue <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>
      )}

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Package, label: "Work Queue", desc: `${orders.length} active orders`, tab: "work-queue" as TabId },
          { icon: ShoppingBag, label: "My Catalogue", desc: "Manage your portfolio", tab: "catalogue" as TabId },
          { icon: Globe, label: "My Website", desc: "Manage your designer website", tab: "website" as TabId },
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

/* ── Work Queue ───────────────────────────────────────────────────── */
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

      <div className="flex gap-3 mb-6 flex-wrap">
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <Package size={14} className="text-primary" /> {orders.length} Active
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <Clock size={14} className="text-accent" /> {pendingDelegations.length} Pending
        </Badge>
      </div>

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
                  <p className="text-xs text-muted-foreground">{del.orders?.order_number}</p>
                </div>
                <Button variant="hero" size="sm" onClick={() => acceptDelegation(del.id)}>Accept</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

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

              <div className="flex gap-1 mb-3 overflow-x-auto">
                {statusFlow.map((s) => {
                  const currentIdx = statusFlow.indexOf(order.status);
                  const thisIdx = statusFlow.indexOf(s);
                  return (
                    <div key={s} className={`h-1.5 flex-1 rounded-full min-w-[20px] ${thisIdx <= currentIdx ? "bg-primary" : "bg-muted"}`} />
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

/* ── Contracts ────────────────────────────────────────────────────── */
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
          <p className="text-muted-foreground">No contracts yet.</p>
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
                      <Palette size={18} className="text-primary" />
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

/* ── Earnings ─────────────────────────────────────────────────────── */
const EarningsTab = ({ earnings }: { earnings: any[] }) => {
  const paid = earnings.filter(e => e.status === "paid");
  const pending = earnings.filter(e => e.status === "pending");
  const totalEarned = paid.reduce((s, e) => s + (e.tailor_payout_amount || 0), 0);
  const totalPending = pending.reduce((s, e) => s + (e.tailor_payout_amount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">Earnings & Payouts</h2>
      <p className="text-sm text-muted-foreground mb-6">Track your income across all organizations.</p>

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
          <p className="font-heading font-bold text-2xl">$15</p>
          <p className="text-xs text-muted-foreground mt-1">Monthly Subscription</p>
        </Card>
      </div>

      {paid.length === 0 && pending.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No earnings recorded yet.</p>
        </Card>
      ) : (
        <Card className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {[...paid, ...pending].slice(0, 10).map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">Payment #{e.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">₦{(e.tailor_payout_amount || 0).toLocaleString()}</p>
                  <Badge className={e.status === "paid" ? "bg-green-500/10 text-green-600 text-[10px]" : "bg-primary/10 text-primary text-[10px]"}>
                    {e.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};

/* ── Website (Designer exclusive) ────────────────────────────────── */
const WebsiteTab = ({ contracts }: { userId: string; profile: any; contracts: any[] }) => {
  const navigate = useNavigate();
  const [websiteData, setWebsiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Check if designer has an org with a website
      const orgId = contracts[0]?.org_id;
      if (orgId) {
        const { data } = await supabase.from("org_websites").select("*").eq("org_id", orgId).maybeSingle();
        setWebsiteData(data);
      }
      setLoading(false);
    };
    load();
  }, [contracts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const orgSlug = contracts[0]?.organizations?.slug;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">My Website</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Your designer website is included with your $15/month subscription.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">Website Status</h3>
              <p className="text-xs text-muted-foreground">
                {websiteData ? "Your website is live" : "Set up your website"}
              </p>
            </div>
          </div>

          {websiteData ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span className="text-sm font-medium text-green-600">Website Active</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your website is live and accessible to customers.
                </p>
              </div>
              {orgSlug && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/site/${orgSlug}`)}>
                  <Globe size={14} className="mr-2" /> View Live Website
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You need to be contracted with an organization to set up your designer website. Contact an organization to get started.
              </p>
              <Button variant="hero" size="sm" onClick={() => navigate("/browse")}>
                Browse Organizations
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Designer Subscription</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-lg">$15/month</span>
                <Badge className="bg-primary/15 text-primary">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Designer subscription includes:</p>
            </div>
            <ul className="space-y-2">
              {[
                "Native website hosting",
                "Portfolio & catalogue management",
                "Featured product slots",
                "Order management tools",
                "AI measurement access",
                "Virtual try-on features",
                "FSA mobile app access",
              ].map(feature => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-secondary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

/* ── Profile ──────────────────────────────────────────────────────── */
const ProfileTab = ({ userId, profile, setProfile }: {
  userId: string; profile: any; setProfile: (p: any) => void;
}) => {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [specialty, setSpecialty] = useState(profile?.specialty || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      specialty,
      bio,
    } as any).eq("id", userId);
    setSaving(false);
    if (error) toast({ title: "Error saving profile", variant: "destructive" });
    else {
      toast({ title: "Profile updated" });
      setProfile({ ...profile, display_name: displayName, specialty, bio });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-6">Designer Profile</h2>
      <Card className="p-6 max-w-lg">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Specialty</label>
            <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Ankara, Bridal, Menswear" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell clients about your design style..." rows={4} />
          </div>
          <Button variant="hero" onClick={handleSave} disabled={saving} className="w-full">
            <Save size={14} className="mr-2" /> {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default DesignerPortal;
