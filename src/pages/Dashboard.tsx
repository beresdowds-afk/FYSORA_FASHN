import { useAuth } from "@/contexts/AuthContext";
import { useCurrentOrg, useOrgMembers, type AppRole } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Users, Settings, BarChart3, ShoppingBag, Palette, Plus, Trash2, Shield, Package, Clock, UserCheck, CreditCard, Crown, MessageCircle, Video, Globe, Sparkles, Truck, FileText, Download, Receipt, Star, Wallet } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import OrgDashboardSidebar, { type OrgTabId } from "@/components/dashboard/OrgDashboardSidebar";
import OrgIntegrationsPanel from "@/components/integrations/OrgIntegrationsPanel";
import FeaturedProductsPanel from "@/components/catalogue/FeaturedProductsPanel";

import SubscriptionTab from "@/components/billing/SubscriptionTab";
import OrgBillingInvoicingTab from "@/components/billing/OrgBillingInvoicingTab";
import InvoiceManagerPanel from "@/components/invoices/InvoiceManagerPanel";
import { useOrgSubscription } from "@/hooks/useSubscription";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import OrdersTab from "@/components/orders/OrdersTab";
import RiskScoreCard from "@/components/insurance/RiskScoreCard";
import CustomersTab from "@/components/customers/CustomersTab";
import InviteMemberDialog from "@/components/members/InviteMemberDialog";
import NotificationBell from "@/components/notifications/NotificationBell";
import { motion } from "framer-motion";
import OrgExchangeRates from "@/components/shared/OrgExchangeRates";

import MeasurementBookingsTab from "@/components/measurements/MeasurementBookingsTab";
import { useToast } from "@/hooks/use-toast";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import RevenueAnalysisCard from "@/components/dashboard/RevenueAnalysisCard";
import WebsiteBuilderTab from "@/components/website-builder/WebsiteBuilderTab";
import PremiumFeaturesTab from "@/components/premium/PremiumFeaturesTab";
import AccessGate from "@/components/shared/AccessGate";
import WalletManagementTab from "@/components/wallet/WalletManagementTab";
import LogisticsTab from "@/components/logistics/LogisticsTab";

import FeatureGate from "@/components/shared/FeatureGate";
import ContractsTab from "@/components/contracts/ContractsTab";
import SeoOptimizationPanel from "@/components/sentinel/SeoOptimizationPanel";
import SentinelAddonsMarketplace from "@/components/sentinel/SentinelAddonsMarketplace";
import SentinelStoragePanel from "@/components/sentinel/SentinelStoragePanel";
import AvailabilityManager from "@/components/settings/AvailabilityManager";
import PaymentGatewayPanel from "@/components/settings/PaymentGatewayPanel";
import TourGuide from "@/components/shared/TourGuide";
import { useTourGuide } from "@/hooks/useTourGuide";
import { orgAdminTourSteps, tailorTourSteps } from "@/config/tourSteps";
import { HelpCircle } from "lucide-react";
import LocationPicker from "@/components/shared/LocationPicker";
import LocationMapFooter from "@/components/shared/LocationMapFooter";
import { TrialBanner } from "@/components/TrialBanner";
const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  super_assistant: "Super Assistant",
  platform_management: "Platform Management",
  org_admin: "Org Admin",
  manager: "Manager",
  designer: "Designer",
  tailor: "Tailor",
  customer: "Customer",
};

