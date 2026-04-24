import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Smartphone, Download, Copy, Check, Settings, Shield,
  Globe, Bell, ExternalLink, Share2, Users, Search,
  Building2, DollarSign, Palette, Package, Eye, EyeOff,
  RefreshCw, Save, Trash2
} from "lucide-react";

interface AppUser {
  user_id: string;
  display_name: string | null;
  role: string;
  org_name: string;
  joined_at: string;
  is_active: boolean;
}

interface OrgAppConfig {
  id: string;
  org_id: string;
  org_name?: string;
  app_name: string;
  app_description: string | null;
  theme_color: string;
  is_generated: boolean;
  is_published: boolean;
  is_public_deployment: boolean;
  api_access_enabled: boolean;
  app_store_url: string | null;
  generation_fee: number;
  generation_currency: string;
  monthly_maintenance_fee: number;
  payment_status: string;
  download_count: number;
  last_generated_at: string | null;
  created_at: string;
}

interface FeeSetting {
  id: string;
  fee_type: string;
  generation_fee: number;
  monthly_fee: number;
  currency: string;
  is_active: boolean;
  description: string | null;
}

const MobileAppManagementPanel = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "users" | "org-apps" | "fees">("overview");

  const installUrl = `${window.location.origin}/install`;
  const portalUrl = `${window.location.origin}/portal`;
  const browseUrl = `${window.location.origin}/browse`;

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: `${label} link copied!` });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)",
        text: "Download FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) – The operating system for African fashion commerce",
        url: installUrl,
      });
    } else {
      copyLink(installUrl, "Install");
    }
  };

  const sections = [
    { id: "overview" as const, icon: Smartphone, label: "Overview" },
    { id: "users" as const, icon: Users, label: "App Users" },
    { id: "org-apps" as const, icon: Package, label: "Org Apps" },
    { id: "fees" as const, icon: DollarSign, label: "Fee Management" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Mobile App Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the FSA platform app, organization apps, users, and fees.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(s => (
          <Button
            key={s.id}
            variant={activeSection === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(s.id)}
            className="gap-1.5"
          >
            <s.icon size={14} />
            {s.label}
          </Button>
        ))}
      </div>

      {activeSection === "overview" && (
        <OverviewSection
          installUrl={installUrl}
          portalUrl={portalUrl}
          browseUrl={browseUrl}
          copied={copied}
          copyLink={copyLink}
          shareLink={shareLink}
        />
      )}
      {activeSection === "users" && <AppUsersSection />}
      {activeSection === "org-apps" && <OrgAppsSection />}
      {activeSection === "fees" && <FeeManagementSection />}
    </motion.div>
  );
};

