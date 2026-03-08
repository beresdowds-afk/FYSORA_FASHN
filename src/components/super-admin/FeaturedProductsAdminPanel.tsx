import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Star, Settings, Trash2, Save, Loader2, Users, DollarSign, Eye } from "lucide-react";
import { motion } from "framer-motion";
import type { SlotConfig } from "@/hooks/useFeaturedSlots";

export default function FeaturedProductsAdminPanel() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<SlotConfig[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editConfigs, setEditConfigs] = useState<Record<string, Partial<SlotConfig>>>({});

  const fetchData = async () => {
    setLoading(true);
    const [configRes, slotsRes] = await Promise.all([
      supabase.from("featured_slot_config" as any).select("*").order("role"),
      supabase.from("featured_product_slots" as any).select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(50),
    ]);
    setConfigs((configRes.data || []) as any);
    setSlots((slotsRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfigChange = (id: string, field: string, value: any) => {
    setEditConfigs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveConfig = async (id: string) => {
    const updates = editConfigs[id];
    if (!updates) return;
    setSaving(true);
    const { error } = await supabase
      .from("featured_slot_config" as any)
      .update(updates as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Config updated" });
      setEditConfigs(prev => { const n = { ...prev }; delete n[id]; return n; });
      await fetchData();
    }
    setSaving(false);
  };

  const handleDeactivateSlot = async (slotId: string) => {
    await supabase.from("featured_product_slots" as any).update({ is_active: false } as any).eq("id", slotId);
    toast({ title: "Slot deactivated" });
    fetchData();
  };

  // Stats
  const totalFreeSlots = slots.filter(s => s.slot_type === "free").length;
  const totalPaidSlots = slots.filter(s => s.slot_type === "paid").length;
  const totalRevenue = slots.filter(s => s.slot_type === "paid").reduce((sum: number, s: any) => sum + (s.amount_paid || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Star size={22} className="text-primary" /> Featured Products & Subscriptions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage slot configurations, view active featured products, and track revenue.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Star, label: "Total Active Slots", value: slots.length, color: "text-primary", bg: "bg-primary/10" },
          { icon: Users, label: "Free Slots Used", value: totalFreeSlots, color: "text-secondary", bg: "bg-secondary/10" },
          { icon: DollarSign, label: "Paid Slots", value: totalPaidSlots, color: "text-accent", bg: "bg-accent/10" },
          { icon: DollarSign, label: "Slot Revenue", value: `$${totalRevenue}`, color: "text-green-600", bg: "bg-green-500/10" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="font-heading font-bold text-xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Slot Configuration */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          <Settings size={16} className="text-muted-foreground" /> Slot Configuration
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {configs.map(cfg => {
            const edits = editConfigs[cfg.id] || {};
            const current = { ...cfg, ...edits };
            return (
              <Card key={cfg.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-sm capitalize">{cfg.role === "org_admin" ? "Organizations" : "Designers"}</Badge>
                  <Badge className={cfg.is_active ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"}>
                    {cfg.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Free Slots / Period</Label>
                    <Input
                      type="number"
                      value={current.free_slots_per_period}
                      onChange={e => handleConfigChange(cfg.id, "free_slots_per_period", parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Period (weeks)</Label>
                    <Input
                      type="number"
                      value={current.period_weeks}
                      onChange={e => handleConfigChange(cfg.id, "period_weeks", parseInt(e.target.value) || 1)}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Paid Slot Price ($)</Label>
                    <Input
                      type="number"
                      value={current.paid_slot_price}
                      onChange={e => handleConfigChange(cfg.id, "paid_slot_price", parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div className="flex items-end">
                    {editConfigs[cfg.id] && (
                      <Button variant="hero" size="sm" className="w-full" onClick={() => handleSaveConfig(cfg.id)} disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Featured Slots */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          <Eye size={16} className="text-muted-foreground" /> Active Featured Slots ({slots.length})
        </h3>
        {slots.length === 0 ? (
          <Card className="p-8 text-center">
            <Star size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No active featured product slots.</p>
          </Card>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Week</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot: any) => (
                    <tr key={slot.id} className="border-t border-border">
                      <td className="px-4 py-3 text-sm capitalize">{slot.user_role}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{slot.week_start} → {slot.week_end}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] ${slot.slot_type === "free" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary"}`}>
                          {slot.slot_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">${slot.amount_paid || 0}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(slot.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeactivateSlot(slot.id)}>
                          <Trash2 size={14} />
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
    </motion.div>
  );
}
