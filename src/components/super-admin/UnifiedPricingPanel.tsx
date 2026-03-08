import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  Edit3,
  RefreshCw,
  Save,
  History,
  Package,
  Phone,
  Sparkles,
  CreditCard,
  UserPlus,
  TrendingUp,
  Globe,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  Users,
  Scissors,
  Palette,
  Building2,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

/* ─── Types ─── */
interface PlatformFee {
  id: string;
  fee_key: string;
  fee_label: string;
  fee_category: string;
  fee_value: number;
  fee_unit: string;
  currency: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

interface SubPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_active: boolean;
  max_members: number | null;
  max_orders: number | null;
  max_customers: number | null;
  trial_days: number;
  ai_measurement_price: number | null;
  virtual_tryon_price: number | null;
  video_minute_price: number | null;
  included_ai_measurements: number | null;
  included_virtual_tryons: number | null;
  included_video_minutes: number | null;
  sort_order: number;
}

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

interface SubRate {
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
}

const ROLE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  customer: { icon: Users, label: "Customers", color: "text-secondary" },
  tailor: { icon: Scissors, label: "Tailors", color: "text-primary" },
  designer: { icon: Palette, label: "Designers", color: "text-chart-4" },
  org_native_basic: { icon: Building2, label: "Orgs (Native Basic)", color: "text-accent-foreground" },
  org_native_custom: { icon: Globe, label: "Orgs (Native Custom)", color: "text-chart-2" },
  org_external: { icon: ExternalLink, label: "Orgs (External Site)", color: "text-chart-5" },
};

/* ─── Category config ─── */
const CATEGORIES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  order_fees: { label: "Order & Platform Fees", icon: Package, color: "text-primary" },
  ai_services: { label: "AI Service Rates", icon: Sparkles, color: "text-chart-4" },
  communication: { label: "Communication", icon: Phone, color: "text-chart-2" },
  credits: { label: "Credit Bundles", icon: CreditCard, color: "text-chart-3" },
  registration: { label: "Registration Fees", icon: UserPlus, color: "text-chart-5" },
};

const UNIT_LABELS: Record<string, string> = {
  percent: "%",
  flat_usd: "USD",
  flat_ngn: "NGN",
  credits: "credits",
  credits_per_min: "credits/min",
};

