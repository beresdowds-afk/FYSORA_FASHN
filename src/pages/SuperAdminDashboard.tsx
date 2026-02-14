import { useAuth } from "@/contexts/AuthContext";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  ChevronRight,
  LayoutDashboard,
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
}

const SuperAdminDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserGlobalRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orgs: 0, users: 0 });
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "organizations" | "users">("overview");

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (!isSuperAdmin) navigate("/dashboard");
    }
  }, [user, authLoading, isSuperAdmin, roleLoading, navigate]);

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
    if (isSuperAdmin) fetchData();
  }, [isSuperAdmin]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  const sidebarItems = [
    { id: "overview" as const, icon: BarChart3, label: "Overview" },
    { id: "organizations" as const, icon: Building2, label: "Organizations" },
    { id: "users" as const, icon: Users, label: "Users & Roles" },
  ];

  return (
    <div className="min-h-screen bg-background">
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
                Super Admin
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
              onClick={() => navigate("/create-organization")}
            >
              <Plus size={14} className="mr-1" />
              New Org
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
          {activeTab === "organizations" && <OrganizationsPanel orgs={orgs} />}
          {activeTab === "users" && <UsersPanel />}
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

/* ───────────── Users Panel ───────────── */
const UsersPanel = () => {
  const [members, setMembers] = useState<
    { user_id: string; role: string; org_name: string; display_name: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("org_members")
        .select("user_id, role, organizations(name), profiles:user_id(display_name)")
        .order("joined_at", { ascending: false })
        .limit(50);

      setMembers(
        (data || []).map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          org_name: m.organizations?.name || "—",
          display_name: m.profiles?.display_name || "Unknown",
        }))
      );
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const roleColors: Record<string, string> = {
    super_admin: "bg-accent/10 text-accent",
    org_admin: "bg-primary/10 text-primary",
    tailor: "bg-secondary/10 text-secondary",
    customer: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Users & Roles</h1>
        <p className="text-muted-foreground text-sm mt-1">All platform members across organizations.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Users size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No members yet.</p>
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
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={`${m.user_id}-${i}`} className="border-t border-border">
                    <td className="px-4 py-3 text-sm font-medium">{m.display_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{m.org_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[m.role] || ""}`}>
                        {m.role.replace("_", " ")}
                      </span>
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

export default SuperAdminDashboard;
