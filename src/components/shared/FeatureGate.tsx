import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLocked?: boolean;
}

/**
 * Conditionally renders children based on whether a platform feature flag is enabled.
 * - featureKey: the feature_key from platform_feature_flags
 * - fallback: optional custom fallback UI
 * - showLocked: if true, shows a locked badge instead of hiding entirely
 */
export default function FeatureGate({ featureKey, children, fallback, showLocked = false }: FeatureGateProps) {
  const { isFeatureEnabled, isLoading, getFlag } = useFeatureFlags();

  if (isLoading) return null;

  if (isFeatureEnabled(featureKey)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  if (showLocked) {
    const flag = getFlag(featureKey);
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
        <Lock size={28} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground">
          {flag?.feature_name || featureKey} is not enabled
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Contact your platform administrator to enable this feature.
        </p>
      </div>
    );
  }

  return null;
}
