// Website Builder Tier Configuration
// Defines features and limits per plan tier

export interface TierFeatures {
  templates: number;
  pages: number | "unlimited";
  storageMB: number;
  customDomain: boolean;
  ecommerce: boolean;
  analytics: "basic" | "advanced";
  support: "email" | "priority";
  aiGeneration: boolean;
  dragDrop: "basic" | "advanced";
  ssl: boolean;
  hosting: boolean | "premium";
  seoTools: boolean;
  prioritySupport: boolean;
}

export interface TierLimits {
  maxTemplates: number;
  maxPages: number;
  maxStorageMB: number;
  maxProducts: number;
  bandwidthGB: number;
  teamMembers: number;
  customDomains: number;
}

export const TIER_FEATURES: Record<string, TierFeatures> = {
  lite: {
    templates: 5,
    pages: 10,
    storageMB: 500,
    customDomain: false,
    ecommerce: false,
    analytics: "basic",
    support: "email",
    aiGeneration: true,
    dragDrop: "basic",
    ssl: true,
    hosting: true,
    seoTools: false,
    prioritySupport: false,
  },
  pro: {
    templates: 20,
    pages: "unlimited",
    storageMB: 5120,
    customDomain: true,
    ecommerce: true,
    analytics: "advanced",
    support: "priority",
    aiGeneration: true,
    dragDrop: "advanced",
    ssl: true,
    hosting: "premium",
    seoTools: true,
    prioritySupport: true,
  },
};

export const TIER_LIMITS: Record<string, TierLimits> = {
  lite: {
    maxTemplates: 5,
    maxPages: 10,
    maxStorageMB: 500,
    maxProducts: 0,
    bandwidthGB: 10,
    teamMembers: 1,
    customDomains: 0,
  },
  pro: {
    maxTemplates: 20,
    maxPages: 999,
    maxStorageMB: 5120,
    maxProducts: 100,
    bandwidthGB: 100,
    teamMembers: 5,
    customDomains: 3,
  },
};

export function getTierFeatures(tier: string): TierFeatures {
  return TIER_FEATURES[tier] || TIER_FEATURES.lite;
}

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.lite;
}

export function canAccessFeature(tier: string, feature: keyof TierFeatures): boolean {
  const features = getTierFeatures(tier);
  return features[feature] === true;
}

export interface UsageData {
  catalogueItems: number;
  pages?: number;
  storageMB?: number;
  templates?: number;
  customDomains?: number;
}

export interface WebsiteBuilderPermissions {
  hasAccess: boolean;
  tier: string;
  status?: string;
  trialDaysLeft?: number;
  monthlyFee?: number;
  maintenanceFee?: number;
  features: TierFeatures;
  limits: TierLimits;
}

export function checkPermissions(
  subscription: { plan: string; status: string; trial_end: string; monthly_fee: number } | null,
  proRequest: { payment_status: string; status: string; monthly_maintenance: number } | null,
): WebsiteBuilderPermissions {
  const hasPro = proRequest?.payment_status === "paid";
  const tier = hasPro ? "pro" : subscription ? subscription.plan : "none";

  if (!subscription && !hasPro) {
    return {
      hasAccess: false,
      tier: "none",
      features: getTierFeatures("lite"),
      limits: getTierLimits("lite"),
    };
  }

  const trialDaysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    hasAccess: true,
    tier,
    status: hasPro ? proRequest!.status : subscription!.status,
    trialDaysLeft,
    monthlyFee: subscription?.monthly_fee,
    maintenanceFee: hasPro ? proRequest!.monthly_maintenance : undefined,
    features: getTierFeatures(tier),
    limits: getTierLimits(tier),
  };
}

/**
 * Calculate prorated upgrade cost from Lite to Pro.
 * Applies a discount for unused trial time (max 25% off).
 */
export function calculateUpgradeCost(
  subscription: { status: string; trial_start: string; trial_end: string; monthly_fee: number } | null,
  proOneTimeFee = 199,
): { upgradeAmount: number; platformFee: number } {
  if (!subscription || subscription.status !== "trial") {
    return { upgradeAmount: proOneTimeFee, platformFee: 140 };
  }

  const trialStart = new Date(subscription.trial_start).getTime();
  const trialEnd = new Date(subscription.trial_end).getTime();
  const now = Date.now();
  const totalDays = (trialEnd - trialStart) / (1000 * 60 * 60 * 24);
  const daysUsed = (now - trialStart) / (1000 * 60 * 60 * 24);
  const unusedRatio = Math.max(0, (totalDays - daysUsed) / totalDays);
  const discount = Math.min(subscription.monthly_fee * unusedRatio, 50);

  return {
    upgradeAmount: Math.max(proOneTimeFee * 0.75, proOneTimeFee - discount),
    platformFee: Math.max(100, 140 - discount * 0.7),
  };
}

export function getUsagePercentages(tier: string, usage: UsageData) {
  const limits = getTierLimits(tier);
  return {
    products: limits.maxProducts === 0 ? 100 : Math.min(100, (usage.catalogueItems / limits.maxProducts) * 100),
    pages: limits.maxPages === 999 ? 0 : usage.pages ? Math.min(100, (usage.pages / limits.maxPages) * 100) : 0,
    storage: usage.storageMB ? Math.min(100, (usage.storageMB / limits.maxStorageMB) * 100) : 0,
    templates: usage.templates ? Math.min(100, (usage.templates / limits.maxTemplates) * 100) : 0,
    customDomains: limits.customDomains === 0 ? 100 : usage.customDomains ? Math.min(100, (usage.customDomains / limits.customDomains) * 100) : 0,
  };
}

/**
 * Check if a specific feature operation is allowed.
 * Returns { allowed, message } for UI feedback.
 */
export function checkFeatureAccess(
  tier: string,
  feature: "customDomain" | "ecommerce" | "seoTools" | "prioritySupport",
): { allowed: boolean; message?: string } {
  const features = getTierFeatures(tier);
  const allowed = features[feature] === true;
  if (allowed) return { allowed: true };

  const featureLabels: Record<string, string> = {
    customDomain: "Custom domains",
    ecommerce: "E-commerce",
    seoTools: "SEO tools",
    prioritySupport: "Priority support",
  };

  return {
    allowed: false,
    message: `${featureLabels[feature] || feature} is a Pro feature. Please upgrade to Pro.`,
  };
}
