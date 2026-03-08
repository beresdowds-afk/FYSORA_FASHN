import { useAuth } from "@/contexts/AuthContext";
import KeysSecretsPanel from "@/components/super-admin/KeysSecretsPanel";
import ExchangeRatesPanel from "@/components/super-admin/ExchangeRatesPanel";
import PlatformRevenuePanel from "@/components/super-admin/PlatformRevenuePanel";
import WebsitePricingPanel from "@/components/super-admin/WebsitePricingPanel";
import UnifiedPricingPanel from "@/components/super-admin/UnifiedPricingPanel";
import DataBackupPanel from "@/components/super-admin/DataBackupPanel";
import FeatureFlagsPanel from "@/components/super-admin/FeatureFlagsPanel";
import WebsiteRequestsDashboard from "@/components/super-admin/WebsiteRequestsDashboard";
import MobileAppManagementPanel from "@/components/super-admin/MobileAppManagementPanel";
import AuditLogsPanel from "@/components/super-admin/AuditLogsPanel";
import AccountManagementPanel from "@/components/super-admin/AccountManagementPanel";
import AdminInvoicingPaymentsPanel from "@/components/super-admin/AdminInvoicingPaymentsPanel";
import AdminSupportRequestsPanel from "@/components/super-admin/AdminSupportRequestsPanel";
import BankAccountsPanel from "@/components/super-admin/BankAccountsPanel";
import MessageCenterDashboard from "@/components/super-admin/MessageCenterDashboard";
import SubscriptionRatesPanel from "@/components/super-admin/SubscriptionRatesPanel";
import FeaturedProductsAdminPanel from "@/components/super-admin/FeaturedProductsAdminPanel";
import PlatformSettingsPanel from "@/components/super-admin/PlatformSettingsPanel";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Smartphone, ScrollText, HelpCircle, UserX, Search, Trash2, Star, ShoppingBag, Download, Settings, LifeBuoy, Banknote, MapPin } from "lucide-react";
import LocationMapFooter from "@/components/shared/LocationMapFooter";
import TourGuide from "@/components/shared/TourGuide";
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
  const [activeTab, setActiveTab] = useState<"overview" | "platform_settings" | "organizations" | "users" | "accounts" | "revenue" | "invoicing" | "sub_rates" | "featured" | "keys" | "rates" | "websites" | "pricing" | "unified_pricing" | "backups" | "features" | "mobile" | "audit" | "support_requests" | "bank_accounts" | "message_center">("overview");
  const tour = useTourGuide("super-admin-dashboard", superAdminTourSteps);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (!hasAccess) navigate("/dashboard");
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

  // Tabs restricted from super_assistant: pricing, features, subscription rates
  const restrictedTabs = new Set(["platform_settings", "sub_rates", "unified_pricing", "pricing", "features"]);

  const sidebarItems = [
    { id: "overview" as const, icon: BarChart3, label: "Overview" },
    { id: "platform_settings" as const, icon: Settings, label: "Platform Settings" },
    { id: "organizations" as const, icon: Building2, label: "Organizations" },
    { id: "users" as const, icon: Users, label: "Users & Roles" },
    { id: "accounts" as const, icon: UserX, label: "Account Mgmt" },
    { id: "revenue" as const, icon: TrendingUp, label: "Platform Revenue" },
    { id: "invoicing" as const, icon: ScrollText, label: "Invoicing & Payments" },
    { id: "sub_rates" as const, icon: Crown, label: "Subscription Rates" },
    { id: "featured" as const, icon: Star, label: "Featured Products" },
    { id: "websites" as const, icon: Crown, label: "Website Requests" },
    { id: "unified_pricing" as const, icon: DollarSign, label: "Pricing Center" },
    { id: "pricing" as const, icon: Globe, label: "Website Pricing" },
    { id: "keys" as const, icon: Shield, label: "Keys & Secrets" },
    { id: "rates" as const, icon: Globe, label: "Exchange Rates" },
    { id: "backups" as const, icon: Activity, label: "Backups" },
    { id: "features" as const, icon: Shield, label: "Feature Flags" },
    { id: "mobile" as const, icon: Smartphone, label: "Mobile App" },
    { id: "audit" as const, icon: ScrollText, label: "Audit Logs" },
    { id: "support_requests" as const, icon: LifeBuoy, label: "Support Requests" },
    { id: "bank_accounts" as const, icon: Banknote, label: "Bank Accounts" },
    { id: "message_center" as const, icon: MessageSquare, label: "Message Center" },
  ].filter(item => isSuperAdmin || !restrictedTabs.has(item.id));

  return (
    <div className="min-h-screen bg-background">
      <TourGuide {...tour} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      {/* Header */}
      <header className="border-b border-border bg-ebony">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <Shield size={16} className="text-primary-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm text-ivory">
                Fashion Stitches Africa
              </span>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                {isSuperAdmin ? "Super Admin" : "Super Assistant"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-ivory/70 hover:text-ivory text-xs"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard size={14} className="mr-1" />
              Org Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-ivory/70 hover:text-ivory text-xs"
              onClick={() => navigate("/platform-catalogue")}
            >
              <ShoppingBag size={14} className="mr-1" />
              View Catalogue
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-ivory/70 hover:text-ivory text-xs"
              onClick={() => navigate("/create-organization")}
            >
              <Plus size={14} className="mr-1" />
              New Org
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-ivory/70 hover:text-ivory text-xs"
              onClick={() => navigate("/admin-install")}
            >
              <Download size={14} className="mr-1" />
              Admin App
            </Button>
            <Button variant="ghost" size="icon" onClick={tour.restart} title="Restart tour guide" className="text-ivory/70 hover:text-ivory">
              <HelpCircle size={16} />
            </Button>
            <div className="w-px h-6 bg-border/30 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="text-ivory/70 hover:text-ivory"
              onClick={() => signOut().then(() => navigate("/"))}
            >
              <LogOut size={14} />
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container mx-auto px-4 lg:px-8 py-6 flex gap-6">
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col w-52 shrink-0 gap-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              data-tour={`sa-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile tabs */}
        <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {activeTab === "overview" && <OverviewPanel stats={stats} orgs={orgs} />}
          {activeTab === "platform_settings" && isSuperAdmin && <PlatformSettingsPanel />}
          {activeTab === "organizations" && <OrganizationsPanel orgs={orgs} />}
          {activeTab === "users" && <UsersPanel />}
          {activeTab === "accounts" && <AccountManagementPanel />}
          {activeTab === "revenue" && <PlatformRevenuePanel />}
          {activeTab === "invoicing" && <AdminInvoicingPaymentsPanel />}
          {activeTab === "sub_rates" && isSuperAdmin && <SubscriptionRatesPanel />}
          {activeTab === "featured" && <FeaturedProductsAdminPanel />}
          {activeTab === "websites" && <WebsiteRequestsDashboard />}
          {activeTab === "unified_pricing" && isSuperAdmin && <UnifiedPricingPanel />}
          {activeTab === "pricing" && isSuperAdmin && <WebsitePricingPanel />}
          {activeTab === "keys" && <KeysSecretsPanel />}
          {activeTab === "rates" && <ExchangeRatesPanel />}
          {activeTab === "backups" && <DataBackupPanel />}
          {activeTab === "features" && isSuperAdmin && <FeatureFlagsPanel />}
          {activeTab === "mobile" && <MobileAppManagementPanel />}
          {activeTab === "audit" && <AuditLogsPanel />}
          {activeTab === "support_requests" && <AdminSupportRequestsPanel />}
          {activeTab === "bank_accounts" && <BankAccountsPanel />}
        </main>
      </div>
    </div>
  );
};

/* ───────────── Overview Panel ───────────── */
const OverviewPanel = ({ stats, orgs }: { stats: { orgs: number; users: number }; orgs: OrgRow[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div>
      <h1 className="font-heading font-bold text-2xl">Platform Overview</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Monitor all organizations and users across Fashion Stitches Africa.
      </p>
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
          {/* Grant Global Role — only super_admin can grant */}
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

          {/* Current Global Roles */}
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
                          {/* Only super_admin can revoke, and not their own role */}
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


export default SuperAdminDashboard;