/* ─── Component ─── */
const UnifiedPricingPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"fees" | "plans" | "audit">("fees");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));

  const [subRates, setSubRates] = useState<SubRate[]>([]);

  // Edit states
  const [editFee, setEditFee] = useState<{ fee: PlatformFee; newValue: number } | null>(null);
  const [editPlan, setEditPlan] = useState<{ plan: SubPlan; field: string; label: string; value: number } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [feeRes, planRes, auditRes] = await Promise.all([
      supabase.from("platform_fee_config").select("*").order("fee_category,fee_key"),
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("pricing_audit_log").select("*").order("changed_at", { ascending: false }).limit(50),
    ]);
    setFees((feeRes.data as PlatformFee[]) || []);
    setPlans((planRes.data as SubPlan[]) || []);
    setAuditLog((auditRes.data as AuditEntry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  /* ─── Save fee ─── */
  const saveFee = async () => {
    if (!editFee || !user) return;
    const oldVal = editFee.fee.fee_value;
    const { error } = await supabase
      .from("platform_fee_config")
      .update({ fee_value: editFee.newValue, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", editFee.fee.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("pricing_audit_log").insert({
      table_name: "platform_fee_config",
      record_id: editFee.fee.id,
      field_name: editFee.fee.fee_key,
      old_value: String(oldVal),
      new_value: String(editFee.newValue),
      changed_by: user.id,
    });

    toast({ title: "✅ Fee updated", description: `${editFee.fee.fee_label}: ${oldVal} → ${editFee.newValue}` });
    setEditFee(null);
    loadAll();
  };

  /* ─── Toggle fee active ─── */
  const toggleFeeActive = async (fee: PlatformFee) => {
    if (!user) return;
    await supabase
      .from("platform_fee_config")
      .update({ is_active: !fee.is_active, updated_by: user.id })
      .eq("id", fee.id);

    await supabase.from("pricing_audit_log").insert({
      table_name: "platform_fee_config",
      record_id: fee.id,
      field_name: `${fee.fee_key}_active`,
      old_value: String(fee.is_active),
      new_value: String(!fee.is_active),
      changed_by: user.id,
    });

    toast({ title: fee.is_active ? "Fee deactivated" : "Fee activated" });
    loadAll();
  };

  /* ─── Save plan field ─── */
  const savePlanField = async () => {
    if (!editPlan || !user) return;
    const oldVal = (editPlan.plan as any)[editPlan.field];
    const update: Record<string, any> = { [editPlan.field]: editPlan.value };

    const { error } = await supabase
      .from("subscription_plans")
      .update(update)
      .eq("id", editPlan.plan.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("pricing_audit_log").insert({
      table_name: "subscription_plans",
      record_id: editPlan.plan.id,
      field_name: `${editPlan.plan.slug}.${editPlan.field}`,
      old_value: String(oldVal ?? "null"),
      new_value: String(editPlan.value),
      changed_by: user.id,
    });

    toast({ title: "✅ Plan updated", description: `${editPlan.plan.name} ${editPlan.label}: ${oldVal} → ${editPlan.value}` });
    setEditPlan(null);
    loadAll();
  };

  /* ─── Toggle plan active ─── */
  const togglePlanActive = async (plan: SubPlan) => {
    if (!user) return;
    await supabase.from("subscription_plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
    await supabase.from("pricing_audit_log").insert({
      table_name: "subscription_plans",
      record_id: plan.id,
      field_name: `${plan.slug}.is_active`,
      old_value: String(plan.is_active),
      new_value: String(!plan.is_active),
      changed_by: user.id,
    });
    toast({ title: plan.is_active ? "Plan deactivated" : "Plan activated" });
    loadAll();
  };

  const grouped = fees.reduce<Record<string, PlatformFee[]>>((acc, f) => {
    (acc[f.fee_category] = acc[f.fee_category] || []).push(f);
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Layers size={24} className="text-primary" />
            Unified Pricing Control Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all billable features, subscription plans, and platform fees from one place.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {[
          { id: "fees" as const, label: "Platform Fees & Rates", icon: DollarSign },
          { id: "plans" as const, label: "Subscription Plans", icon: Package },
          { id: "audit" as const, label: "Change History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ FEES SECTION ═══ */}
      {activeSection === "fees" && (
        <div className="space-y-4">
          {Object.entries(CATEGORIES).map(([catKey, catConfig]) => {
            const catFees = grouped[catKey] || [];
            if (catFees.length === 0) return null;
            const isExpanded = expandedCategories.has(catKey);
            const CatIcon = catConfig.icon;

            return (
              <div key={catKey} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleCategory(catKey)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CatIcon size={18} className={catConfig.color} />
                    </div>
                    <div className="text-left">
                      <p className="font-heading font-semibold text-sm">{catConfig.label}</p>
                      <p className="text-xs text-muted-foreground">{catFees.length} fee{catFees.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border">
                        {catFees.map((fee) => (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{fee.fee_label}</p>
                                {!fee.is_active && (
                                  <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                )}
                              </div>
                              {fee.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-heading font-bold text-lg">
                                {fee.fee_value}
                                <span className="text-xs text-muted-foreground ml-1">
                                  {UNIT_LABELS[fee.fee_unit] || fee.fee_unit}
                                </span>
                              </span>
                              <Switch
                                checked={fee.is_active}
                                onCheckedChange={() => toggleFeeActive(fee)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditFee({ fee, newValue: fee.fee_value })}
                              >
                                <Edit3 size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ SUBSCRIPTION PLANS SECTION ═══ */}
      {activeSection === "plans" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border-2 bg-card p-5 space-y-4 ${
                plan.is_active ? "border-primary" : "border-border opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.slug} • {plan.currency}</p>
                </div>
                <Switch checked={plan.is_active} onCheckedChange={() => togglePlanActive(plan)} />
              </div>

              {/* Pricing rows */}
              <div className="space-y-2">
                {[
                  { field: "price_monthly", label: "Monthly Price", val: plan.price_monthly, unit: plan.currency },
                  { field: "price_yearly", label: "Yearly Price", val: plan.price_yearly, unit: plan.currency },
                  { field: "trial_days", label: "Trial Days", val: plan.trial_days, unit: "days" },
                ].map((row) => (
                  <div key={row.field} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{row.val} {row.unit}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditPlan({ plan, field: row.field, label: row.label, value: row.val })}
                      >
                        <Edit3 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Limits */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Limits</p>
                {[
                  { field: "max_members", label: "Max Members", val: plan.max_members },
                  { field: "max_orders", label: "Max Orders", val: plan.max_orders },
                  { field: "max_customers", label: "Max Customers", val: plan.max_customers },
                ].map((lim) => (
                  <div key={lim.field} className="flex items-center justify-between">
                    <span className="text-xs">{lim.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{lim.val ?? "∞"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditPlan({ plan, field: lim.field, label: lim.label, value: lim.val ?? 0 })}
                      >
                        <Edit3 size={10} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Pricing */}
              <div className="rounded-lg bg-primary/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} /> AI Service Pricing
                </p>
                {[
                  { field: "ai_measurement_price", label: "AI Measurement", val: plan.ai_measurement_price },
                  { field: "virtual_tryon_price", label: "Virtual Try-On", val: plan.virtual_tryon_price },
                  { field: "video_minute_price", label: "Video Min Price", val: plan.video_minute_price },
                ].map((ai) => (
                  <div key={ai.field} className="flex items-center justify-between">
                    <span className="text-xs">{ai.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{ai.val ?? "—"} {plan.currency}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditPlan({ plan, field: ai.field, label: ai.label, value: ai.val ?? 0 })}
                      >
                        <Edit3 size={10} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Included quotas */}
              <div className="rounded-lg bg-secondary/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Included Quotas</p>
                {[
                  { field: "included_ai_measurements", label: "AI Measurements", val: plan.included_ai_measurements },
                  { field: "included_virtual_tryons", label: "Virtual Try-Ons", val: plan.included_virtual_tryons },
                  { field: "included_video_minutes", label: "Video Minutes", val: plan.included_video_minutes },
                ].map((q) => (
                  <div key={q.field} className="flex items-center justify-between">
                    <span className="text-xs">{q.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{q.val ?? "0"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditPlan({ plan, field: q.field, label: q.label, value: q.val ?? 0 })}
                      >
                        <Edit3 size={10} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ AUDIT LOG SECTION ═══ */}
      {activeSection === "audit" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            <span className="font-heading font-semibold text-sm">Pricing Change Audit Trail</span>
            <Badge variant="secondary" className="ml-auto">{auditLog.length} entries</Badge>
          </div>
          {auditLog.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No pricing changes recorded yet.</div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {auditLog.map((entry) => (
                <div key={entry.id} className="px-5 py-3 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-primary">{entry.field_name}</span>
                      <span className="text-muted-foreground"> in </span>
                      <span>{entry.table_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="line-through text-destructive">{entry.old_value}</span>
                      <span className="mx-1.5">→</span>
                      <span className="text-primary font-medium">{entry.new_value}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.changed_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Edit Fee Dialog ─── */}
      <Dialog open={!!editFee} onOpenChange={() => setEditFee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editFee?.fee.fee_label}</DialogTitle>
            <DialogDescription>{editFee?.fee.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Value</Label>
              <p className="text-lg font-bold">{editFee?.fee.fee_value} {UNIT_LABELS[editFee?.fee.fee_unit || ""]}</p>
            </div>
            <div>
              <Label>New Value</Label>
              <Input
                type="number"
                step="0.01"
                value={editFee?.newValue ?? ""}
                onChange={(e) => editFee && setEditFee({ ...editFee, newValue: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFee(null)}>Cancel</Button>
            <Button onClick={saveFee} disabled={editFee?.newValue === editFee?.fee.fee_value}>
              <Save size={14} className="mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Plan Field Dialog ─── */}
      <Dialog open={!!editPlan} onOpenChange={() => setEditPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editPlan?.plan.name} — {editPlan?.label}</DialogTitle>
            <DialogDescription>Update this value for the {editPlan?.plan.name} plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current: {(editPlan?.plan as any)?.[editPlan?.field || ""] ?? "—"}</Label>
            </div>
            <div>
              <Label>New Value</Label>
              <Input
                type="number"
                step="0.01"
                value={editPlan?.value ?? ""}
                onChange={(e) => editPlan && setEditPlan({ ...editPlan, value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancel</Button>
            <Button onClick={savePlanField}>
              <Save size={14} className="mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default UnifiedPricingPanel;