/* ─── Overview Section ─── */
const OverviewSection = ({
  installUrl, portalUrl, browseUrl, copied, copyLink, shareLink
}: {
  installUrl: string; portalUrl: string; browseUrl: string;
  copied: boolean; copyLink: (u: string, l: string) => void; shareLink: () => void;
}) => (
  <div className="space-y-6">
    {/* App Status */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { icon: Smartphone, label: "App Status", value: "Live", color: "text-secondary", badge: "bg-secondary/10 text-secondary" },
        { icon: Globe, label: "Platform", value: "PWA (Android + iOS)", color: "text-primary", badge: "bg-primary/10 text-primary" },
        { icon: Shield, label: "Version", value: "1.0.0", color: "text-accent", badge: "bg-accent/10 text-accent-foreground" },
      ].map(s => (
        <div key={s.label} className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <s.icon size={16} className={s.color} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
          <Badge className={`${s.badge} text-xs`}>{s.value}</Badge>
        </div>
      ))}
    </div>

    {/* Shareable Download Link */}
    <div className="rounded-xl bg-card border border-primary/20 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Download size={18} className="text-primary" />
        <h3 className="font-heading font-semibold">Shareable Download Link</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Share this link with users to install FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) on their mobile devices.
      </p>
      <div className="flex gap-2 mb-4">
        <Input value={installUrl} readOnly className="font-mono text-sm" />
        <Button variant="outline" size="sm" onClick={() => copyLink(installUrl, "Install")}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
        <Button variant="hero" size="sm" onClick={shareLink}>
          <Share2 size={14} className="mr-1" /> Share
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => copyLink(portalUrl, "Customer Portal")}>
          Customer Portal Link
        </Button>
        <Button variant="outline" size="sm" onClick={() => copyLink(browseUrl, "Browse")}>
          Browse Organizations Link
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.open(installUrl, "_blank")}>
          <ExternalLink size={14} className="mr-1" /> Preview
        </Button>
      </div>
    </div>

    {/* App Configuration */}
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={18} className="text-primary" />
        <h3 className="font-heading font-semibold">App Configuration</h3>
      </div>
      <div className="space-y-5">
        {[
          { label: "Push Notifications", desc: "Enable browser push notifications for mobile users" },
          { label: "Offline Mode", desc: "Allow app to work offline with cached data" },
          { label: "Auto-Update", desc: "Automatically update app when new version is available" },
          { label: "Customer Self-Registration", desc: "Allow customers to browse and join organizations" },
          { label: "Inter-User Video Calls", desc: "Enable WebRTC video consultations between users" },
        ].map(c => (
          <div key={c.label} className="flex items-center justify-between">
            <div>
              <Label className="font-medium">{c.label}</Label>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <Switch defaultChecked />
          </div>
        ))}
      </div>
    </div>

    {/* User Access Roles */}
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} className="text-accent" />
        <h3 className="font-heading font-semibold">User Access Roles (Mobile)</h3>
      </div>
      <div className="space-y-3">
        {[
          { role: "Customer", features: "Browse orgs, view catalogue, place orders, track orders, AI measurements, virtual try-on, video calls, payments", color: "bg-muted" },
          { role: "Tailor", features: "View assigned orders, update status, upload photos, chat with org, view contracts, earnings", color: "bg-secondary/10" },
          { role: "Org Admin", features: "Full dashboard, order management, team management, billing, communications, logistics", color: "bg-primary/10" },
        ].map(r => (
          <div key={r.role} className={`rounded-lg ${r.color} p-4`}>
            <p className="font-heading font-semibold text-sm mb-1">{r.role}</p>
            <p className="text-xs text-muted-foreground">{r.features}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── App Users Section ─── */
const AppUsersSection = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, customers: 0, tailors: 0, admins: 0 });

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("org_members")
        .select("user_id, role, is_active, joined_at, organizations(name)")
        .order("joined_at", { ascending: false })
        .limit(200);

      if (data) {
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p.display_name]) || []);

        const mapped: AppUser[] = data.map((m: any) => ({
          user_id: m.user_id,
          display_name: profileMap.get(m.user_id) || "Unknown",
          role: m.role,
          org_name: m.organizations?.name || "—",
          joined_at: m.joined_at,
          is_active: m.is_active,
        }));

        setUsers(mapped);
        setStats({
          total: mapped.length,
          customers: mapped.filter(u => u.role === "customer").length,
          tailors: mapped.filter(u => u.role === "tailor").length,
          admins: mapped.filter(u => u.role === "org_admin" || u.role === "manager").length,
        });
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || 
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.org_name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleColors: Record<string, string> = {
    org_admin: "bg-primary/10 text-primary",
    manager: "bg-primary/10 text-primary",
    tailor: "bg-secondary/10 text-secondary",
    customer: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "text-primary" },
          { label: "Customers", value: stats.customers, icon: Users, color: "text-muted-foreground" },
          { label: "Tailors", value: stats.tailors, icon: Users, color: "text-secondary" },
          { label: "Org Admins", value: stats.admins, icon: Shield, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-4">
            <s.icon size={16} className={`${s.color} mb-2`} />
            <p className="font-heading font-bold text-xl">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users or organizations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "customer", "tailor", "org_admin", "manager"].map(r => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? "default" : "outline"}
              onClick={() => setRoleFilter(r)}
              className="text-xs capitalize"
            >
              {r === "all" ? "All" : r.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : filtered.map((u, i) => (
                  <tr key={`${u.user_id}-${i}`} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(u.display_name || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{u.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{u.org_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] || "bg-muted text-muted-foreground"}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.is_active ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Org Apps Section ─── */
const OrgAppsSection = () => {
  const { toast } = useToast();
  const [orgApps, setOrgApps] = useState<OrgAppConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgApps = async () => {
      const { data } = await supabase
        .from("org_app_configs")
        .select("*, organizations(name)")
        .order("created_at", { ascending: false });

      setOrgApps(
        (data || []).map((d: any) => ({
          ...d,
          org_name: d.organizations?.name || "Unknown",
        }))
      );
      setLoading(false);
    };
    fetchOrgApps();
  }, []);

  const togglePublish = async (id: string, current: boolean) => {
    await supabase
      .from("org_app_configs")
      .update({ is_published: !current })
      .eq("id", id);
    setOrgApps(prev => prev.map(a => a.id === id ? { ...a, is_published: !current } : a));
    toast({ title: !current ? "App published" : "App unpublished" });
  };

  const markAsPaid = async (id: string) => {
    // Check for exemption
    const { data: exemption } = await supabase
      .from("org_fee_exemptions")
      .select("id")
      .eq("org_id", orgApps.find(a => a.id === id)?.org_id || "")
      .eq("exemption_type", "mobile_app")
      .eq("is_active", true)
      .maybeSingle();

    if (exemption) {
      await supabase.from("org_app_configs").update({ 
        payment_status: "paid", 
        generation_fee: 0, 
        monthly_maintenance_fee: 0 
      }).eq("id", id);
      setOrgApps(prev => prev.map(a => a.id === id ? { ...a, payment_status: "paid", generation_fee: 0, monthly_maintenance_fee: 0 } : a));
      toast({ title: "App marked as paid (exempt)" });
    }
  };

  const generateApp = async (id: string, orgId: string) => {
    // Auto-pull assets from org website and organization data
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name, slug, description, logo_url, currency, country")
      .eq("id", orgId)
      .single();

    const { data: websiteData } = await supabase
      .from("org_websites")
      .select("brand_color, accent_color, hero_image_url, tagline, hero_description, instagram_url, whatsapp_number")
      .eq("org_id", orgId)
      .single();

    const { data: catalogueCount } = await supabase
      .from("org_catalogue_items")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_available", true);

    // Auto-populate app config from website assets
    const autoUpdates: Record<string, any> = {
      is_generated: true,
      last_generated_at: new Date().toISOString(),
    };

    if (orgData) {
      autoUpdates.app_name = orgData.name;
      autoUpdates.app_description = orgData.description || `Official app for ${orgData.name}`;
      if (websiteData) {
        autoUpdates.theme_color = (websiteData as any).brand_color || "#8B5CF6";
        autoUpdates.icon_url = orgData.logo_url || null;
      }
    }

    await supabase
      .from("org_app_configs")
      .update(autoUpdates)
      .eq("id", id);

    setOrgApps(prev => prev.map(a => a.id === id ? { ...a, ...autoUpdates } : a));
    
    const itemCount = catalogueCount ? (catalogueCount as any).length || 0 : 0;
    toast({ 
      title: "App generated successfully",
      description: `Auto-integrated ${orgData?.name || "org"} website assets${itemCount > 0 ? ` with ${itemCount} catalogue items` : ""}.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-lg">Organization Apps</h2>
          <p className="text-xs text-muted-foreground">Auto-generated branded apps that pull assets (logo, colors, catalogue, description) from each org's website</p>
        </div>
        <Badge className="bg-primary/10 text-primary">{orgApps.length} apps</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orgApps.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Package size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No organization apps configured yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Organizations can request app generation from their dashboard.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orgApps.map(app => (
            <div key={app.id} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: app.theme_color + "20" }}>
                    <Smartphone size={18} style={{ color: app.theme_color }} />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm">{app.app_name}</p>
                    <p className="text-xs text-muted-foreground">{app.org_name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={app.payment_status === "paid" ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}>
                    {app.payment_status}
                  </Badge>
                  <Badge className={app.is_generated ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}>
                    {app.is_generated ? "Generated" : "Pending"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs mb-4">
                <div>
                  <span className="text-muted-foreground">Generation Fee</span>
                  <p className="font-medium">${app.generation_fee} {app.generation_currency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly Fee</span>
                  <p className="font-medium">${app.monthly_maintenance_fee}/mo</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Downloads</span>
                  <p className="font-medium">{app.download_count}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {!app.is_generated && app.payment_status === "paid" && (
                  <Button size="sm" variant="hero" onClick={() => generateApp(app.id, app.org_id)} className="gap-1">
                    <RefreshCw size={12} /> Generate App
                  </Button>
                )}
                {app.is_generated && (
                  <Button size="sm" variant="outline" onClick={() => togglePublish(app.id, app.is_published)} className="gap-1">
                    {app.is_published ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
                  </Button>
                )}
                {app.is_generated && (
                  <Button
                    size="sm"
                    variant={app.is_public_deployment ? "destructive" : "default"}
                    onClick={async () => {
                      const newVal = !app.is_public_deployment;
                      await supabase.from("org_app_configs").update({
                        is_public_deployment: newVal,
                        ...(newVal ? { public_deployment_approved_at: new Date().toISOString() } : {}),
                      } as any).eq("id", app.id);
                      setOrgApps(prev => prev.map(a => a.id === app.id ? { ...a, is_public_deployment: newVal } : a));
                      toast({ title: newVal ? "Public deployment enabled" : "Public deployment disabled" });
                    }}
                    className="gap-1"
                  >
                    {app.is_public_deployment ? <><EyeOff size={12} /> Revoke Public</> : <><Globe size={12} /> Deploy Public</>}
                  </Button>
                )}
                {app.is_generated && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const newVal = !app.api_access_enabled;
                      await supabase.from("org_app_configs").update({ api_access_enabled: newVal } as any).eq("id", app.id);
                      setOrgApps(prev => prev.map(a => a.id === app.id ? { ...a, api_access_enabled: newVal } : a));
                      toast({ title: newVal ? "API access enabled" : "API access disabled" });
                    }}
                    className="gap-1"
                  >
                    <Settings size={12} /> {app.api_access_enabled ? "Disable API" : "Enable API"}
                  </Button>
                )}
                {app.is_published && (
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/install?org=${app.org_id}`);
                    toast({ title: "Download link copied!" });
                  }} className="gap-1">
                    <Copy size={12} /> Copy Link
                  </Button>
                )}
              </div>
              {/* Deployment status badges */}
              <div className="flex gap-2 mt-3">
                <Badge className={app.is_public_deployment ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}>
                  {app.is_public_deployment ? "🌍 Public" : "🔒 Internal Only"}
                </Badge>
                {app.api_access_enabled && (
                  <Badge className="bg-primary/10 text-primary">API Enabled</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Fee Management Section ─── */
const FeeManagementSection = () => {
  const { toast } = useToast();
  const [fees, setFees] = useState<FeeSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      const { data } = await supabase
        .from("app_fee_settings")
        .select("*")
        .order("created_at", { ascending: true });
      setFees(data as FeeSetting[] || []);
      setLoading(false);
    };
    fetchFees();
  }, []);

  const updateFee = async (id: string, updates: Partial<FeeSetting>) => {
    const { error } = await supabase
      .from("app_fee_settings")
      .update(updates as any)
      .eq("id", id);
    if (!error) {
      setFees(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      toast({ title: "Fee updated successfully" });
    } else {
      toast({ title: "Failed to update fee", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-lg">App Fee Management</h2>
        <p className="text-xs text-muted-foreground">Configure fees for organization app generation and maintenance</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {fees.map(fee => (
            <FeeCard key={fee.id} fee={fee} onUpdate={updateFee} />
          ))}
        </div>
      )}
    </div>
  );
};

const FeeCard = ({ fee, onUpdate }: { fee: FeeSetting; onUpdate: (id: string, updates: Partial<FeeSetting>) => void }) => {
  const [genFee, setGenFee] = useState(fee.generation_fee.toString());
  const [monthlyFee, setMonthlyFee] = useState(fee.monthly_fee.toString());
  const [editing, setEditing] = useState(false);

  const save = () => {
    onUpdate(fee.id, {
      generation_fee: parseFloat(genFee) || 0,
      monthly_fee: parseFloat(monthlyFee) || 0,
    });
    setEditing(false);
  };

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-primary" />
            <h3 className="font-heading font-semibold text-sm capitalize">
              {fee.fee_type.replace(/_/g, " ")}
            </h3>
          </div>
          {fee.description && (
            <p className="text-xs text-muted-foreground mt-1">{fee.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={fee.is_active}
            onCheckedChange={(checked) => onUpdate(fee.id, { is_active: checked })}
          />
          <span className="text-xs text-muted-foreground">{fee.is_active ? "Active" : "Inactive"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Generation Fee ({fee.currency})</Label>
          {editing ? (
            <Input
              value={genFee}
              onChange={e => setGenFee(e.target.value)}
              type="number"
              step="0.01"
              className="mt-1 text-sm"
            />
          ) : (
            <p className="font-heading font-bold text-lg mt-1">${fee.generation_fee}</p>
          )}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Monthly Fee ({fee.currency})</Label>
          {editing ? (
            <Input
              value={monthlyFee}
              onChange={e => setMonthlyFee(e.target.value)}
              type="number"
              step="0.01"
              className="mt-1 text-sm"
            />
          ) : (
            <p className="font-heading font-bold text-lg mt-1">${fee.monthly_fee}/mo</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {editing ? (
          <>
            <Button size="sm" variant="hero" onClick={save} className="gap-1">
              <Save size={12} /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1">
            <Palette size={12} /> Edit Fees
          </Button>
        )}
      </div>
    </div>
  );
};

export default MobileAppManagementPanel;
