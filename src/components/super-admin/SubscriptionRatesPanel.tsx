import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Users, Scissors, Building2, Save, Plus, Trash2,
  Edit2, Loader2, CheckCircle2, Crown, Palette, Ruler, Video,
  Sparkles, Bell, Package, Heart, MessageSquare, Shield, Eye,
  Globe, ExternalLink
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

interface SubscriptionRate {
  id: string;
  role_type: string;
  plan_name: string;
  price_amount: number;
  price_currency: string;
  billing_cycle: string;
  description: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const ROLE_META: Record<string, { icon: any; color: string; label: string }> = {
  customer: { icon: Users, color: "bg-secondary/10 text-secondary", label: "Customers" },
  tailor: { icon: Scissors, color: "bg-primary/10 text-primary", label: "Tailors" },
  designer: { icon: Palette, color: "bg-chart-4/10 text-chart-4", label: "Designers" },
  org_native_basic: { icon: Building2, color: "bg-accent/10 text-accent-foreground", label: "Orgs (Native Basic)" },
  org_native_custom: { icon: Globe, color: "bg-chart-2/10 text-chart-2", label: "Orgs (Native Custom)" },
  org_external: { icon: ExternalLink, color: "bg-chart-5/10 text-chart-5", label: "Orgs (External Site)" },
};



const CUSTOMER_PREMIUM_FEATURES = [
  { key: "ai_measurements", icon: Ruler, label: "AI Body Measurements", desc: "Video-based precise body measurements using AI detection", category: "core" },
  { key: "virtual_tryon", icon: Sparkles, label: "Virtual Try-On", desc: "See garments on your body using FASHN AI engine", category: "core" },
  { key: "video_consultations", icon: Video, label: "Video Consultations", desc: "Live video sessions with tailors for fittings", category: "core" },
  { key: "smart_notifications", icon: Bell, label: "Smart Notifications", desc: "Order updates via email, SMS & WhatsApp channels", category: "communication" },
  { key: "priority_tracking", icon: Package, label: "Priority Order Tracking", desc: "Real-time order status & delivery tracking", category: "logistics" },
  { key: "premium_catalogue", icon: Heart, label: "Premium Catalogue Access", desc: "Browse exclusive collections & wishlists", category: "access" },
  { key: "direct_messaging", icon: MessageSquare, label: "Direct Messaging", desc: "Chat directly with tailors & organizations", category: "communication" },
  { key: "dispute_resolution", icon: Shield, label: "Dispute Resolution", desc: "AI-powered dispute mediation support", category: "support" },
];

const emptyRate: Omit<SubscriptionRate, "id" | "created_at" | "updated_at"> = {
  role_type: "customer",
  plan_name: "",
  price_amount: 0,
  price_currency: "USD",
  billing_cycle: "yearly",
  description: null,
  features: [],
  is_active: true,
  sort_order: 0,
};

export default function SubscriptionRatesPanel() {
  const { toast } = useToast();
  const [rates, setRates] = useState<SubscriptionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Partial<SubscriptionRate> | null>(null);
  const [featuresText, setFeaturesText] = useState("");

  const fetchRates = async () => {
    const { data, error } = await supabase
      .from("subscription_rates" as any)
      .select("*")
      .order("role_type")
      .order("sort_order");
    if (!error) setRates((data || []) as unknown as SubscriptionRate[]);
    setLoading(false);
  };

  useEffect(() => { fetchRates(); }, []);

  const openCreate = () => {
    setEditingRate({ ...emptyRate });
    setFeaturesText("");
    setEditDialogOpen(true);
  };

  const openEdit = (rate: SubscriptionRate) => {
    setEditingRate({ ...rate });
    setFeaturesText((rate.features || []).join("\n"));
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingRate?.plan_name?.trim()) {
      toast({ title: "Plan name required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const features = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
    const payload = {
      role_type: editingRate.role_type,
      plan_name: editingRate.plan_name,
      price_amount: editingRate.price_amount || 0,
      price_currency: editingRate.price_currency || "USD",
      billing_cycle: editingRate.billing_cycle || "yearly",
      description: editingRate.description || null,
      features,
      is_active: editingRate.is_active ?? true,
      sort_order: editingRate.sort_order || 0,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingRate.id) {
      ({ error } = await supabase
        .from("subscription_rates" as any)
        .update(payload as any)
        .eq("id", editingRate.id));
    } else {
      ({ error } = await supabase
        .from("subscription_rates" as any)
        .insert(payload as any));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingRate.id ? "Rate updated" : "Rate created" });
      setEditDialogOpen(false);
      setEditingRate(null);
      await fetchRates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("subscription_rates" as any)
      .delete()
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Rate deleted" });
      await fetchRates();
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase
      .from("subscription_rates" as any)
      .update({ is_active, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    await fetchRates();
  };

  const groupedRates = rates.reduce<Record<string, SubscriptionRate[]>>((acc, r) => {
    if (!acc[r.role_type]) acc[r.role_type] = [];
    acc[r.role_type].push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Crown size={22} className="text-primary" /> Subscription Rates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscription pricing for all roles and organization website tiers.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1" /> Add Rate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const Icon = meta.icon;
          const count = groupedRates[role]?.length || 0;
          const active = groupedRates[role]?.filter(r => r.is_active).length || 0;
          return (
            <div key={role} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                  <Icon size={16} />
                </div>
                <span className="font-heading font-semibold text-xs">{meta.label}</span>
              </div>
              <p className="text-2xl font-heading font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{active} active</p>
            </div>
          );
        })}
      </div>

      {/* Customer Premium Features Exposure */}
      <div className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-primary/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crown size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-sm">Customer Premium Features ($10/year)</h3>
            <p className="text-xs text-muted-foreground">All features included with the customer premium subscription</p>
          </div>
          <Badge className="bg-secondary/15 text-secondary text-xs">{CUSTOMER_PREMIUM_FEATURES.length} features</Badge>
        </div>
        <div className="divide-y divide-border">
          {CUSTOMER_PREMIUM_FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <div key={feature.key} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FeatureIcon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{feature.label}</p>
                    <Badge variant="outline" className="text-[9px] capitalize">{feature.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-secondary/10 text-secondary text-[10px]">
                    <CheckCircle2 size={10} className="mr-1" /> Included
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <Eye size={12} className="inline mr-1" />
            These features are gated behind the customer premium subscription. Customers must subscribe to access them. Manage pricing in the Subscription Rates section above.
          </p>
        </div>
      </div>

      {/* Rates by role */}
      {Object.entries(ROLE_META).map(([role, meta]) => {
        const Icon = meta.icon;
        const roleRates = groupedRates[role] || [];
        return (
          <div key={role} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Icon size={16} className="text-primary" />
              <h3 className="font-heading font-semibold text-sm">{meta.label} Plans</h3>
              <Badge variant="outline" className="ml-auto text-xs">{roleRates.length} plan{roleRates.length !== 1 ? "s" : ""}</Badge>
            </div>
            {roleRates.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No plans configured for {meta.label}.
                <Button variant="outline" size="sm" className="ml-2" onClick={() => { setEditingRate({ ...emptyRate, role_type: role }); setFeaturesText(""); setEditDialogOpen(true); }}>
                  Add Plan
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {roleRates.map((rate) => (
                  <div key={rate.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{rate.plan_name}</p>
                        {!rate.is_active && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
                      </div>
                      {rate.description && <p className="text-xs text-muted-foreground mt-0.5">{rate.description}</p>}
                      {rate.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rate.features.slice(0, 4).map((f, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f}</span>
                          ))}
                          {rate.features.length > 4 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{rate.features.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-heading font-bold text-lg">
                        {rate.price_currency === "USD" ? "$" : rate.price_currency}{" "}
                        {rate.price_amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">/{rate.billing_cycle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rate.is_active}
                        onCheckedChange={(v) => handleToggle(rate.id, v)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rate)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rate.id)} className="text-destructive hover:text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRate?.id ? "Edit" : "Create"} Subscription Rate</DialogTitle>
          </DialogHeader>
          {editingRate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role Type</Label>
                  <Select value={editingRate.role_type} onValueChange={(v) => setEditingRate({ ...editingRate, role_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="tailor">Tailor</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="org_native_basic">Org – Native Basic Website</SelectItem>
                      <SelectItem value="org_native_custom">Org – Native Custom Website</SelectItem>
                      <SelectItem value="org_external">Org – External Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input
                    value={editingRate.plan_name || ""}
                    onChange={(e) => setEditingRate({ ...editingRate, plan_name: e.target.value })}
                    placeholder="e.g. Premium Access"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={editingRate.price_amount || 0}
                    onChange={(e) => setEditingRate({ ...editingRate, price_amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={editingRate.price_currency || "USD"} onValueChange={(v) => setEditingRate({ ...editingRate, price_currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                      <SelectItem value="GHS">GHS</SelectItem>
                      <SelectItem value="KES">KES</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select value={editingRate.billing_cycle || "yearly"} onValueChange={(v) => setEditingRate({ ...editingRate, billing_cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingRate.description || ""}
                  onChange={(e) => setEditingRate({ ...editingRate, description: e.target.value })}
                  placeholder="Brief plan description"
                />
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={"AI Body Measurements\nVirtual Try-On\nPriority Support"}
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editingRate.sort_order || 0}
                    onChange={(e) => setEditingRate({ ...editingRate, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={editingRate.is_active ?? true}
                    onCheckedChange={(v) => setEditingRate({ ...editingRate, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
              {editingRate?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