const roleColors: Record<AppRole, string> = {
  super_admin: "bg-accent text-accent-foreground",
  super_assistant: "bg-accent/80 text-accent-foreground",
  platform_management: "bg-accent text-accent-foreground",
  org_admin: "bg-primary text-primary-foreground",
  manager: "bg-primary/80 text-primary-foreground",
  designer: "bg-secondary/80 text-secondary-foreground",
  tailor: "bg-secondary text-secondary-foreground",
  customer: "bg-muted text-muted-foreground",
};

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentOrg, role, loading: orgLoading } = useCurrentOrg();
  const { isSuperAdmin, isSuperAssistant, primaryRole, loading: globalRoleLoading } = useUserGlobalRole();
  const hasPlatformAccess = isSuperAdmin || isSuperAssistant;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<OrgTabId>("overview");

  const tourSteps = role === "tailor" ? tailorTourSteps : orgAdminTourSteps;
  const tourId = role === "tailor" ? "tailor-dashboard" : "org-admin-dashboard";
  const tour = useTourGuide(tourId, tourSteps);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || orgLoading || globalRoleLoading || !user) return;

    // Route users with an org to their proper home where applicable.
    if (currentOrg && role === "tailor") {
      navigate("/tailor-dashboard");
      return;
    }

    // No current org: route based on the user's global role rather than forcing
    // org creation on everyone. `role` from useCurrentOrg is null without an
    // org, so fall back to the global user_roles role.
    if (!currentOrg && !hasPlatformAccess) {
      const effectiveRole = role ?? primaryRole ?? null;
      switch (effectiveRole) {
        case "tailor":
          navigate("/tailor-dashboard");
          return;
        case "designer":
          navigate("/designer-portal");
          return;
        case "customer":
          navigate("/portal");
          return;
        case "org_admin":
        case "manager":
          navigate("/create-organization");
          return;
        default:
          // Unknown role — render the fallback card below instead of a blank.
          return;
      }
    }
  }, [authLoading, orgLoading, globalRoleLoading, user, currentOrg, hasPlatformAccess, role, primaryRole, navigate]);

  // Auto-claim promotional organization slot (first 5 organizations).
  // Only org admins can claim. Idempotent — safe to call on every mount.
  useEffect(() => {
    if (!user || !currentOrg) return;
    if (role !== "org_admin" && !isSuperAdmin) return;
    (async () => {
      try {
        await supabase.rpc("claim_promotional_grant", {
          _grant_type: "organization",
          _org_id: currentOrg.id,
        });
      } catch { /* ignore: cap reached or already claimed */ }
    })();
  }, [user, currentOrg, role, isSuperAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || orgLoading || globalRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Super admin without an org - show a simplified view
  if (!currentOrg && hasPlatformAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
              </div>
              <span className="font-heading font-bold text-sm">FYSORA FASHN (Fashion Stitches Africa)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")}>{isSuperAdmin ? "Super Admin" : "Admin"} Panel</Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut size={16} /></Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 lg:px-8 py-12 text-center">
          <h2 className="font-heading font-bold text-2xl mb-4">Welcome, {isSuperAdmin ? "Super Admin" : "Super Assistant"}</h2>
          <p className="text-muted-foreground mb-6">You can manage the platform or create an organization.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="hero" onClick={() => navigate("/super-admin")}>Go to Admin Panel</Button>
            <Button variant="heroOutline" onClick={() => navigate("/create-organization")}>Create Organization</Button>
          </div>
        </main>
      </div>
    );
  }

  // Fallback for signed-in users with no org and no recognized role — give them
  // a clear destination instead of a blank screen.
  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="font-heading font-bold text-xl mb-2">Welcome to FYSORA FASHN</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Your account isn't linked to an organization yet. Choose where you'd like to go:
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="hero" onClick={() => navigate("/portal")}>Customer Portal</Button>
            <Button variant="heroOutline" onClick={() => navigate("/create-organization")}>Create Organization</Button>
            <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccessGate><SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TourGuide {...tour} />
        <div className="hidden md:block">
          <OrgDashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand z-10" />
          <header className="border-b border-border bg-card">
            <div className="px-4 lg:px-8 flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="hidden md:flex mr-2" />
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
                  <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
                </div>
                <div>
                  <span className="font-heading font-bold text-sm">{currentOrg.name}</span>
                  <div className="flex items-center gap-2">
                    {role && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[role]}`}>
                        {roleLabels[role]}
                      </span>
                    )}
                    {hasPlatformAccess && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[isSuperAdmin ? 'super_admin' : 'super_assistant']}`}>
                        {isSuperAdmin ? "Super Admin" : "Super Assistant"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPlatformAccess && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")} className="text-xs">
                    <Shield size={14} className="mr-1" /> Admin Panel
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={tour.restart} title="Restart tour guide" className="text-muted-foreground">
                  <HelpCircle size={16} />
                </Button>
                <NotificationBell />
                <Button variant="ghost" size="sm" onClick={() => navigate("/install")} title="Install FSA App" className="text-primary">
                  <Download size={16} className="mr-1" /> <span className="hidden sm:inline text-xs">Install App</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/payments")} title="Payments & Billing" className="text-primary">
                  <CreditCard size={16} className="mr-1" /> <span className="hidden sm:inline text-xs">Payments</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/platform-catalogue")} title="Platform Catalogue" className="text-primary">
                  <ShoppingBag size={16} className="mr-1" /> <span className="hidden sm:inline text-xs">Catalogue</span>
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
          <main className="flex-1 px-4 lg:px-8 py-6">
            <TrialBanner audience="Organization" />
            <div className="flex md:hidden gap-2 mb-6 overflow-x-auto">
              {(["overview", "orders", "customers", "bookings", "premium", "featured", "logistics", "contracts", "members", "billing", "invoicing", "wallet", "website", "settings"] as OrgTabId[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab === "billing" ? "FSA Subscription" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {activeTab === "overview" && role === "tailor" ? (
              <TailorWorkQueue orgId={currentOrg.id} userId={user.id} currency={currentOrg.currency || "NGN"} />
            ) : activeTab === "overview" ? (
              <OverviewTab org={currentOrg} role={role} />
            ) : null}
            {activeTab === "orders" && <OrdersTab orgId={currentOrg.id} currency={currentOrg.currency || "NGN"} role={role} orgName={currentOrg.name} orgSettings={currentOrg} />}
            {activeTab === "customers" && <CustomersTab orgId={currentOrg.id} currency={currentOrg.currency || "NGN"} />}
            {activeTab === "bookings" && <MeasurementBookingsTab orgId={currentOrg.id} isAdmin={role === "org_admin" || role === "manager" || role === "super_admin"} />}
            {activeTab === "premium" && <FeatureGate featureKey="basic_measurement" showLocked><PremiumFeaturesTab orgId={currentOrg.id} role={role} /></FeatureGate>}
            {activeTab === "featured" && <FeaturedProductsPanel orgId={currentOrg.id} userRole={role === "designer" ? "designer" : "org_admin"} />}
            {activeTab === "logistics" && <FeatureGate featureKey="local_logistics" showLocked><LogisticsTab orgId={currentOrg.id} role={role} currency={currentOrg.currency || "NGN"} /></FeatureGate>}
            {activeTab === "contracts" && <ContractsTab orgId={currentOrg.id} role={role} />}
            {activeTab === "members" && <MembersTab orgId={currentOrg.id} role={role} />}
            {activeTab === "billing" && <SubscriptionTab orgId={currentOrg.id} role={role} />}
            {activeTab === "invoicing" && <OrgBillingInvoicingTab orgId={currentOrg.id} orgName={currentOrg.name} currency={currentOrg.currency || "NGN"} role={role} />}
            {activeTab === "invoice_manager" && <InvoiceManagerPanel orgId={currentOrg.id} orgName={currentOrg.name} currency={currentOrg.currency || "NGN"} />}
            {activeTab === "wallet" && <WalletManagementTab orgId={currentOrg.id} />}
            {activeTab === "website" && <FeatureGate featureKey="website_builder_pro" fallback={<WebsiteBuilderTab org={currentOrg} role={role} />}><WebsiteBuilderTab org={currentOrg} role={role} /></FeatureGate>}
            {activeTab === "sentinel_seo" && (
              <div className="space-y-8">
                <SeoOptimizationPanel orgId={currentOrg.id} />
                <SentinelStoragePanel orgId={currentOrg.id} />
                <SentinelAddonsMarketplace orgId={currentOrg.id} />
              </div>
            )}
            {activeTab === "integrations" && <OrgIntegrationsPanel orgId={currentOrg.id} />}
            {activeTab === "settings" && <SettingsTab org={currentOrg} role={role} />}
          </main>
        </div>
      </div>
    </SidebarProvider></AccessGate>
  );
};

const statusLabelsMap: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", measuring: "Measuring",
  cutting: "Cutting", sewing: "Sewing", fitting: "Fitting",
  completed: "Completed", delivered: "Delivered", cancelled: "Cancelled",
};

const statusDotColors: Record<string, string> = {
  pending: "bg-muted-foreground", confirmed: "bg-primary", measuring: "bg-secondary",
  cutting: "bg-accent", sewing: "bg-primary", fitting: "bg-secondary",
  completed: "bg-green-500", delivered: "bg-green-600", cancelled: "bg-destructive",
};

const OverviewTab = ({ org, role }: { org: any; role: AppRole | null }) => {
  const { stats, loading } = useDashboardStats(org.id);
  const { subscription, loading: subLoading } = useOrgSubscription(org.id);
  const currency = org.currency || "NGN";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-6">Dashboard Overview</h2>
      <div className="mb-6">
        <RiskScoreCard orgId={org.id} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: ShoppingBag, label: "Orders", value: loading ? "…" : String(stats.activeOrders), desc: "Active orders", color: "text-primary" },
          { icon: Users, label: "Customers", value: loading ? "…" : String(stats.totalCustomers), desc: "Total customers", color: "text-secondary" },
          { icon: Package, label: "Items", value: loading ? "…" : String(stats.recentOrders.length), desc: "Recent orders", color: "text-accent" },
          { icon: BarChart3, label: "Revenue", value: loading ? "…" : `${stats.monthlyRevenue.toLocaleString()} ${currency}`, desc: "This month", color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={20} className={stat.color} />
            </div>
            <p className="font-heading font-bold text-2xl">{stat.value}</p>
            <p className="text-muted-foreground text-xs mt-1">{stat.label} · {stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl bg-card border border-border p-6 mb-6">
        <h3 className="font-heading font-semibold text-lg mb-4">Recent Orders</h3>
        {loading ? (
          <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : stats.recentOrders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No orders yet. Create your first order from the Orders tab.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusDotColors[order.status] || "bg-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{order.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {new Date(order.created_at).toLocaleDateString()}
                      <span className="ml-2">{order.order_number}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{(order.total_amount || 0).toLocaleString()} {currency}</p>
                  <p className="text-xs text-muted-foreground">{statusLabelsMap[order.status] || order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      {!loading && (stats.statusDistribution.length > 0 || stats.monthlyRevenueTrend.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          {stats.statusDistribution.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Order Status Distribution</h3>
              <div className="space-y-2">
                {stats.statusDistribution
                  .sort((a, b) => b.count - a.count)
                  .map((item) => {
                    const total = stats.statusDistribution.reduce((s, i) => s + i.count, 0);
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div key={item.status} className="flex items-center gap-3">
                        <span className="text-xs w-20 text-muted-foreground capitalize">{item.status}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{item.count} ({pct}%)</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Monthly Revenue Trend */}
          {stats.monthlyRevenueTrend.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Monthly Revenue</h3>
              <div className="flex items-end gap-2 h-40">
                {stats.monthlyRevenueTrend.map((item) => {
                  const maxRev = Math.max(...stats.monthlyRevenueTrend.map((i) => i.revenue), 1);
                  const heightPct = Math.max((item.revenue / maxRev) * 100, 4);
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {item.revenue > 0 ? `${(item.revenue / 1000).toFixed(0)}k` : "0"}
                      </span>
                      <div className="w-full flex justify-center">
                        <div
                          className="w-8 bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                          style={{ height: `${heightPct}%`, minHeight: "4px", maxHeight: "120px" }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Analysis */}
      {(role === "org_admin" || role === "manager" || role === "super_admin") && (
        <div className="mb-6">
          <RevenueAnalysisCard orgId={org.id} currency={currency} />
        </div>
      )}

      {/* Exchange Rates */}
      {(role === "org_admin" || role === "manager" || role === "super_admin") && (
        <div className="rounded-xl bg-card border border-border p-6 mb-6">
          <OrgExchangeRates />
        </div>
      )}

      {/* Billing Overview */}
      <div className="rounded-xl bg-card border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg">Billing Overview</h3>
        </div>
        {subLoading ? (
          <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
              <p className="font-heading font-bold text-lg">{subscription?.plan?.name || "No Plan"}</p>
              {subscription && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {subscription.billing_cycle === "yearly" ? "Annual" : "Monthly"} · {subscription.status}
                </p>
              )}
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">This Month Revenue</p>
              <p className="font-heading font-bold text-lg">{loading ? "…" : `₦${stats.monthlyRevenue.toLocaleString()}`}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{currency}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Plan Cost</p>
              <p className="font-heading font-bold text-lg">
                {subscription?.plan
                  ? `₦${(subscription.billing_cycle === "yearly" ? subscription.plan.price_yearly : subscription.plan.price_monthly).toLocaleString()}`
                  : "Free"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {subscription?.plan ? `/${subscription.billing_cycle === "yearly" ? "yr" : "mo"}` : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="font-heading font-semibold text-lg mb-2">Welcome to {org.name}</h3>
        <p className="text-muted-foreground text-sm">
          {role === "org_admin" || role === "manager"
            ? "As an Organization Admin, you can manage team members, settings, and orders."
            : role === "tailor"
            ? "View and manage your assigned orders and production workflow."
            : "Browse and place orders with your favorite tailors."}
        </p>
      </div>
    </motion.div>
  );
};

/* ─── Tailor Work Queue ─── */
const TailorWorkQueue = ({ orgId, userId, currency }: { orgId: string; userId: string; currency: string }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [{ data: orderData }, { data: delData }] = await Promise.all([
        supabase.from("orders").select("*").eq("org_id", orgId).eq("assigned_tailor_id", userId).not("status", "eq", "delivered").order("created_at", { ascending: false }),
        supabase.from("order_delegations").select("*, orders(title, order_number, status, total_amount, currency, due_date)").eq("org_id", orgId).eq("tailor_id", userId).order("created_at", { ascending: false }),
      ]);
      setOrders(orderData || []);
      setDelegations(delData || []);
      setLoading(false);
    };
    load();
  }, [orgId, userId]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
    if (error) toast({ title: "Error", variant: "destructive" });
    else {
      toast({ title: `Moved to ${statusLabelsMap[newStatus] || newStatus}` });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const acceptDelegation = async (delId: string) => {
    await supabase.from("order_delegations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", delId);
    setDelegations(prev => prev.map(d => d.id === delId ? { ...d, status: "accepted" } : d));
    toast({ title: "Delegation accepted" });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const statusFlow = ["pending", "confirmed", "measuring", "cutting", "sewing", "fitting", "completed", "delivered"];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-2">My Work Queue</h2>
      <p className="text-sm text-muted-foreground mb-6">Orders assigned to you and delegated tasks.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-card border border-border">
          <Package size={18} className="text-primary mb-2" />
          <p className="font-heading font-bold text-2xl">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Active Orders</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <Clock size={18} className="text-secondary mb-2" />
          <p className="font-heading font-bold text-2xl">{delegations.filter(d => d.status === "assigned").length}</p>
          <p className="text-xs text-muted-foreground">Pending Tasks</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <BarChart3 size={18} className="text-accent mb-2" />
          <p className="font-heading font-bold text-2xl">{delegations.filter(d => d.status === "completed").length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </div>

      {delegations.filter(d => d.status === "assigned").length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 mb-6">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Shield size={14} className="text-primary" /> Pending Delegation Requests
          </h3>
          <div className="space-y-2">
            {delegations.filter(d => d.status === "assigned").map(del => (
              <div key={del.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm font-medium">{del.orders?.title || "Order"}</p>
                  <p className="text-xs text-muted-foreground">{del.orders?.order_number} · Priority: {del.priority}</p>
                  {del.deadline && <p className="text-xs text-muted-foreground">Deadline: {new Date(del.deadline).toLocaleDateString()}</p>}
                </div>
                <Button variant="hero" size="sm" onClick={() => acceptDelegation(del.id)}>Accept</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Package size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active orders assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">{order.title}</p>
                  <p className="text-xs text-muted-foreground">{order.order_number} · {order.due_date ? `Due: ${new Date(order.due_date).toLocaleDateString()}` : "No due date"}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-sm">{currency} {(order.total_amount || 0).toLocaleString()}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusDotColors[order.status] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {statusLabelsMap[order.status] || order.status}
                  </span>
                </div>
              </div>
              {order.description && <p className="text-xs text-muted-foreground mb-3">{order.description}</p>}
              <div className="flex gap-2 flex-wrap">
                {statusFlow.map((s, i) => {
                  const currentIdx = statusFlow.indexOf(order.status);
                  if (i !== currentIdx + 1) return null;
                  return (
                    <Button key={s} variant="hero" size="sm" className="text-xs" onClick={() => updateStatus(order.id, s)}>
                      Move to {statusLabelsMap[s] || s}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const MembersTab = ({ orgId, role }: { orgId: string; role: AppRole | null }) => {
  const { members, loading, updateMemberRole, removeMember, refetch } = useOrgMembers(orgId);
  const { toast } = useToast();
  const canManage = role === "org_admin" || role === "manager" || role === "super_admin";

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    const { error } = await updateMemberRole(memberId, newRole);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Role updated" });
  };

  const handleRemove = async (memberId: string) => {
    const { error } = await removeMember(memberId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Member removed" });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-2xl">Team Members</h2>
        {canManage && (
          <InviteMemberDialog orgId={orgId} onInvited={refetch}>
            <Button variant="hero" size="sm">
              <Plus size={16} className="mr-1" /> Invite Member
            </Button>
          </InviteMemberDialog>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Member</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Joined</th>
                {canManage && <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User size={14} className="text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">
                        {member.profile?.display_name || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.id, val as AppRole)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="org_admin">Org Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="tailor">Tailor</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role]}`}>
                        {roleLabels[member.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const SettingsTab = ({ org, role }: { org: any; role: AppRole | null }) => {
  const { toast } = useToast();
  const [name, setName] = useState(org.name);
  const [email, setEmail] = useState(org.email || "");
  const [phone, setPhone] = useState(org.phone || "");
  const [address, setAddress] = useState(org.address || "");
  const [latitude, setLatitude] = useState<number | null>(org.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(org.longitude || null);
  const [physicalAddress, setPhysicalAddress] = useState(org.physical_address || "");
  const [invoiceAddress, setInvoiceAddress] = useState(org.invoice_address || "");
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState(org.invoice_payment_terms || "");
  const [invoiceNotes, setInvoiceNotes] = useState(org.invoice_notes || "");
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState(org.invoice_logo_url || "");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const canEdit = role === "org_admin" || role === "manager" || role === "super_admin";

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `${org.id}/invoice-logo.${ext}`;
    const { error } = await supabase.storage.from("org-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("org-assets").getPublicUrl(path);
      setInvoiceLogoUrl(data.publicUrl);
      toast({ title: "Logo uploaded" });
    }
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name, email, phone, address,
        latitude, longitude,
        physical_address: physicalAddress || null,
        invoice_address: invoiceAddress || null,
        invoice_payment_terms: invoicePaymentTerms || null,
        invoice_notes: invoiceNotes || null,
        invoice_logo_url: invoiceLogoUrl || null,
      })
      .eq("id", org.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-6">Organization Settings</h2>
      
      {/* General Settings */}
      <div className="rounded-xl bg-card border border-border p-6 max-w-lg space-y-4 mb-6">
        <h3 className="font-heading font-semibold text-lg">General</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Physical Location (KYC) */}
        <div className="space-y-2 pt-2 border-t border-border mt-4">
          <label className="text-sm font-medium flex items-center gap-2">
            Physical Location <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">KYC</span>
          </label>
          <p className="text-xs text-muted-foreground">Pin your physical address on the map for verification.</p>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            address={physicalAddress}
            onLocationChange={(lat, lng, addr) => {
              setLatitude(lat);
              setLongitude(lng);
              setPhysicalAddress(addr);
            }}
            disabled={!canEdit}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="text-sm text-muted-foreground">
            Currency: <span className="font-medium text-foreground">{org.currency}</span> · 
            Country: <span className="font-medium text-foreground">{org.country}</span>
          </div>
        </div>

        {/* Invite Code */}
        {canEdit && org.invite_code && (
          <div className="space-y-2 pt-2 border-t border-border mt-4">
            <label className="text-sm font-medium">Customer Invite Code</label>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 bg-muted rounded-lg text-sm font-mono tracking-widest flex-1">
                {org.invite_code}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(org.invite_code);
                  toast({ title: "Copied!" });
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code with customers so they can self-register at <strong>/portal</strong>
            </p>
          </div>
        )}
      </div>

      {/* Invoice Settings */}
      <div className="rounded-xl bg-card border border-border p-6 max-w-lg space-y-4 mb-6">
        <h3 className="font-heading font-semibold text-lg">Invoice Customization</h3>
        <p className="text-xs text-muted-foreground">Customize how your invoices appear when downloaded as PDF.</p>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Logo</label>
          <div className="flex items-center gap-4">
            {invoiceLogoUrl ? (
              <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                <img src={invoiceLogoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border border-dashed border-border bg-muted/50 flex items-center justify-center">
                <Palette size={20} className="text-muted-foreground" />
              </div>
            )}
            <div>
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-input cursor-pointer hover:bg-muted transition-colors ${!canEdit ? "opacity-50 pointer-events-none" : ""}`}>
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={!canEdit || uploadingLogo} />
              </label>
              {invoiceLogoUrl && canEdit && (
                <button onClick={() => setInvoiceLogoUrl("")} className="ml-2 text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Invoice Address</label>
          <textarea
            value={invoiceAddress}
            onChange={(e) => setInvoiceAddress(e.target.value)}
            disabled={!canEdit}
            placeholder="Business address to display on invoices"
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Payment Terms */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Terms</label>
          <textarea
            value={invoicePaymentTerms}
            onChange={(e) => setInvoicePaymentTerms(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Payment due within 14 days. Bank: GTBank, Acct: 0123456789"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Invoice Footer Notes</label>
          <textarea
            value={invoiceNotes}
            onChange={(e) => setInvoiceNotes(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Thank you for your patronage!"
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      {canEdit && (
        <Button variant="hero" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      )}

      {/* Payment Gateways */}
      {canEdit && (
        <div className="mt-8">
          <PaymentGatewayPanel orgId={org.id} canEdit={canEdit} />
        </div>
      )}

      {/* Availability Manager */}
      {canEdit && (
        <div className="mt-8">
          <AvailabilityManager orgId={org.id} />
        </div>
      )}

      {/* Location Map Footer */}
      <LocationMapFooter
        latitude={org.latitude}
        longitude={org.longitude}
        address={org.physical_address}
        label={`${org.name} — Physical Location`}
      />
    </motion.div>
  );
};

export default Dashboard;
