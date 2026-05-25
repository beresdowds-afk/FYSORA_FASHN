import { useAuth } from "@/contexts/AuthContext";
import { resolveHomeRoute } from "@/lib/roleHome";
import KeysSecretsPanel from "@/components/super-admin/KeysSecretsPanel";
import ExchangeRatesPanel from "@/components/super-admin/ExchangeRatesPanel";
import PlatformRevenuePanel from "@/components/super-admin/PlatformRevenuePanel";
import WebsitePricingPanel from "@/components/super-admin/WebsitePricingPanel";
import UnifiedPricingPanel from "@/components/super-admin/UnifiedPricingPanel";
import DataBackupPanel from "@/components/super-admin/DataBackupPanel";
import FeatureFlagsPanel from "@/components/super-admin/FeatureFlagsPanel";
import PlatformUpdatesPanel from "@/components/super-admin/PlatformUpdatesPanel";
import VoicedTourSyncPanel from "@/components/super-admin/VoicedTourSyncPanel";
import WebsiteRequestsDashboard from "@/components/super-admin/WebsiteRequestsDashboard";
import MobileAppManagementPanel from "@/components/super-admin/MobileAppManagementPanel";
import AppDownloadsPanel from "@/components/super-admin/AppDownloadsPanel";
import AuditLogsPanel from "@/components/super-admin/AuditLogsPanel";
import AccountManagementPanel from "@/components/super-admin/AccountManagementPanel";
import AdminInvoicingPaymentsPanel from "@/components/super-admin/AdminInvoicingPaymentsPanel";
import InvoiceManagerPanel from "@/components/invoices/InvoiceManagerPanel";
import AdminSupportRequestsPanel from "@/components/super-admin/AdminSupportRequestsPanel";
import BankAccountsPanel from "@/components/super-admin/BankAccountsPanel";
import MessageCenterDashboard from "@/components/super-admin/MessageCenterDashboard";
import SubscriptionRatesPanel from "@/components/super-admin/SubscriptionRatesPanel";
import TaxCompliancePanel from "@/components/super-admin/TaxCompliancePanel";
import RegionalManagementPanel from "@/components/super-admin/RegionalManagementPanel";
import FeaturedProductsAdminPanel from "@/components/super-admin/FeaturedProductsAdminPanel";
import PlatformSettingsPanel from "@/components/super-admin/PlatformSettingsPanel";
import PlatformPhoneNumbersPanel from "@/components/super-admin/PlatformPhoneNumbersPanel";
import CommsOversightPanel from "@/components/super-admin/CommsOversightPanel";
import CommunicationsHubTestPanel from "@/components/super-admin/CommunicationsHubTestPanel";
import SentinelMcpSubscriptionPanel from "@/components/super-admin/SentinelMcpSubscriptionPanel";
import VideoBillingPanel from "@/components/super-admin/VideoBillingPanel";
import DomainManagementPanel from "@/components/super-admin/DomainManagementPanel";
import TenantSitesPanel from "@/components/super-admin/TenantSitesPanel";
import VerificationProvidersPanel from "@/components/super-admin/VerificationProvidersPanel";
import PendingVerificationsPanel from "@/components/super-admin/PendingVerificationsPanel";
import MonetizationSwitchesPanel from "@/components/super-admin/MonetizationSwitchesPanel";
import CommunicationsFullPage from "@/components/communications/CommunicationsFullPage";
import CarrierSettingsPanel from "@/components/logistics/CarrierSettingsPanel";
import CustomerRegistrationsTab from "@/components/customers/CustomerRegistrationsTab";
import DisputesTab from "@/components/disputes/DisputesTab";
import WebsiteTemplatePicker from "@/components/website-builder/WebsiteTemplatePicker";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Smartphone, ScrollText, HelpCircle, UserX, Search, Trash2, Star, ShoppingBag, Download, Settings, LifeBuoy, Banknote, MapPin, MessageSquare, Menu, Video, ClipboardList, Scale, Truck, Palette, Radio, ShieldCheck } from "lucide-react";
import LocationMapFooter from "@/components/shared/LocationMapFooter";
import TourGuide from "@/components/shared/TourGuide";
import ManualPwaUpdateButton from "@/components/platform/ManualPwaUpdateButton";
import { useTourGuide } from "@/hooks/useTourGuide";
import { useToast } from "@/hooks/use-toast";
import { superAdminTourSteps } from "@/config/tourSteps";
import {
  LogOut,
  Users,
  Building2,
  BarChart3,
  Shield,
  Globe,
  Plus,
  Activity,
  TrendingUp,
  LayoutDashboard,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";

type TabId = "overview" | "platform_settings" | "carriers" | "organizations" | "users" | "accounts" | "pending_verifications" | "revenue" | "invoicing" | "invoice_manager" | "sub_rates" | "tax_compliance" | "regional_management" | "featured" | "keys" | "rates" | "websites" | "tenant_sites" | "pricing" | "unified_pricing" | "monetization_switches" | "backups" | "features" | "mobile" | "app_downloads" | "audit" | "support_requests" | "bank_accounts" | "message_center" | "phone_numbers" | "comms_oversight" | "video_billing" | "domain_management" | "identity_verification" | "communications" | "comms_hub_test" | "registrations" | "disputes" | "website_templates" | "platform_updates" | "voiced_tour_sync" | "sentinel_mcp";

interface SidebarItem {
  id: TabId;
  icon: React.ElementType;
  label: string;
}

interface SidebarGroupDef {
  label: string;
  items: SidebarItem[];
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  currency: string | null;
  is_active: boolean;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  physical_address?: string | null;
}

const SuperAdminDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSuperAdmin, isSuperAssistant, loading: roleLoading } = useUserGlobalRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orgs: 0, users: 0 });
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const hasAccess = isSuperAdmin || isSuperAssistant;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const tour = useTourGuide("super-admin-dashboard", superAdminTourSteps);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (!hasAccess) {
        // Route non-privileged users straight to their real home rather than
        // bouncing through /dashboard.
        resolveHomeRoute(user.id).then((home) => navigate(home, { replace: true }));
      }
    }
  }, [user, authLoading, hasAccess, roleLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ count: orgCount }, { count: memberCount }, { data: orgData }] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("org_members").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      setStats({ orgs: orgCount || 0, users: memberCount || 0 });
      setOrgs((orgData as OrgRow[]) || []);
    };
    if (hasAccess) fetchData();
  }, [hasAccess]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) return null;

  const restrictedTabs = new Set(["platform_settings", "sub_rates", "unified_pricing", "pricing", "features", "regional_management", "monetization_switches"]);

  const allGroups: SidebarGroupDef[] = [
    {
      label: "General",
      items: [
        { id: "overview", icon: BarChart3, label: "Overview" },
        { id: "platform_settings", icon: Settings, label: "Platform Settings" },
        { id: "carriers", icon: Truck, label: "Carriers" },
      ],
    },
    {
      label: "People & Orgs",
      items: [
        { id: "organizations", icon: Building2, label: "Organizations" },
        { id: "users", icon: Users, label: "Users & Roles" },
        { id: "accounts", icon: UserX, label: "Account Mgmt" },
        { id: "pending_verifications", icon: ShieldCheck, label: "Pending Verifications" },
        { id: "registrations", icon: ClipboardList, label: "Registrations" },
        { id: "disputes", icon: Scale, label: "Disputes" },
      ],
    },
    {
      label: "Finance",
      items: [
        { id: "revenue", icon: TrendingUp, label: "Platform Revenue" },
        { id: "invoicing", icon: ScrollText, label: "Invoicing & Payments" },
        { id: "invoice_manager", icon: ScrollText, label: "Invoice Manager" },
        { id: "sub_rates", icon: Crown, label: "Subscription Rates" },
        { id: "tax_compliance", icon: Globe, label: "Tax & Compliance" },
        { id: "regional_management", icon: MapPin, label: "Regional Mgmt" },
        { id: "bank_accounts", icon: Banknote, label: "Bank Accounts" },
      ],
    },
    {
      label: "Pricing & Products",
      items: [
        { id: "unified_pricing", icon: DollarSign, label: "Pricing Center" },
        { id: "monetization_switches", icon: DollarSign, label: "Monetization Switches" },
        { id: "pricing", icon: Globe, label: "Website Pricing" },
        { id: "featured", icon: Star, label: "Featured Products" },
        { id: "rates", icon: Globe, label: "Exchange Rates" },
      ],
    },
    {
      label: "Communications",
      items: [
        { id: "communications", icon: MessageSquare, label: "Communications Hub" },
        { id: "comms_hub_test", icon: Radio, label: "Comms Test Console" },
        { id: "message_center", icon: MessageSquare, label: "Message Center" },
        { id: "comms_oversight", icon: Shield, label: "Comms Oversight" },
        { id: "support_requests", icon: LifeBuoy, label: "Support Requests" },
      ],
    },
    {
      label: "System",
      items: [
        { id: "websites", icon: Crown, label: "Website Requests" },
        { id: "website_templates", icon: Palette, label: "Website Templates" },
        { id: "tenant_sites", icon: Globe, label: "Tenant Sites Portal" },
        { id: "domain_management", icon: Globe, label: "Domain Mgmt" },
        { id: "video_billing", icon: Video, label: "Video Billing" },
        { id: "keys", icon: Shield, label: "Keys & Secrets" },
        { id: "phone_numbers", icon: Globe, label: "Phone Numbers" },
        { id: "backups", icon: Activity, label: "Backups" },
        { id: "features", icon: Shield, label: "Feature Flags" },
        { id: "mobile", icon: Smartphone, label: "Mobile App" },
        { id: "app_downloads", icon: Download, label: "App Downloads" },
        { id: "platform_updates", icon: Radio, label: "Platform Updates" },
        { id: "voiced_tour_sync", icon: Radio, label: "Voiced Tour Sync" },
        { id: "sentinel_mcp", icon: Shield, label: "Sentinel MCP" },
        { id: "identity_verification", icon: Shield, label: "Identity Verification" },
        { id: "audit", icon: ScrollText, label: "Audit Logs" },
      ],
    },
  ];

  // Filter restricted tabs for super_assistant
  const sidebarGroups = allGroups.map(group => ({
    ...group,
    items: group.items.filter(item => isSuperAdmin || !restrictedTabs.has(item.id)),
  })).filter(group => group.items.length > 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <TourGuide {...tour} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand z-50" />

        {/* Desktop Sidebar */}
        <AdminSidebar
          groups={sidebarGroups}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b border-border bg-ebony sticky top-0 z-40">
            <div className="px-4 lg:px-6 flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                {/* Desktop sidebar trigger */}
                <SidebarTrigger className="text-ivory/70 hover:text-ivory hidden md:flex" />
                {/* Mobile menu */}
                <MobileSidebarMenu
                  groups={sidebarGroups}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
                  <Shield size={16} className="text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-ivory hidden sm:inline">
                    FYSORA FASHN (Fashion Stitches Africa)
                  </span>
                  <span className="font-heading font-bold text-sm text-ivory sm:hidden">
                    FSA
                  </span>
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                    {isSuperAdmin ? "Super Admin" : "Super Assistant"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" className="text-ivory/70 hover:text-ivory text-xs hidden lg:flex" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard size={14} className="mr-1" /> Org Dashboard
                </Button>
                <Button variant="ghost" size="sm" className="text-ivory/70 hover:text-ivory text-xs hidden lg:flex" onClick={() => navigate("/platform-catalogue")}>
                  <ShoppingBag size={14} className="mr-1" /> Catalogue
                </Button>
                <Button variant="ghost" size="sm" className="text-ivory/70 hover:text-ivory text-xs hidden xl:flex" onClick={() => navigate("/admin-install")}>
                  <Download size={14} className="mr-1" /> Admin App
                </Button>
                <Button variant="ghost" size="icon" onClick={tour.restart} title="Restart tour guide" className="text-ivory/70 hover:text-ivory h-8 w-8">
                  <HelpCircle size={16} />
                </Button>
                <ManualPwaUpdateButton compact />
                <div className="w-px h-6 bg-border/30 mx-1" />
                <Button variant="ghost" size="icon" className="text-ivory/70 hover:text-ivory h-8 w-8" onClick={() => signOut().then(() => navigate("/"))}>
                  <LogOut size={14} />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {activeTab === "overview" && <OverviewPanel stats={stats} orgs={orgs} groups={sidebarGroups} onTabChange={setActiveTab} />}
            {activeTab === "platform_settings" && isSuperAdmin && <PlatformSettingsPanel />}
            {activeTab === "carriers" && <CarrierSettingsPanel orgId="" />}
            {activeTab === "organizations" && <OrganizationsPanel orgs={orgs} />}
            {activeTab === "users" && <UsersPanel />}
            {activeTab === "accounts" && <AccountManagementPanel />}
            {activeTab === "revenue" && <PlatformRevenuePanel />}
            {activeTab === "invoicing" && <AdminInvoicingPaymentsPanel />}
            {activeTab === "invoice_manager" && <InvoiceManagerPanel isSuperAdmin currency="USD" />}
            {activeTab === "sub_rates" && isSuperAdmin && <SubscriptionRatesPanel />}
            {activeTab === "tax_compliance" && isSuperAdmin && <TaxCompliancePanel />}
            {activeTab === "regional_management" && isSuperAdmin && <RegionalManagementPanel />}
            {activeTab === "featured" && <FeaturedProductsAdminPanel />}
            {activeTab === "websites" && <WebsiteRequestsDashboard />}
            {activeTab === "tenant_sites" && <TenantSitesPanel />}
            {activeTab === "unified_pricing" && isSuperAdmin && <UnifiedPricingPanel />}
            {activeTab === "monetization_switches" && isSuperAdmin && <MonetizationSwitchesPanel />}
            {activeTab === "pricing" && isSuperAdmin && <WebsitePricingPanel />}
            {activeTab === "keys" && <KeysSecretsPanel />}
            {activeTab === "rates" && <ExchangeRatesPanel />}
            {activeTab === "backups" && <DataBackupPanel />}
            {activeTab === "features" && isSuperAdmin && <FeatureFlagsPanel />}
            {activeTab === "mobile" && <MobileAppManagementPanel />}
            {activeTab === "app_downloads" && <AppDownloadsPanel />}
            {activeTab === "platform_updates" && isSuperAdmin && <PlatformUpdatesPanel />}
            {activeTab === "voiced_tour_sync" && isSuperAdmin && <VoicedTourSyncPanel />}
            {activeTab === "audit" && <AuditLogsPanel />}
            {activeTab === "support_requests" && <AdminSupportRequestsPanel />}
            {activeTab === "bank_accounts" && <BankAccountsPanel />}
            {activeTab === "message_center" && <MessageCenterDashboard />}
            {activeTab === "comms_oversight" && <CommsOversightPanel />}
            {activeTab === "phone_numbers" && <PlatformPhoneNumbersPanel />}
            {activeTab === "video_billing" && <VideoBillingPanel />}
            {activeTab === "domain_management" && <DomainManagementPanel />}
            {activeTab === "identity_verification" && <VerificationProvidersPanel />}
            {activeTab === "pending_verifications" && <PendingVerificationsPanel />}
            {activeTab === "communications" && <CommunicationsFullPage />}
            {activeTab === "comms_hub_test" && <CommunicationsHubTestPanel />}
            {activeTab === "sentinel_mcp" && <SentinelMcpSubscriptionPanel />}
            {activeTab === "registrations" && <RegistrationsPanel orgs={orgs} />}
            {activeTab === "disputes" && <DisputesPanel orgs={orgs} />}
            {activeTab === "website_templates" && <WebsiteTemplatePicker readOnly />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

/* ───────────── Admin Sidebar (Desktop) ───────────── */
const AdminSidebar = ({
  groups,
  activeTab,
  onTabChange,
}: {
  groups: SidebarGroupDef[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border hidden md:flex">
      <SidebarContent className="pt-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>
              {!collapsed && <span>{group.label}</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      data-tour={`sa-${item.id}`}
                      tooltip={item.label}
                      className={cn(
                        "cursor-pointer",
                        activeTab === item.id && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon size={18} />
                      {!collapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

/* ───────────── Mobile Sidebar Sheet ───────────── */
const MobileSidebarMenu = ({
  groups,
  activeTab,
  onTabChange,
}: {
  groups: SidebarGroupDef[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (tab: TabId) => {
    onTabChange(tab);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-ivory/70 hover:text-ivory md:hidden h-8 w-8">
          <Menu size={18} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
        <SheetTitle className="px-4 pt-4 pb-2 font-heading font-bold text-sm text-foreground">
          Admin Menu
        </SheetTitle>
        <nav className="px-2 pb-4 space-y-1">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    activeTab === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

/* ───────────── Overview Panel ───────────── */
const groupIcons: Record<string, React.ElementType> = {
  "General": Settings,
  "People & Orgs": Users,
  "Finance": TrendingUp,
  "Pricing & Products": DollarSign,
  "Communications": MessageSquare,
  "System": Shield,
};

const groupColors: Record<string, { text: string; bg: string }> = {
  "General": { text: "text-primary", bg: "bg-primary/10" },
  "People & Orgs": { text: "text-secondary", bg: "bg-secondary/10" },
  "Finance": { text: "text-accent", bg: "bg-accent/10" },
  "Pricing & Products": { text: "text-primary", bg: "bg-primary/10" },
  "Communications": { text: "text-secondary", bg: "bg-secondary/10" },
  "System": { text: "text-accent", bg: "bg-accent/10" },
};

const OverviewPanel = ({ stats, orgs, groups, onTabChange }: { stats: { orgs: number; users: number }; orgs: OrgRow[]; groups: SidebarGroupDef[]; onTabChange: (tab: TabId) => void }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div>
      <h1 className="font-heading font-bold text-2xl">Platform Overview</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Monitor all organizations and users across FYSORA FASHN (Fashion Stitches Africa).
      </p>
    </div>

    {/* Quick Navigation Grid - 3x2 dropdown buttons */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {groups.map((group) => {
        const GroupIcon = groupIcons[group.label] || Settings;
        const colors = groupColors[group.label] || { text: "text-primary", bg: "bg-primary/10" };
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-auto py-4 px-4 flex flex-col items-center gap-2 w-full border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <GroupIcon size={20} className={colors.text} />
                </div>
                <span className="font-heading font-semibold text-xs text-foreground">{group.label}</span>
                <span className="text-[10px] text-muted-foreground">{group.items.length} items</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              {group.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="cursor-pointer gap-2"
                >
                  <item.icon size={14} />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { icon: Building2, label: "Organizations", value: stats.orgs, color: "text-primary", bg: "bg-primary/10" },
        { icon: Users, label: "Total Members", value: stats.users, color: "text-secondary", bg: "bg-secondary/10" },
        { icon: Activity, label: "Active Today", value: "—", color: "text-accent", bg: "bg-accent/10" },
        { icon: TrendingUp, label: "Growth", value: "—", color: "text-primary", bg: "bg-primary/10" },
      ].map((stat) => (
        <div key={stat.label} className="p-4 rounded-xl bg-card border border-border">
          <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
            <stat.icon size={18} className={stat.color} />
          </div>
          <p className="font-heading font-bold text-2xl">{stat.value}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>

    {/* Quick Info Cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Security Status</h3>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Row-Level Security enabled on all tables
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Role-based access control active
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Organization data isolation enforced
          </li>
        </ul>
      </div>

      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-secondary" />
          <h3 className="font-heading font-semibold text-sm">Supported Regions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {["NGN", "GHS", "KES", "ZAR", "USD", "GBP", "EUR"].map((c) => (
            <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>

    {/* Recent Orgs */}
    {orgs.length > 0 && (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">Recent Organizations</h3>
        </div>
        <div className="divide-y divide-border">
          {orgs.slice(0, 5).map((org) => (
            <div key={org.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{org.slug} · {org.currency || "NGN"}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${org.is_active ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                {org.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

/* ───────────── Organizations Panel ───────────── */
const OrganizationsPanel = ({ orgs }: { orgs: OrgRow[] }) => {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Organizations</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all registered organizations.</p>
        </div>
        <Button variant="hero" size="sm" onClick={() => navigate("/create-organization")}>
          <Plus size={14} className="mr-1" /> New Organization
        </Button>
      </div>

      {orgs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Building2 size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No organizations yet.</p>
          <Button variant="hero" size="sm" className="mt-4" onClick={() => navigate("/create-organization")}>
            Create First Organization
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Slug</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Currency</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Location KYC</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 size={12} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{org.slug}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{org.currency || "—"}</td>
                    <td className="px-4 py-3">
                      {org.latitude && org.longitude ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-secondary/10 text-secondary flex items-center gap-1 w-fit">
                          <MapPin size={10} /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${org.is_active ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                        {org.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ───────────── Users & Roles Panel ───────────── */
const UsersPanel = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserGlobalRole();
  const [members, setMembers] = useState<
    { user_id: string; member_id: string; role: string; org_id: string; org_name: string; display_name: string | null }[]
  >([]);
  const [globalRoles, setGlobalRoles] = useState<{ id: string; user_id: string; role: string; display_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"org_roles" | "fsa_roles">("fsa_roles");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"super_admin" | "super_assistant">("super_assistant");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("org_members")
      .select("id, user_id, role, org_id, organizations(name), profiles:user_id(display_name)")
      .order("joined_at", { ascending: false })
      .limit(100);

    setMembers(
      (data || []).map((m: any) => ({
        user_id: m.user_id,
        member_id: m.id,
        role: m.role,
        org_id: m.org_id,
        org_name: m.organizations?.name || "—",
        display_name: m.profiles?.display_name || "Unknown",
      }))
    );
  };

  const fetchGlobalRoles = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    if (data && data.length > 0) {
      const userIds = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

      setGlobalRoles(
        data.map((r) => ({
          ...r,
          display_name: profileMap.get(r.user_id) || "Unknown",
        }))
      );
    } else {
      setGlobalRoles([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchGlobalRoles()]);
      setLoading(false);
    };
    load();
  }, []);

  const handleChangeOrgRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("org_members")
      .update({ role: newRole as "org_admin" | "manager" | "tailor" | "customer" | "super_admin" })
      .eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated" });
      await fetchMembers();
    }
  };

  const handleRemoveOrgMember = async (memberId: string) => {
    const { error } = await supabase.from("org_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      await fetchMembers();
    }
  };

  const handleRevokeGlobalRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Global role revoked" });
      await fetchGlobalRoles();
    }
  };

  const handleGrantGlobalRole = async () => {
    const trimmed = addEmail.trim().toLowerCase();
    if (!trimmed) return;
    setAdding(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name");

    const matched = profiles?.find((p) => p.display_name?.toLowerCase().trim() === trimmed);
    if (!matched) {
      toast({ title: "User not found", description: "This email is not registered on FSA.", variant: "destructive" });
      setAdding(false);
      return;
    }

    const existing = globalRoles.find((r) => r.user_id === matched.id && r.role === addRole);
    if (existing) {
      toast({ title: `Already a ${addRole.replace("_", " ")}`, variant: "destructive" });
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("user_roles").insert({ user_id: matched.id, role: addRole });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role granted", description: `${matched.display_name} is now a ${addRole.replace("_", " ")}.` });
      setAddEmail("");
      await fetchGlobalRoles();
    }
    setAdding(false);
  };

  const filteredMembers = members.filter(
    (m) => m.display_name?.toLowerCase().includes(search.toLowerCase()) || m.org_name.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    super_admin: "bg-accent/10 text-accent",
    super_assistant: "bg-accent/10 text-accent",
    org_admin: "bg-primary/10 text-primary",
    manager: "bg-primary/10 text-primary",
    tailor: "bg-secondary/10 text-secondary",
    customer: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Users & Roles</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage FSA-level and organization-level roles across the platform.</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "fsa_roles" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("fsa_roles")}
          className="gap-1.5"
        >
          <Crown size={14} /> FSA Roles
        </Button>
        <Button
          variant={tab === "org_roles" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("org_roles")}
          className="gap-1.5"
        >
          <Building2 size={14} /> Organization Roles
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "fsa_roles" ? (
        <div className="space-y-4">
          {isSuperAdmin && (
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield size={16} className="text-primary" /> Grant Platform Role
            </h3>
            <div className="flex gap-2 max-w-lg">
              <Input
                placeholder="User email address..."
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={addRole} onValueChange={(v) => setAddRole(v as "super_admin" | "super_assistant")}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="super_assistant">Super Assistant</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="hero" size="sm" onClick={handleGrantGlobalRole} disabled={adding}>
                {adding ? "Granting..." : "Grant"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">The user must have an existing FSA account. Super Assistants have full access except pricing and feature management.</p>
          </div>
          )}

          {globalRoles.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-12 text-center">
              <Shield size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No global roles assigned yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="font-heading font-semibold text-sm">Platform-Level Roles ({globalRoles.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalRoles.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-3 text-sm font-medium">{r.display_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[r.role] || ""}`}>
                            {r.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSuperAdmin && r.user_id !== user?.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive text-xs h-7"
                              onClick={() => handleRevokeGlobalRole(r.id)}
                            >
                              <Trash2 size={12} className="mr-1" /> Revoke
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members or orgs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredMembers.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-12 text-center">
              <Users size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No members found.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Member</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m, i) => (
                      <tr key={`${m.user_id}-${i}`} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium">{m.display_name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.org_name}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={m.role}
                            onValueChange={(val) => handleChangeOrgRole(m.member_id, val)}
                          >
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="org_admin">Org Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="tailor">Tailor</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive text-xs h-7"
                            onClick={() => handleRemoveOrgMember(m.member_id)}
                          >
                            <Trash2 size={12} className="mr-1" /> Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

/* ───────────── Registrations Panel (with org selector) ───────────── */
const RegistrationsPanel = ({ orgs }: { orgs: OrgRow[] }) => {
  const [selectedOrgId, setSelectedOrgId] = useState(orgs[0]?.id || "");

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-2xl">Customer Registrations</h2>
        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedOrgId && <CustomerRegistrationsTab orgId={selectedOrgId} />}
    </motion.div>
  );
};

/* ───────────── Disputes Panel (with org selector) ───────────── */
const DisputesPanel = ({ orgs }: { orgs: OrgRow[] }) => {
  const [selectedOrgId, setSelectedOrgId] = useState(orgs[0]?.id || "");

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-2xl">Disputes Management</h2>
        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedOrgId && <DisputesTab orgId={selectedOrgId} role="super_admin" />}
    </motion.div>
  );
};

export default SuperAdminDashboard;
