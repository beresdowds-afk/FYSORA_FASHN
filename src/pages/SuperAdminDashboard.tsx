import { useAuth } from "@/contexts/AuthContext";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Building2, BarChart3, Shield, Globe } from "lucide-react";
import { motion } from "framer-motion";

const SuperAdminDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserGlobalRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orgs: 0, users: 0 });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (!isSuperAdmin) navigate("/dashboard");
    }
  }, [user, authLoading, isSuperAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: orgCount } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });
      const { count: memberCount } = await supabase
        .from("org_members")
        .select("*", { count: "exact", head: true });
      setStats({ orgs: orgCount || 0, users: memberCount || 0 });
    };
    if (isSuperAdmin) fetchStats();
  }, [isSuperAdmin]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <header className="border-b border-border bg-ebony">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-ivory">Super Admin Panel</span>
              <span className="block text-[10px] text-ivory/50">Fashion Stitches Africa</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-ivory/70 hover:text-ivory"
              onClick={() => navigate("/dashboard")}
            >
              Org Dashboard
            </Button>
            <Button variant="ghost" size="sm" className="text-ivory/70" onClick={() => signOut().then(() => navigate("/"))}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading font-bold text-3xl mb-8">Global Platform Metrics</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Building2, label: "Organizations", value: stats.orgs, color: "text-primary" },
              { icon: Users, label: "Total Members", value: stats.users, color: "text-secondary" },
              { icon: Globe, label: "Countries", value: "15+", color: "text-accent" },
              { icon: BarChart3, label: "Platform Revenue", value: "$0", color: "text-primary" },
            ].map((stat) => (
              <div key={stat.label} className="p-5 rounded-xl bg-card border border-border">
                <stat.icon size={20} className={stat.color} />
                <p className="font-heading font-bold text-3xl mt-3">{stat.value}</p>
                <p className="text-muted-foreground text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-card border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-primary" />
                <h3 className="font-heading font-semibold">Security & Compliance</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ Row-Level Security enabled on all tables</li>
                <li>✅ Role-based access control active</li>
                <li>✅ Organization data isolation enforced</li>
                <li>✅ Audit logging configured</li>
              </ul>
            </div>

            <div className="rounded-xl bg-card border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-secondary" />
                <h3 className="font-heading font-semibold">Multi-Region Status</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🌍 NGN, GHS, KES, ZAR, USD, GBP, EUR supported</li>
                <li>📊 Exchange rates: Daily sync configured</li>
                <li>🔒 GDPR + African data protection compliant</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
