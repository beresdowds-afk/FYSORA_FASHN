import { useFeatureFlags, type FeatureFlag } from "@/hooks/useFeatureFlags";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  CreditCard, Truck, Ruler, MessageCircle, Calendar, Globe, Brain, Database,
} from "lucide-react";

const categoryMeta: Record<string, { label: string; icon: typeof CreditCard }> = {
  payments: { label: "Payments", icon: CreditCard },
  logistics: { label: "Logistics", icon: Truck },
  measurements: { label: "Measurements & Try-On", icon: Ruler },
  communications: { label: "Communications", icon: MessageCircle },
  integrations: { label: "Integrations", icon: Calendar },
  website: { label: "Website & E-commerce", icon: Globe },
  ai: { label: "AI & Automation", icon: Brain },
  backup: { label: "Backup & Resilience", icon: Database },
};

export default function FeatureFlagsPanel() {
  const { flagsByCategory, isLoading, toggleFlag } = useFeatureFlags();
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const categories = Object.keys(categoryMeta);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Feature Flags</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Toggle platform features between MVP and Full Platform mode.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-secondary" /> MVP ON
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> MVP OFF
        </span>
        <Badge variant="outline" className="text-[10px]">feature_flag</Badge>
        <Badge variant="secondary" className="text-[10px]">api_gateway</Badge>
      </div>

      {categories.map((cat) => {
        const meta = categoryMeta[cat];
        const flags = flagsByCategory[cat];
        if (!flags || flags.length === 0) return null;

        return (
          <div key={cat} className="rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 bg-muted/50 flex items-center gap-2 border-b border-border">
              <meta.icon size={16} className="text-primary" />
              <h3 className="font-heading font-semibold text-sm">{meta.label}</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {flags.filter((f) => f.is_enabled).length}/{flags.length} enabled
              </span>
            </div>
            <div className="divide-y divide-border">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="px-5 py-3 flex items-center gap-4"
                >
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
          </div>
        );
      })}
    </motion.div>
  );
}
