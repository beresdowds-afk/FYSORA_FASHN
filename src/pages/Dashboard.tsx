import { useAuth } from "@/contexts/AuthContext";
import { useCurrentOrg, useOrgMembers, type AppRole } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Users, Settings, BarChart3, ShoppingBag, Palette, Plus, Trash2, Shield, Package } from "lucide-react";
import OrdersTab from "@/components/orders/OrdersTab";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useUserGlobalRole } from "@/hooks/useOrganization";

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  tailor: "Tailor",
  customer: "Customer",
};

const roleColors: Record<AppRole, string> = {
  super_admin: "bg-accent text-accent-foreground",
  org_admin: "bg-primary text-primary-foreground",
  tailor: "bg-secondary text-secondary-foreground",
  customer: "bg-muted text-muted-foreground",
};

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentOrg, role, loading: orgLoading } = useCurrentOrg();
  const { isSuperAdmin } = useUserGlobalRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "members" | "settings">("overview");

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
    if (!authLoading && !orgLoading && user && !currentOrg && !isSuperAdmin) {
      navigate("/create-organization");
    }
  }, [authLoading, orgLoading, user, currentOrg, isSuperAdmin, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Super admin without an org - show a simplified view
  if (!currentOrg && isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
              </div>
              <span className="font-heading font-bold text-sm">Fashion Stitches Africa</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")}>Super Admin Panel</Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut size={16} /></Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 lg:px-8 py-12 text-center">
          <h2 className="font-heading font-bold text-2xl mb-4">Welcome, Super Admin</h2>
          <p className="text-muted-foreground mb-6">You can manage the platform or create an organization.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="hero" onClick={() => navigate("/super-admin")}>Go to Super Admin Panel</Button>
            <Button variant="heroOutline" onClick={() => navigate("/create-organization")}>Create Organization</Button>
          </div>
        </main>
      </div>
    );
  }

  if (!currentOrg) return null;

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
              <span className="font-heading font-bold text-sm">{currentOrg.name}</span>
              <div className="flex items-center gap-2">
                {role && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[role]}`}>
                    {roleLabels[role]}
                  </span>
                )}
                {isSuperAdmin && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors.super_admin}`}>
                    Super Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")} className="text-xs">
                <Shield size={14} className="mr-1" /> Admin Panel
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.display_name || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="container mx-auto px-4 lg:px-8 py-6 flex gap-6">
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col w-56 shrink-0 gap-1">
          {[
            { id: "overview" as const, icon: BarChart3, label: "Overview" },
            { id: "orders" as const, icon: Package, label: "Orders" },
            { id: "members" as const, icon: Users, label: "Team Members" },
            { id: "settings" as const, icon: Settings, label: "Settings" },
          ].map((item) => (
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

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile tabs */}
          <div className="flex md:hidden gap-2 mb-6 overflow-x-auto">
            {["overview", "orders", "members", "settings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "overview" && <OverviewTab org={currentOrg} role={role} />}
          {activeTab === "orders" && <OrdersTab orgId={currentOrg.id} currency={currentOrg.currency || "NGN"} role={role} />}
          {activeTab === "members" && <MembersTab orgId={currentOrg.id} role={role} />}
          {activeTab === "settings" && <SettingsTab org={currentOrg} role={role} />}
        </main>
      </div>
    </div>
  );
};

const OverviewTab = ({ org, role }: { org: any; role: AppRole | null }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <h2 className="font-heading font-bold text-2xl mb-6">Dashboard Overview</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { icon: ShoppingBag, label: "Orders", value: "0", desc: "Active orders", color: "text-primary" },
        { icon: Users, label: "Customers", value: "0", desc: "Total customers", color: "text-secondary" },
        { icon: Palette, label: "Products", value: "0", desc: "Listed items", color: "text-accent" },
        { icon: BarChart3, label: "Revenue", value: `0 ${org.currency || "NGN"}`, desc: "This month", color: "text-primary" },
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

    <div className="rounded-xl bg-card border border-border p-6">
      <h3 className="font-heading font-semibold text-lg mb-2">Welcome to {org.name}</h3>
      <p className="text-muted-foreground text-sm">
        {role === "org_admin"
          ? "As an Organization Admin, you can manage team members, settings, and orders."
          : role === "tailor"
          ? "View and manage your assigned orders and production workflow."
          : "Browse and place orders with your favorite tailors."}
      </p>
    </div>
  </motion.div>
);

const MembersTab = ({ orgId, role }: { orgId: string; role: AppRole | null }) => {
  const { members, loading, updateMemberRole, removeMember } = useOrgMembers(orgId);
  const { toast } = useToast();
  const canManage = role === "org_admin" || role === "super_admin";

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
          <Button variant="hero" size="sm">
            <Plus size={16} className="mr-1" /> Invite Member
          </Button>
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
  const [saving, setSaving] = useState(false);
  const canEdit = role === "org_admin" || role === "super_admin";

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ name, email, phone, address })
      .eq("id", org.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading font-bold text-2xl mb-6">Organization Settings</h2>
      <div className="rounded-xl bg-card border border-border p-6 max-w-lg space-y-4">
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
        <div className="flex items-center gap-3 pt-2">
          <div className="text-sm text-muted-foreground">
            Currency: <span className="font-medium text-foreground">{org.currency}</span> · 
            Country: <span className="font-medium text-foreground">{org.country}</span>
          </div>
        </div>
        {canEdit && (
          <Button variant="hero" onClick={handleSave} disabled={saving} className="mt-2">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
