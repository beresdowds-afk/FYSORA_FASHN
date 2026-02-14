import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; business_name: string | null } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, business_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <span className="font-heading font-bold text-lg">Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center">
              <User size={28} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl">
                Welcome, {profile?.display_name || user.email}
              </h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Orders", value: "0", desc: "Active orders" },
              { label: "Revenue", value: "$0", desc: "This month" },
              { label: "Customers", value: "0", desc: "Total customers" },
              { label: "Products", value: "0", desc: "Listed items" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="font-heading font-bold text-3xl mt-1">{stat.value}</p>
                <p className="text-muted-foreground text-xs mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
