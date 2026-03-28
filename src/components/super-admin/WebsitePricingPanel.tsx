import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Globe,
  TrendingUp,
  Crown,
  DollarSign,
  Edit3,
  RefreshCw,
  Zap,
  CheckCircle2,
  Plus,
  History,
  X,
  Eye,
  Copy,
  ToggleLeft,
  ToggleRight,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";

interface Feature {
  name: string;
  enabled: boolean;
  category: "basic" | "advanced" | "premium";
}

interface PricingConfig {
  lite: {
    monthly: number;
    platformFee: number;
    trial: number;
    features: Feature[];
  };
  pro: {
    oneTime: number;
    monthly: number;
    platformFee: number;
    features: Feature[];
  };
}

interface PriceChangeEntry {
  date: string;
  plan: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
}

const defaultLiteFeatures: Feature[] = [
  { name: "AI-generated subdomain website", enabled: true, category: "basic" },
  { name: "5 customizable templates", enabled: true, category: "basic" },
  { name: "Basic drag-and-drop editor", enabled: true, category: "basic" },
  { name: "Mobile responsive design", enabled: true, category: "basic" },
  { name: "Dashboard integration (orders, customers)", enabled: true, category: "basic" },
  { name: "SSL certificate included", enabled: true, category: "basic" },
  { name: "24/7 hosting included", enabled: true, category: "basic" },
  { name: "Custom domain support", enabled: false, category: "advanced" },
  { name: "E-commerce functionality", enabled: false, category: "advanced" },
  { name: "Priority support", enabled: false, category: "premium" },
];

const defaultProFeatures: Feature[] = [
  { name: "AI-generated subdomain website", enabled: true, category: "basic" },
  { name: "20+ premium templates", enabled: true, category: "basic" },
  { name: "Advanced drag-and-drop editor", enabled: true, category: "basic" },
  { name: "Mobile responsive design", enabled: true, category: "basic" },
  { name: "Full dashboard integration", enabled: true, category: "basic" },
  { name: "SSL certificate included", enabled: true, category: "basic" },
  { name: "Premium hosting included", enabled: true, category: "basic" },
  { name: "Custom domain support (+$2/month)", enabled: true, category: "advanced" },
  { name: "E-commerce module included", enabled: true, category: "advanced" },
  { name: "Priority 24/7 support", enabled: true, category: "premium" },
  { name: "SEO optimization tools", enabled: true, category: "premium" },
  { name: "Analytics dashboard", enabled: true, category: "premium" },
];

const DEFAULT_CONFIG: PricingConfig = {
  lite: { monthly: 17, platformFee: 10, trial: 6, features: defaultLiteFeatures },
  pro: { oneTime: 199, monthly: 7, platformFee: 140, features: defaultProFeatures },
};

const WebsitePricingPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_CONFIG);
  const savedConfigRef = useRef<PricingConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState({ activeLite: 0, activePro: 0, exempted: 0, mrr: 0, totalPlatformFees: 0 });
  const [exemptions, setExemptions] = useState<{ id: string; org_id: string; org_name: string; exemption_type: string; reason: string | null; expires_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceChangeEntry[]>([]);
  const [latestConfigVersion, setLatestConfigVersion] = useState(0);

  // Edit price modal
  const [editModal, setEditModal] = useState<{
    plan: "lite" | "pro";
    field: string;
    label: string;
    value: number;
    oldValue: number;
    confirmed: boolean;
  } | null>(null);

  // Features modal
  const [featuresModal, setFeaturesModal] = useState<"lite" | "pro" | null>(null);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureCategory, setNewFeatureCategory] = useState<"basic" | "advanced" | "premium">("basic");

  // Create plan modal
  const [createPlanModal, setCreatePlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", price: "", platformFee: "", billing: "monthly", description: "" });

  // ─── Load persisted config ───
  const loadConfig = useCallback(async () => {
    const { data } = await supabase
      .from("website_pricing_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const parsed = data[0].config_data as unknown as PricingConfig;
      if (parsed?.lite && parsed?.pro) {
        setConfig(parsed);
        savedConfigRef.current = parsed;
        setLatestConfigVersion(data[0].version);
      }
    }
  }, []);

  // ─── Load stats ───
  const loadStats = useCallback(async () => {
    const [subsResult, reqsResult] = await Promise.all([
      supabase.from("website_builder_subscriptions").select("*"),
      supabase.from("website_builder_requests").select("*"),
    ]);
    const subs = subsResult.data || [];
    const reqs = reqsResult.data || [];

    const activeLite = subs.filter((s: any) => s.status === "trial" || s.status === "active").length;
    const activePro = reqs.filter((r: any) => r.status === "completed").length;
    const mrr = subs
      .filter((s: any) => s.status === "active" || s.status === "trial")
      .reduce((sum: number, s: any) => sum + (s.monthly_fee || 0), 0);
    const totalPlatformFees =
      subs.reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) +
      reqs.filter((r: any) => r.payment_status === "paid").reduce((sum: number, r: any) => sum + (r.platform_fee || 0), 0);

    setStats({ activeLite, activePro, mrr, totalPlatformFees });
  }, []);

  // ─── Load history ───
  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("website_pricing_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(50);

    if (data) {
      setPriceHistory(
        data.map((h: any) => ({
          date: h.changed_at,
          plan: h.plan,
          field: h.field,
          oldValue: h.old_value,
          newValue: h.new_value,
          changedBy: h.changed_by,
        }))
      );
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadConfig(), loadStats(), loadHistory()]);
    setLoading(false);
  }, [loadConfig, loadStats, loadHistory]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Compare configs to detect changes for audit ───
  const compareConfigs = (oldCfg: PricingConfig, newCfg: PricingConfig) => {
    const changes: { plan: string; field: string; oldValue: string; newValue: string }[] = [];
    // Lite
    if (oldCfg.lite.monthly !== newCfg.lite.monthly) changes.push({ plan: "lite", field: "monthly", oldValue: String(oldCfg.lite.monthly), newValue: String(newCfg.lite.monthly) });
    if (oldCfg.lite.platformFee !== newCfg.lite.platformFee) changes.push({ plan: "lite", field: "platformFee", oldValue: String(oldCfg.lite.platformFee), newValue: String(newCfg.lite.platformFee) });
    if (oldCfg.lite.trial !== newCfg.lite.trial) changes.push({ plan: "lite", field: "trial", oldValue: String(oldCfg.lite.trial), newValue: String(newCfg.lite.trial) });
    // Pro
    if (oldCfg.pro.oneTime !== newCfg.pro.oneTime) changes.push({ plan: "pro", field: "oneTime", oldValue: String(oldCfg.pro.oneTime), newValue: String(newCfg.pro.oneTime) });
    if (oldCfg.pro.monthly !== newCfg.pro.monthly) changes.push({ plan: "pro", field: "monthly", oldValue: String(oldCfg.pro.monthly), newValue: String(newCfg.pro.monthly) });
    if (oldCfg.pro.platformFee !== newCfg.pro.platformFee) changes.push({ plan: "pro", field: "platformFee", oldValue: String(oldCfg.pro.platformFee), newValue: String(newCfg.pro.platformFee) });
    return changes;
  };

  // ─── Publish all pending changes to DB ───
  const publishChanges = async () => {
    if (!unsavedChanges || !user) return;
    setPublishing(true);

    const newVersion = latestConfigVersion + 1;
    const { data: inserted, error } = await supabase
      .from("website_pricing_config")
      .insert({
        config_data: config as any,
        version: newVersion,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      toast({ title: "Error publishing", description: error?.message || "Unknown error", variant: "destructive" });
      setPublishing(false);
      return;
    }

    // Write audit history rows
    const changes = compareConfigs(savedConfigRef.current, config);
    if (changes.length > 0) {
      await supabase.from("website_pricing_history").insert(
        changes.map((c) => ({
          config_id: inserted.id,
          plan: c.plan,
          field: c.field,
          old_value: c.oldValue,
          new_value: c.newValue,
          changed_by: user.id,
        }))
      );
    }

    savedConfigRef.current = config;
    setLatestConfigVersion(newVersion);
    setUnsavedChanges(false);
    setPublishing(false);

    toast({ title: "✅ Pricing published", description: `Version ${newVersion} saved. ${changes.length} change(s) logged.` });
    loadHistory();
  };

  // ─── Handle edit modal save (local only) ───
  const handleSavePrice = () => {
    if (!editModal) return;

    if (!editModal.confirmed) {
      setEditModal({ ...editModal, confirmed: true });
      return;
    }

    setConfig((prev) => {
      const next = structuredClone(prev);
      if (editModal.plan === "lite") {
        if (editModal.field === "monthly") next.lite.monthly = editModal.value;
        else if (editModal.field === "platformFee") next.lite.platformFee = editModal.value;
        else if (editModal.field === "trial") next.lite.trial = editModal.value;
      } else {
        if (editModal.field === "oneTime") next.pro.oneTime = editModal.value;
        else if (editModal.field === "platformFee") next.pro.platformFee = editModal.value;
        else if (editModal.field === "maintenance") next.pro.monthly = editModal.value;
      }
      return next;
    });

    setUnsavedChanges(true);
    toast({ title: "Price updated locally", description: 'Click "Publish Changes" to save to database.' });
    setEditModal(null);
  };

  const toggleFeature = (plan: "lite" | "pro", index: number) => {
    setConfig((prev) => {
      const next = structuredClone(prev);
      next[plan].features[index].enabled = !next[plan].features[index].enabled;
      return next;
    });
    setUnsavedChanges(true);
  };

  const addFeature = () => {
    if (!newFeatureName.trim() || !featuresModal) return;
    setConfig((prev) => {
      const next = structuredClone(prev);
      next[featuresModal].features.push({ name: newFeatureName.trim(), enabled: true, category: newFeatureCategory });
      return next;
    });
    setNewFeatureName("");
    setUnsavedChanges(true);
    toast({ title: "Feature added" });
  };

  const removeFeature = (plan: "lite" | "pro", index: number) => {
    setConfig((prev) => {
      const next = structuredClone(prev);
      next[plan].features.splice(index, 1);
      return next;
    });
    setUnsavedChanges(true);
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name.trim() || !user) return;

    const price = parseFloat(newPlan.price) || 0;
    const platformFee = parseFloat(newPlan.platformFee) || 0;

    // Determine role_type based on plan characteristics
    const roleType = newPlan.billing === "one-time" || newPlan.billing === "hybrid"
      ? "org_native_custom"
      : "org_native_basic";

    // Insert into subscription_rates
    const { error: rateError } = await supabase
      .from("subscription_rates" as any)
      .insert({
        plan_name: newPlan.name.trim(),
        role_type: roleType,
        price_amount: price,
        price_currency: "USD",
        billing_cycle: newPlan.billing === "hybrid" ? "monthly" : newPlan.billing === "one-time" ? "one_time" : newPlan.billing,
        description: newPlan.description || null,
        features: [],
        is_active: true,
        sort_order: 10,
      } as any);

    if (rateError) {
      toast({ title: "Error creating plan", description: rateError.message, variant: "destructive" });
      return;
    }

    // Record in pricing audit log
    await supabase.from("pricing_audit_log").insert({
      table_name: "subscription_rates",
      record_id: "new",
      field_name: `website_plan.${newPlan.name.trim()}`,
      old_value: null,
      new_value: `$${price}/${newPlan.billing} (platform fee: $${platformFee})`,
      changed_by: user.id,
    });

    toast({ title: "✅ Plan created", description: `${newPlan.name} plan created and added to subscription rates.` });
    setCreatePlanModal(false);
    setNewPlan({ name: "", price: "", platformFee: "", billing: "monthly", description: "" });
    await loadAll();
  };

  const proNetRevenue = config.pro.oneTime - config.pro.platformFee;
  const proRevenueLabel = `$${proNetRevenue} first year + $${config.pro.monthly}/month thereafter`;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            💰 Website Builder Pricing
            <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-medium">v2.0</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage pricing tiers, features, and monitor subscription revenue.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History size={14} className="mr-1" /> {showHistory ? "Hide" : "View"} History
          </Button>
          <Button
            size="sm"
            onClick={publishChanges}
            disabled={!unsavedChanges || publishing}
            className={unsavedChanges ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
            variant={unsavedChanges ? "default" : "outline"}
          >
            {publishing ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" /> Publishing...</>
            ) : (
              <><Upload size={14} className="mr-1" /> Publish Changes{unsavedChanges ? " *" : ""}</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Lite Subscriptions", value: stats.activeLite, icon: Globe, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active Pro Sites", value: stats.activePro, icon: Crown, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Monthly Recurring Revenue", value: `$${stats.mrr}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Platform Fees Collected", value: `$${stats.totalPlatformFees}`, icon: DollarSign, color: "text-secondary", bg: "bg-secondary/10" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-card border border-border border-l-4 border-l-primary">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="font-heading font-bold text-2xl">{stat.value}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lite Plan Card */}
        <PlanCard
          title="Website Builder Lite"
          icon={<Globe size={20} className="text-primary" />}
          badge="Popular"
          badgeClass="bg-primary/20 text-primary"
          borderClass="border-primary"
          rows={[
            { label: "Monthly Subscription", value: `$${config.lite.monthly}`, onEdit: () => setEditModal({ plan: "lite", field: "monthly", label: "Lite Monthly Subscription", value: config.lite.monthly, oldValue: config.lite.monthly, confirmed: false }) },
            { label: "Platform Fee (to FSA)", value: `$${config.lite.platformFee}`, onEdit: () => setEditModal({ plan: "lite", field: "platformFee", label: "Lite Platform Fee", value: config.lite.platformFee, oldValue: config.lite.platformFee, confirmed: false }) },
            { label: "Trial Period", value: `${config.lite.trial} months`, onEdit: () => setEditModal({ plan: "lite", field: "trial", label: "Lite Trial (months)", value: config.lite.trial, oldValue: config.lite.trial, confirmed: false }) },
          ]}
          revenueLabel="💰 Your Revenue (after platform fee)"
          revenueValue={`$${config.lite.monthly - config.lite.platformFee}/month`}
          revenueAccent="border-l-primary"
          revenueBg="bg-primary/5"
          features={config.lite.features}
          featureIcon={<CheckCircle2 size={14} className="text-secondary shrink-0" />}
          onManageFeatures={() => setFeaturesModal("lite")}
        />

        {/* Pro Plan Card */}
        <PlanCard
          title="Website Builder Pro"
          icon={<Crown size={20} className="text-secondary" />}
          badge="Premium"
          badgeClass="bg-secondary/20 text-secondary"
          borderClass="border-secondary"
          bgClass="bg-gradient-to-br from-card to-secondary/5"
          rows={[
            { label: "One-time Build Fee", value: `$${config.pro.oneTime}`, onEdit: () => setEditModal({ plan: "pro", field: "oneTime", label: "Pro One-Time Fee", value: config.pro.oneTime, oldValue: config.pro.oneTime, confirmed: false }) },
            { label: "Monthly Maintenance", value: `$${config.pro.monthly}/mo`, onEdit: () => setEditModal({ plan: "pro", field: "maintenance", label: "Pro Monthly Maintenance", value: config.pro.monthly, oldValue: config.pro.monthly, confirmed: false }) },
            { label: "Platform Fee (to FSA)", value: `$${config.pro.platformFee}`, onEdit: () => setEditModal({ plan: "pro", field: "platformFee", label: "Pro Platform Fee", value: config.pro.platformFee, oldValue: config.pro.platformFee, confirmed: false }) },
          ]}
          revenueLabel="💰 Your Revenue (after platform fee)"
          revenueValue={proRevenueLabel}
          revenueAccent="border-l-secondary"
          revenueBg="bg-secondary/5"
          features={config.pro.features}
          featureIcon={<Zap size={14} className="text-primary shrink-0" />}
          onManageFeatures={() => setFeaturesModal("pro")}
        />

        {/* Create New Plan Card */}
        <div className="rounded-2xl border-2 border-dashed border-primary/40 p-6 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 hover:border-primary/70 transition-colors cursor-pointer" onClick={() => setCreatePlanModal(true)}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus size={32} className="text-primary" />
          </div>
          <h3 className="font-heading font-semibold text-lg">Create New Plan</h3>
          <p className="text-muted-foreground text-sm max-w-[200px]">Add a custom pricing tier for special organizations</p>
          <Button variant="hero" size="sm" onClick={(e) => { e.stopPropagation(); setCreatePlanModal(true); }}>
            Create Plan
          </Button>
        </div>
      </div>

      {/* Price Change History */}
      {showHistory && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <History size={16} className="text-primary" />
              Price Change History
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          {priceHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No price changes recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Plan</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Field</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Old Value</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">New Value</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Changed By</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((entry, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-medium">{entry.plan.toUpperCase()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.field}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive line-through">${entry.oldValue}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary/10 text-secondary font-medium">${entry.newValue}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.changedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Edit Price Modal */}
      <Dialog open={!!editModal} onOpenChange={(open) => !open && setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editModal?.label}</DialogTitle>
            <DialogDescription>Update the pricing value. Changes apply to new subscriptions only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{editModal?.field === "trial" ? "Months" : "Amount ($)"}</Label>
              <div className="flex items-center gap-2 mt-1">
                {editModal?.field !== "trial" && <span className="text-muted-foreground font-medium">$</span>}
                <Input
                  type="number"
                  value={editModal?.value ?? 0}
                  onChange={(e) => setEditModal((prev) => prev ? { ...prev, value: parseFloat(e.target.value) || 0, confirmed: false } : null)}
                  min={0}
                  step={editModal?.field === "trial" ? 1 : 0.01}
                />
              </div>
            </div>

            {/* Impact Preview */}
            {editModal && editModal.field !== "trial" && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Impact Preview</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="line-through text-destructive">${editModal.oldValue}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New:</span>
                  <span className="font-semibold text-secondary">${editModal.value}</span>
                </div>
                {(editModal.field === "monthly" || editModal.field === "oneTime") && (
                  <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                    <span className="text-muted-foreground">Revenue after platform fee:</span>
                    <span className="font-bold">
                      ${editModal.value - (editModal.plan === "lite" ? config.lite.platformFee : config.pro.platformFee)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Confirmation step */}
            {editModal?.confirmed && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                <p className="text-sm font-medium">Are you sure you want to change the {editModal.field} price?</p>
                <p className="text-sm">
                  <span className="line-through text-destructive">${editModal.oldValue}</span>
                  {" → "}
                  <span className="font-bold text-secondary">${editModal.value}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">This change will affect all new subscriptions. Existing subscribers will keep their current price.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleSavePrice}>
              {editModal?.confirmed ? "Confirm Change" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Features Modal */}
      <Dialog open={!!featuresModal} onOpenChange={(open) => !open && setFeaturesModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage {featuresModal === "lite" ? "Lite" : "Pro"} Features</DialogTitle>
            <DialogDescription>Toggle, add, or remove features for this plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {(featuresModal === "lite" ? config.lite.features : config.pro.features).map((feature, index) => (
              <div key={index} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                <button onClick={() => featuresModal && toggleFeature(featuresModal, index)} className="shrink-0">
                  {feature.enabled ? <ToggleRight size={24} className="text-secondary" /> : <ToggleLeft size={24} className="text-muted-foreground" />}
                </button>
                <span className={`flex-1 text-sm ${feature.enabled ? "" : "text-muted-foreground line-through"}`}>{feature.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{feature.category}</span>
                <button onClick={() => featuresModal && removeFeature(featuresModal, index)} className="text-muted-foreground hover:text-destructive">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <Label>Add New Feature</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g., Custom domain support" value={newFeatureName} onChange={(e) => setNewFeatureName(e.target.value)} className="flex-1" />
              <select value={newFeatureCategory} onChange={(e) => setNewFeatureCategory(e.target.value as "basic" | "advanced" | "premium")} className="rounded-lg border border-input bg-background px-3 py-2 text-sm w-28">
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
                <option value="premium">Premium</option>
              </select>
              <Button variant="secondary" size="sm" onClick={addFeature} disabled={!newFeatureName.trim()}>Add</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeaturesModal(null)}>Close</Button>
            <Button variant="hero" onClick={() => { toast({ title: "Features saved locally. Publish to persist." }); setFeaturesModal(null); }}>Save Features</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Modal */}
      <Dialog open={createPlanModal} onOpenChange={setCreatePlanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pricing Plan</DialogTitle>
            <DialogDescription>Add a custom pricing tier for special organizations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Name</Label>
              <Input placeholder="e.g., Enterprise Website" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input type="number" placeholder="0.00" value={newPlan.price} onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <select value={newPlan.billing} onChange={(e) => setNewPlan((p) => ({ ...p, billing: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm h-10">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                  <option value="hybrid">Hybrid (build + monthly)</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Platform Fee ($)</Label>
              <Input type="number" placeholder="0.00" value={newPlan.platformFee} onChange={(e) => setNewPlan((p) => ({ ...p, platformFee: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <textarea rows={3} placeholder="Describe this plan..." value={newPlan.description} onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePlanModal(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleCreatePlan} disabled={!newPlan.name.trim()}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

/* ───── Plan Card Sub-component ───── */
const PlanCard = ({
  title, icon, badge, badgeClass, borderClass, bgClass, rows, revenueLabel, revenueValue, revenueAccent, revenueBg, features, featureIcon, onManageFeatures,
}: {
  title: string;
  icon: React.ReactNode;
  badge: string;
  badgeClass: string;
  borderClass: string;
  bgClass?: string;
  rows: { label: string; value: string; onEdit: () => void }[];
  revenueLabel: string;
  revenueValue: string;
  revenueAccent: string;
  revenueBg: string;
  features: Feature[];
  featureIcon: React.ReactNode;
  onManageFeatures: () => void;
}) => (
  <div className={`rounded-2xl bg-card border-2 ${borderClass} p-6 space-y-5 ${bgClass || ""}`}>
    <div className="flex items-center justify-between">
      <h2 className="font-heading font-bold text-lg flex items-center gap-2">
        {icon}
        {title}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>{badge}</span>
      </h2>
      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-secondary/10 text-secondary">● Live</span>
    </div>

    <div className="rounded-xl bg-muted/50 p-4 space-y-1">
      {rows.map((row) => (
        <PriceRow key={row.label} label={row.label} value={row.value} onEdit={row.onEdit} />
      ))}
    </div>

    <div className={`rounded-lg ${revenueBg} border-l-4 ${revenueAccent} p-4`}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{revenueLabel}</p>
      <p className="font-heading font-bold text-lg">{revenueValue}</p>
    </div>

    <div>
      <h4 className="font-semibold text-sm mb-3">Features</h4>
      <div className="space-y-2">
        {features.filter((f) => f.enabled).slice(0, 6).map((feature) => (
          <div key={feature.name} className="flex items-center gap-2 text-sm text-muted-foreground">
            {featureIcon}
            {feature.name}
          </div>
        ))}
        {features.filter((f) => f.enabled).length > 6 && (
          <p className="text-xs text-muted-foreground">+{features.filter((f) => f.enabled).length - 6} more</p>
        )}
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3" onClick={onManageFeatures}>
        <Edit3 size={12} className="mr-1" /> Manage Features
      </Button>
    </div>

    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1">
        <Copy size={12} className="mr-1" /> Duplicate
      </Button>
      <Button variant="outline" size="sm" className="flex-1">
        <Eye size={12} className="mr-1" /> Preview
      </Button>
    </div>
  </div>
);

/* ───── Price Row Sub-component ───── */
const PriceRow = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
  <div className="flex items-center justify-between py-2 border-b border-dashed border-border last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <button
      onClick={onEdit}
      className="font-heading font-bold text-lg text-secondary hover:bg-secondary/10 px-3 py-1 rounded-md transition-colors flex items-center gap-1.5"
    >
      {value}
      <Edit3 size={12} className="text-primary opacity-60" />
    </button>
  </div>
);

export default WebsitePricingPanel;
