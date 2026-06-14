import { useFeatureFlags, type FeatureFlag } from "@/hooks/useFeatureFlags";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  CreditCard, Truck, Ruler, MessageCircle, Calendar, Globe, Brain, Database,
  Layers, Sparkles, Camera, Shield, Info, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import FeatureAccessMatrix from "./FeatureAccessMatrix";

const categoryMeta: Record<string, { label: string; icon: typeof CreditCard; description: string }> = {
  payments: { label: "Payments", icon: CreditCard, description: "Payment gateways and processing" },
  logistics: { label: "Logistics", icon: Truck, description: "Shipping and delivery providers" },
  measurements: { label: "Measurements & AI Models", icon: Ruler, description: "AI measurement tiers and try-on services" },
  communications: { label: "Communications", icon: MessageCircle, description: "Messaging, calls, and video" },
  integrations: { label: "Integrations", icon: Calendar, description: "Third-party calendar and tools" },
  website: { label: "Website & E-commerce", icon: Globe, description: "Website builder and storefront" },
  ai: { label: "AI & Automation", icon: Brain, description: "AI-powered dispute resolution and more" },
  backup: { label: "Backup & Resilience", icon: Database, description: "Data backup systems" },
};

// Special rendering for AI measurement tiers
const tierMeta: Record<string, { tier: number; accuracy: string; icon: typeof Camera; color: string }> = {
  ai_measurement_tier1: { tier: 1, accuracy: "60-75%", icon: Camera, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  ai_measurement_tier2: { tier: 2, accuracy: "80-90%", icon: Layers, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  ai_measurement_tier3: { tier: 3, accuracy: "90-97%", icon: Sparkles, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
};

export default function FeatureFlagsPanel() {
  const { flagsByCategory, isLoading, toggleFlag } = useFeatureFlags();
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(categoryMeta)));

  const handleToggle = (flag: FeatureFlag) => {
    toggleFlag.mutate(
      { id: flag.id, is_enabled: !flag.is_enabled },
      {
        onSuccess: () =>
          toast({
            title: `${flag.feature_name} ${!flag.is_enabled ? "enabled" : "disabled"}`,
          }),
        onError: () =>
          toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const categories = Object.keys(categoryMeta);
  const totalFlags = Object.values(flagsByCategory).flat().length;
  const enabledFlags = Object.values(flagsByCategory).flat().filter(f => f.is_enabled).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Feature Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage platform features, AI measurement models, service toggles, and per-role / per-plan access privileges.
        </p>
      </div>

      {/* Role & Plan Access Matrix — unified access privilege editor */}
      <FeatureAccessMatrix />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Features</p>
          <p className="font-heading font-bold text-xl">{totalFlags}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Enabled</p>
          <p className="font-heading font-bold text-xl text-green-600">{enabledFlags}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <p className="font-heading font-bold text-xl text-muted-foreground">{totalFlags - enabledFlags}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="font-heading font-bold text-xl">{Object.keys(flagsByCategory).length}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Enabled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Disabled
        </span>
        <Badge variant="outline" className="text-[10px]">feature_flag</Badge>
        <Badge variant="secondary" className="text-[10px]">api_gateway</Badge>
        <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border border-purple-200">AI Model</Badge>
      </div>

      {/* AI Measurement Tiers - Special Section */}
      {flagsByCategory["measurements"] && (
        <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <div className="px-5 py-4 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-heading font-bold text-base">AI Measurement Models</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage Gemini AI and ARCore measurement tiers. Each tier offers different accuracy levels and credit costs.
            </p>
          </div>
          <div className="grid gap-3 p-4">
            {flagsByCategory["measurements"]
              .filter(f => tierMeta[f.feature_key])
              .map(flag => {
                const meta = tierMeta[flag.feature_key];
                const TierIcon = meta.icon;
                const tierData = flag.metadata as Record<string, unknown>;
                return (
                  <div key={flag.id} className={`rounded-lg border p-4 ${meta.color}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                        <TierIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{flag.feature_name}</p>
                          <Badge variant="outline" className="text-[9px]">Tier {meta.tier}</Badge>
                          {flag.is_enabled && (
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs opacity-80">{flag.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span>Accuracy: <strong>{meta.accuracy}</strong></span>
                          <span>Provider: <strong>{flag.api_provider}</strong></span>
                          {tierData?.credits_cost && (
                            <span>Credits: <strong>{String(tierData.credits_cost)}/scan</strong></span>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={() => handleToggle(flag)}
                        disabled={toggleFlag.isPending}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* All Categories */}
      {categories.map((cat) => {
        const meta = categoryMeta[cat];
        const flags = flagsByCategory[cat];
        if (!flags || flags.length === 0) return null;

        // Filter out tier flags from the measurements category (already shown above)
        const displayFlags = cat === "measurements"
          ? flags.filter(f => !tierMeta[f.feature_key])
          : flags;

        if (displayFlags.length === 0) return null;

        const isExpanded = expandedCategories.has(cat);

        return (
          <div key={cat} className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full px-5 py-3 bg-muted/50 flex items-center gap-2 border-b border-border hover:bg-muted/70 transition-colors"
            >
              <meta.icon size={16} className="text-primary" />
              <h3 className="font-heading font-semibold text-sm">{meta.label}</h3>
              <span className="text-[10px] text-muted-foreground ml-1">— {meta.description}</span>
              <span className="text-xs text-muted-foreground ml-auto mr-2">
                {displayFlags.filter((f) => f.is_enabled).length}/{displayFlags.length} enabled
              </span>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isExpanded && (
              <div className="divide-y divide-border">
                {displayFlags.map((flag) => (
                  <div key={flag.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{flag.feature_name}</p>
                        <Badge
                          variant={flag.toggle_mechanism === "api_gateway" ? "secondary" : "outline"}
                          className="text-[10px] shrink-0"
                        >
                          {flag.toggle_mechanism}
                        </Badge>
                        {flag.mvp_default && (
                          <span className="w-2 h-2 rounded-full bg-secondary shrink-0" title="MVP default ON" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {flag.api_provider && <span className="font-medium">{flag.api_provider}</span>}
                        {flag.api_provider && flag.description && " · "}
                        {flag.description}
                      </p>
                      {flag.requires_api_key && flag.required_secret_names.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {flag.required_secret_names.map((s) => (
                            <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={() => handleToggle(flag)}
                      disabled={toggleFlag.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Verification Status Section */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 bg-muted/50 flex items-center gap-2 border-b border-border">
          <Shield size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Registration Verification</h3>
          <span className="text-[10px] text-muted-foreground ml-1">— Identity & business verification requirements</span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Tailor Identity Verification</p>
              <p className="text-xs text-muted-foreground">
                Tailors must submit a valid identity number (NIN, BVN, Ghana Card, Kenyan ID, SA ID, or Passport)
                during registration. Numbers are auto-verified using format validation and checksum algorithms.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Organization Business Registration</p>
              <p className="text-xs text-muted-foreground">
                Organizations must provide a business registration number (CAC, TIN, Ghana RG, Kenya BRN, CIPC)
                during creation. Numbers are auto-verified against known format patterns per country.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
