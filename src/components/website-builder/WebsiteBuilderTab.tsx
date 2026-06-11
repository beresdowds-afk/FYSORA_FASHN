import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Globe, Zap, Link2, Eye, Plus, Trash2, Edit2, Save, X, Package, Layers,
  ExternalLink, Copy, Key, Crown, Clock, CheckCircle2, AlertCircle,
  ArrowRight, Sparkles, Star, Lock, Palette, Building2, Book
} from "lucide-react";
import OrgBrandingPanel from "./OrgBrandingPanel";
import SocialSyncPanel from "@/components/catalogue/SocialSyncPanel";
import OrgMediaGroupingManager from "@/components/catalogue/OrgMediaGroupingManager";
import CompanyOfficersPanel from "./CompanyOfficersPanel";
import WebsiteBuilderManual from "./WebsiteBuilderManual";
import WebsiteTemplatePicker from "./WebsiteTemplatePicker";
import PublishWebsiteButton, { type PublishWebsiteButtonHandle } from "./PublishWebsiteButton";
import MediaDropzone from "@/components/shared/MediaDropzone";
import { PaymentFlowTracker } from "@/components/payments/PaymentFlowTracker";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import type { AppRole } from "@/hooks/useOrganization";
import { useOrgSync } from "@/hooks/useOrgSync";
import { getTierFeatures, getTierLimits, checkFeatureAccess, calculateUpgradeCost, isActiveStatus } from "./tierConfig";
import { resolvePublicSiteUrl, isExternalSiteUrl } from "@/lib/publicSiteUrl";


interface WebsiteSettings {
  id?: string;
  org_id: string;
  is_enabled: boolean;
  mode: "auto_builder" | "custom_integration";
  tagline: string;
  hero_description: string;
  hero_image_url: string;
  brand_color: string;
  accent_color: string;
  theme: "dark" | "light";
  api_key: string;
  api_secret: string;
  webhook_url: string;
  instagram_url: string;
  facebook_url: string;
  whatsapp_number: string;
  twitter_url: string;
  linkedin_url: string;
  tiktok_url: string;
  youtube_url: string;
  public_website_url: string;
}

interface CatalogueItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  is_available: boolean;
  sort_order: number;
  tags: string[] | null;
}

interface WebsiteSubscription {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  trial_start: string;
  trial_end: string;
  activated_at: string | null;
  cancelled_at: string | null;
  monthly_fee: number;
  platform_fee: number;
  gateway_reference: string | null;
}

interface WebsiteRequest {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  payment_status: string;
  one_time_fee: number;
  platform_fee: number;
  monthly_maintenance: number;
  gateway_reference: string | null;
  completed_at: string | null;
  website_url: string | null;
}

interface WebsiteBuilderTabProps {
  org: { id: string; name: string; slug: string; currency?: string | null };
  role: AppRole | null;
}

const defaultSettings = (orgId: string): WebsiteSettings => ({
  org_id: orgId,
  is_enabled: true,
  mode: "auto_builder",
  tagline: "",
  hero_description: "",
  hero_image_url: "",
  brand_color: "#8B5CF6",
  accent_color: "#D4AF37",
  theme: "dark",
  api_key: "",
  api_secret: "",
  webhook_url: "",
  instagram_url: "",
  facebook_url: "",
  whatsapp_number: "",
  twitter_url: "",
  linkedin_url: "",
  tiktok_url: "",
  youtube_url: "",
  public_website_url: "",
});

// ── Tier Banner with Usage ────────────────────────────────────────────────────
const TierBanner = ({
  subscription,
  proRequest,
  catalogueCount,
  onUpgrade,
}: {
  subscription: WebsiteSubscription | null;
  proRequest: WebsiteRequest | null;
  catalogueCount: number;
  onUpgrade: () => void;
}) => {
  const isGrandfathered = subscription?.status === "grandfathered" || subscription?.status === "special";
  const tier = proRequest?.payment_status === "paid" ? "pro" : isGrandfathered ? "pro" : subscription ? subscription.plan : null;
  if (!tier) return null;

  const limits = getTierLimits(tier);
  const features = getTierFeatures(tier);
  const isLite = tier === "lite";
  const isTrial = subscription?.status === "trial";

  const trialDaysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;


  return (
    <div className={`rounded-xl border p-4 mb-6 space-y-3 ${
      isTrial ? "bg-destructive/5 border-destructive/20" :
      isLite ? "bg-primary/5 border-primary/20" :
      "bg-accent/5 border-accent/20"
    }`}>
      {/* Top row: badge + status + trial countdown */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            isLite ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent"
          }`}>
            {tier.toUpperCase()}
          </span>
          <span className="text-sm font-medium">
            {isTrial ? `Trial · ${trialDaysLeft} days left` : subscription?.status === "active" ? "Active" : proRequest?.status === "completed" ? "Live" : "Setup In Progress"}
          </span>
        </div>
        {isLite && (
          <Button variant="outline" size="sm" className="text-xs h-7 border-accent text-accent hover:bg-accent/10" onClick={onUpgrade}>
            <Crown size={12} className="mr-1" /> Upgrade to Pro
          </Button>
        )}
      </div>

      {/* Usage bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <UsageBar label="Templates" used={1} max={limits.maxTemplates} />
        <UsageBar label="Pages" used={0} max={limits.maxPages} unlimited={limits.maxPages === 999} />
        <UsageBar label="Catalogue" used={catalogueCount} max={limits.maxProducts} locked={limits.maxProducts === 0} />
        <UsageBar label="Storage" used={0} max={limits.maxStorageMB} suffix="MB" />
      </div>

      {/* Feature highlights */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Custom Domain", available: features.customDomain },
          { label: "E-commerce", available: features.ecommerce },
          { label: "SEO Tools", available: features.seoTools },
          { label: "Priority Support", available: features.prioritySupport },
        ].map((f) => (
          <span key={f.label} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
            f.available
              ? "bg-green-500/10 text-green-600"
              : "bg-muted text-muted-foreground"
          }`}>
            {f.available ? <CheckCircle2 size={10} /> : <Lock size={10} />}
            {f.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Usage Bar ─────────────────────────────────────────────────────────────────
const UsageBar = ({
  label, used, max, suffix, unlimited, locked,
}: {
  label: string; used: number; max: number; suffix?: string; unlimited?: boolean; locked?: boolean;
}) => {
  const percent = unlimited ? 0 : locked ? 100 : max === 0 ? 0 : Math.min(100, (used / max) * 100);
  const isWarning = percent >= 80;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {locked ? (
            <span className="flex items-center gap-0.5"><Lock size={10} /> N/A</span>
          ) : unlimited ? (
            "∞"
          ) : (
            `${used}/${max}${suffix ? ` ${suffix}` : ""}`
          )}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            locked ? "bg-muted-foreground/30" :
            isWarning ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${locked ? 100 : percent}%` }}
        />
      </div>
    </div>
  );
};

// ── Upgrade Prompt ────────────────────────────────────────────────────────────
const UpgradePrompt = ({ featureName, onUpgrade }: { featureName: string; onUpgrade: () => void }) => (
  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <Lock size={16} className="text-accent shrink-0" />
      <div>
        <p className="text-sm font-medium">{featureName} requires Pro</p>
        <p className="text-xs text-muted-foreground">Upgrade to unlock this feature and more.</p>
      </div>
    </div>
    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0" onClick={onUpgrade}>
      <Crown size={12} className="mr-1" /> Upgrade
    </Button>
  </div>
);

// ── Subscription Status Banner ────────────────────────────────────────────────
const SubscriptionBanner = ({
  subscription,
  proRequest,
}: {
  subscription: WebsiteSubscription | null;
  proRequest: WebsiteRequest | null;
}) => {
  if (!subscription && !proRequest) return null;

  const trialDaysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (proRequest && proRequest.payment_status === "paid") {
    return (
      <div className="rounded-xl bg-accent/10 border border-accent/30 p-4 mb-6 flex items-start gap-3">
        <Crown size={18} className="text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-accent">
            {proRequest.status === "completed" ? "Website Builder Pro — Active" : "Website Builder Pro — Setup In Progress"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {proRequest.status === "completed"
              ? `Your custom website is live at ${proRequest.website_url || "your custom domain"}.`
              : "Our team has received your payment and will contact you within 24 hours to set up your custom website."}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium shrink-0">PRO</span>
      </div>
    );
  }

  if (subscription && subscription.status === "trial") {
    return (
      <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${trialDaysLeft <= 30 ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"}`}>
        <Clock size={18} className={`shrink-0 mt-0.5 ${trialDaysLeft <= 30 ? "text-destructive" : "text-primary"}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Website Builder Lite — Trial Period</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {trialDaysLeft > 0
              ? `${trialDaysLeft} days remaining in your 6-month trial. After trial ends, $17/month applies.`
              : "Your trial period has ended. Please pay to continue."}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium shrink-0">TRIAL</span>
      </div>
    );
  }

  if (subscription && subscription.status === "active") {
    return (
      <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-6 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-green-600">Website Builder Lite — Active</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your website is live. Monthly subscription: $17/month.</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-medium shrink-0">LITE</span>
      </div>
    );
  }

  if (subscription && (subscription.status === "grandfathered" || subscription.status === "special")) {
    return (
      <div className="rounded-xl bg-accent/10 border border-accent/30 p-4 mb-6 flex items-start gap-3">
        <Crown size={18} className="text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-accent">Website Builder Pro — Grandfathered</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You have Pro access as an early adopter. Thank you for being with us! {subscription.status === "special" ? "Special discount applied." : "No charges apply."}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium shrink-0">PRO</span>
      </div>
    );
  }

  return null;
};

// ── Pricing Cards ─────────────────────────────────────────────────────────────
const PricingSection = ({
  org,
  subscription,
  proRequest,
  canEdit,
  onPaymentStarted,
}: {
  org: { id: string; name: string; slug: string; currency?: string | null };
  subscription: WebsiteSubscription | null;
  proRequest: WebsiteRequest | null;
  canEdit: boolean;
  onPaymentStarted: () => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<"lite" | "pro" | "pro-lite" | null>(null);
  const paymentFlow = usePaymentFlow();

  const hasActiveLite = subscription && (subscription.status === "trial" || subscription.status === "active");
  const hasActivePro = proRequest && proRequest.payment_status === "paid"
    || (subscription && (subscription.status === "grandfathered" || subscription.status === "special"));

  const handleSubscribe = async (plan: "lite" | "pro" | "pro-lite") => {
    if (!canEdit) return;
    setLoading(plan);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Please log in", variant: "destructive" }); return; }

      // Check if org has a website exemption — activate for free
      const exemptionType = plan === "pro" || plan === "pro-lite" ? "website_builder_pro" : "website_builder";
      const { data: exemptionData } = await supabase
        .from("org_fee_exemptions")
        .select("id")
        .eq("org_id", org.id)
        .eq("exemption_type", exemptionType)
        .eq("is_active", true)
        .maybeSingle();

      // Also check generic website_builder exemption as fallback
      let hasExemption = !!exemptionData;
      if (!hasExemption && (plan === "pro" || plan === "pro-lite")) {
        const { data: fallback } = await supabase
          .from("org_fee_exemptions")
          .select("id")
          .eq("org_id", org.id)
          .eq("exemption_type", "website_builder")
          .eq("is_active", true)
          .maybeSingle();
        hasExemption = !!fallback;
      }

      if (hasExemption) {
        // Free activation — create subscription/request directly without payment
        const exemptRef = `EXEMPT-${org.id.substring(0, 8)}`;
        let requestId: string | undefined;

        if (plan === "lite") {
          const trialEnd = new Date();
          trialEnd.setFullYear(trialEnd.getFullYear() + 10);
          await supabase.from("website_builder_subscriptions").upsert({
            org_id: org.id,
            plan: "lite",
            status: "active",
            trial_start: new Date().toISOString(),
            trial_end: trialEnd.toISOString(),
            monthly_fee: 0,
            platform_fee: 0,
            payment_gateway: "exemption",
            gateway_reference: exemptRef,
          }, { onConflict: "org_id" });
          const { data: reqData } = await supabase.from("website_builder_requests").insert({
            org_id: org.id,
            plan: "lite",
            status: "pending",
            one_time_fee: 0,
            platform_fee: 0,
            monthly_maintenance: 0,
            payment_gateway: "exemption",
            gateway_reference: exemptRef,
            payment_status: "paid",
          } as any).select("id").single();
          requestId = reqData?.id;
        } else {
          const { data: reqData } = await supabase.from("website_builder_requests").insert({
            org_id: org.id,
            plan: plan,
            status: "pending",
            one_time_fee: 0,
            platform_fee: 0,
            monthly_maintenance: 0,
            payment_gateway: "exemption",
            gateway_reference: exemptRef,
            payment_status: "paid",
          }).select("id").single();
          requestId = reqData?.id;
        }

        // Create waived invoice for the exempted plan
        const planPrices: Record<string, number> = { lite: 17, pro: 339, "pro-lite": 149 };
        await supabase.from("subscription_invoices").insert({
          org_id: org.id,
          user_id: session.user.id,
          invoice_number: `INV-WB-${Date.now().toString(36).toUpperCase()}`,
          invoice_type: "website_builder",
          description: `Website Builder ${plan.charAt(0).toUpperCase() + plan.slice(1)} - Fee Waived`,
          amount: planPrices[plan] || 0,
          currency: "USD",
          status: "waived",
          payment_method: "exemption",
          gateway_reference: exemptRef,
          related_entity_type: "website_builder_request",
          related_entity_id: requestId || null,
          waiver_reason: "Complimentary access granted by platform admin",
          paid_at: new Date().toISOString(),
        } as any);

        // Submit activation request to super admin DNS/Email portal
        toast({ title: "Website Builder activated!", description: "Your organization has complimentary access. Activation request submitted to admin portal." });
        onPaymentStarted();
        return;
      }

      const result = await paymentFlow.initializePayment("initialize-website-payment", {
        org_id: org.id,
        plan,
        callback_url: `${window.location.origin}/dashboard`,
      });

      if (!result) return;

      // Open payment gateway
      window.open(result.checkoutUrl, "_blank");

      // Auto-verify after user returns from payment
      toast({ title: "Payment window opened", description: "Complete payment then wait for automatic verification." });

      // Poll for verification
      setTimeout(async () => {
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        if (!verifySession) return;
        await paymentFlow.pollVerification("verify-website-payment", {
          reference: result.reference,
          org_id: org.id,
          plan,
        }, 8, 4000);
        onPaymentStarted();
      }, 5000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      <div>
        <h3 className="font-heading font-bold text-lg">Website Builder Plans</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose a plan to unlock your professional fashion website on FYSORA FASHN (Fashion Stitches Africa).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Lite Plan */}
        <div className={`relative rounded-2xl border-2 p-6 transition-all ${hasActiveLite ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
          {hasActiveLite && (
            <div className="absolute -top-3 left-4">
              <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">Current Plan</span>
            </div>
          )}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-primary" />
              <h4 className="font-heading font-bold text-base">Website Builder Lite</h4>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">$17</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              + $10/month platform fee · <strong className="text-primary">6-month free trial</strong>
            </p>
          </div>

          <ul className="space-y-2 mb-6 text-sm">
            {[
              "Auto-generated branded website",
              "Public URL on fashionstitchesafrica.com",
              "Filterable product catalogue",
              "Appointment booking form",
              "Mobile responsive design",
              "SSL certificate & hosting",
              "Dashboard integration",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 size={13} className="text-green-500 shrink-0" /> {f}
              </li>
            ))}
            {[
              "Custom domain support",
              "E-commerce module",
              "Priority support",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground/50">
                <X size={13} className="shrink-0" /> {f}
              </li>
            ))}
          </ul>

          {hasActiveLite ? (
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <CheckCircle2 size={16} /> Plan Active
            </div>
          ) : (
            <Button
              variant="hero"
              className="w-full"
              onClick={() => handleSubscribe("lite")}
              disabled={!!loading || !canEdit || !!hasActivePro}
            >
              {loading === "lite" ? "Redirecting to payment…" : "Start 6-Month Trial — $27"}
              {loading !== "lite" && <ArrowRight size={14} />}
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-2 text-center">
            First payment: $27 (includes $10 platform fee)
          </p>
        </div>

        {/* Pro Plan */}
        <div className={`relative rounded-2xl border-2 p-6 transition-all ${hasActivePro ? "border-accent/50 bg-accent/5" : "border-accent/40 bg-gradient-to-br from-card to-accent/5 hover:border-accent/60"}`}>
          <div className="absolute -top-3 right-4">
            <span className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Star size={10} /> Best Value
            </span>
          </div>
          {hasActivePro && (
            <div className="absolute -top-3 left-4">
              <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-medium">Current Plan</span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown size={18} className="text-accent" />
              <h4 className="font-heading font-bold text-base">Website Builder Pro</h4>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">$199</span>
              <span className="text-sm text-muted-foreground">one-time</span>
              <span className="text-lg font-semibold ml-2">+ $7</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              + $140 one-time platform fee · Total today: <strong className="text-foreground">$339</strong>
            </p>
          </div>

          <ul className="space-y-2 mb-6 text-sm">
            {[
              "Everything in Lite",
              "20+ premium templates",
              "Custom domain support (+$2/mo)",
              "Full e-commerce module",
              "SEO optimization tools",
              "Analytics dashboard",
              "Priority 24/7 support",
              "Dedicated setup by our team",
              "Premium hosting included",
              "Social media integrations",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 size={13} className="text-accent shrink-0" /> {f}
              </li>
            ))}
          </ul>

          {hasActivePro ? (
            <div className="flex items-center gap-2 text-sm text-accent font-medium">
              <CheckCircle2 size={16} />
              {proRequest?.status === "completed" ? "Website Live" : "Setup In Progress"}
            </div>
          ) : (
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              onClick={() => handleSubscribe("pro")}
              disabled={!!loading || !canEdit || !!hasActiveLite}
            >
              {loading === "pro" ? "Redirecting to payment…" : (
                <>
                  <Sparkles size={14} /> Get Pro — $339 today
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Our team contacts you within 24h after payment
          </p>
        </div>

        {/* Pro-Lite Plan */}
        <div className={`relative rounded-2xl border-2 p-6 transition-all ${
          proRequest?.plan === "pro-lite" && proRequest?.payment_status === "paid"
            ? "border-blue-500/50 bg-blue-500/5"
            : "border-border bg-card hover:border-blue-500/30"
        }`}>
          {proRequest?.plan === "pro-lite" && proRequest?.payment_status === "paid" && (
            <div className="absolute -top-3 left-4">
              <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-medium">Current Plan</span>
            </div>
          )}
          <div className="absolute -top-3 right-4">
            <span className="text-xs bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Link2 size={10} /> Integrate
            </span>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 size={18} className="text-blue-500" />
              <h4 className="font-heading font-bold text-base">Website Builder Pro-Lite</h4>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">$99</span>
              <span className="text-sm text-muted-foreground">one-time</span>
              <span className="text-lg font-semibold ml-2">+ $5</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              + $50 one-time platform fee · Total today: <strong className="text-foreground">$149</strong>
            </p>
          </div>

          <ul className="space-y-2 mb-6 text-sm">
            {[
              "Link your existing website",
              "FSA platform integration",
              "AI Measurement tools added",
              "Virtual Try-On integration",
              "Video consultation widget",
              "Booking system integration",
              "SEO optimization audit",
              "SSL & performance check",
              "Missing feature evaluation",
              "Ongoing platform sync",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 size={13} className="text-blue-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>

          {proRequest?.plan === "pro-lite" && proRequest?.payment_status === "paid" ? (
            <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
              <CheckCircle2 size={16} />
              {proRequest.status === "completed" ? "Integration Live" : "Evaluation In Progress"}
            </div>
          ) : (
            <Button
              className="w-full bg-blue-500 text-white hover:bg-blue-600 font-semibold"
              onClick={() => handleSubscribe("pro-lite")}
              disabled={!!loading || !canEdit || !!hasActivePro || !!hasActiveLite}
            >
              {loading === "pro-lite" ? "Redirecting to payment…" : (
                <>
                  <Link2 size={14} /> Get Pro-Lite — $149 today
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-2 text-center">
            We evaluate & integrate your site within 48h
          </p>
        </div>
      </div>

      {/* Note about Paystack key */}
      {canEdit && !hasActiveLite && !hasActivePro && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-yellow-500" />
          <span>
            Payments are processed via <strong>Paystack</strong>. Make sure your Paystack secret key is configured in your{" "}
            <strong>Keys & Secrets</strong> settings before subscribing.
          </span>
        </div>
      )}

      {/* Payment Flow Tracker — shows progress during payment lifecycle */}
      <PaymentFlowTracker
        step={paymentFlow.step}
        invoiceNumber={paymentFlow.invoiceNumber}
        activated={paymentFlow.activated}
        error={paymentFlow.error}
        className="mt-4"
      />
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const WebsiteBuilderTab = ({ org, role }: WebsiteBuilderTabProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebsiteSettings>(defaultSettings(org.id));
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [subscription, setSubscription] = useState<WebsiteSubscription | null>(null);
  const [proRequest, setProRequest] = useState<WebsiteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"plans" | "general" | "branding" | "company" | "catalogue" | "library" | "integration" | "guide" | "templates">("plans");
  const [orgDetails, setOrgDetails] = useState<{ description?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null }>({});
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  // Imperative handle to PublishWebsiteButton — used to silently auto-push
  // saved changes to the configured public custom-domain site.
  const publishRef = useRef<PublishWebsiteButtonHandle | null>(null);

  // Bidirectional sync — auto-reload dashboard data when apps/websites push changes
  const { broadcastSync } = useOrgSync(org.id, (action) => {
    console.log(`[Dashboard] Sync event received: ${action}, reloading data...`);
    load();
    toast({ title: "Data synced", description: `${action.replace(/_/g, " ")} synced from connected app/website.` });
    // If this org points to a custom-domain / non-native public site, push
    // the latest content to it whenever Our Story-relevant data changes.
    const externalUrl = ((settings as any).public_website_url || "").trim();
    const storyRelated = action === "officers_updated"
      || action === "settings_updated"
      || action === "org_details_updated"
      || action === "branding_updated"
      || action === "catalogue_updated";
    if (externalUrl && storyRelated && publishRef.current) {
      // Debounce so a burst of edits coalesces into one publish
      if ((window as any).__fsaPublishTimer) {
        clearTimeout((window as any).__fsaPublishTimer);
      }
      (window as any).__fsaPublishTimer = setTimeout(() => {
        publishRef.current?.publish({ silent: true }).catch(() => {});
      }, 1500);
    }
  });

  const canEdit = role === "org_admin" || role === "manager" || role === "super_admin";
  const nativeWebsiteUrl = `${window.location.origin}/site/${org.slug}`;
  const publicUrlRaw = ((settings as any).public_website_url || "").trim();
  const resolvedPublicUrl = publicUrlRaw
    ? resolvePublicSiteUrl(org.slug, publicUrlRaw)
    : nativeWebsiteUrl;
  const isExternalPublic = isExternalSiteUrl(resolvedPublicUrl);
  // Suggested URL: approved external domain → custom_integration webhook_url
  const [domainSuggestion, setDomainSuggestion] = useState<string>("");

  const hasActivePlan = (subscription && isActiveStatus(subscription.status))
    || (proRequest && proRequest.payment_status === "paid");
  const isGrandfathered = subscription?.status === "grandfathered" || subscription?.status === "special";
  const currentTier = proRequest?.payment_status === "paid" ? "pro" : isGrandfathered ? "pro" : subscription ? subscription.plan : "none";
  const isLiteTier = currentTier === "lite";

  const load = async () => {
    setLoading(true);

    const [wsResult, catResult, subResult, reqResult] = await Promise.all([
      supabase.from("org_websites").select("*").eq("org_id", org.id).single(),
      supabase.from("org_catalogue_items").select("*").eq("org_id", org.id).order("sort_order"),
      supabase.from("website_builder_subscriptions").select("*").eq("org_id", org.id).maybeSingle(),
      supabase.from("website_builder_requests").select("*").eq("org_id", org.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (wsResult.data) {
      const ws = wsResult.data as any;
      setSettings({
        ...defaultSettings(org.id),
        ...ws,
        tagline: ws.tagline || "",
        hero_description: ws.hero_description || "",
        hero_image_url: ws.hero_image_url || "",
        api_key: ws.api_key || "",
        api_secret: ws.api_secret || "",
        webhook_url: ws.webhook_url || "",
        instagram_url: ws.instagram_url || "",
        facebook_url: ws.facebook_url || "",
        whatsapp_number: ws.whatsapp_number || "",
        twitter_url: ws.twitter_url || "",
        linkedin_url: ws.linkedin_url || "",
        tiktok_url: ws.tiktok_url || "",
        youtube_url: ws.youtube_url || "",
        mode: (ws.mode as "auto_builder" | "custom_integration") || "auto_builder",
        theme: (ws.theme as "dark" | "light") || "dark",
        font_heading: ws.font_heading || "Inter",
        font_body: ws.font_body || "Inter",
        color_palette: ws.color_palette || {},
        favicon_url: ws.favicon_url || null,
      });
    }

    // Load org details for branding panel
    const { data: orgData } = await supabase.from("organizations").select("description, email, phone, address, logo_url").eq("id", org.id).single();
    if (orgData) setOrgDetails(orgData);

    setCatalogue((catResult.data || []) as CatalogueItem[]);
    if (subResult.data) setSubscription(subResult.data as WebsiteSubscription);
    if (reqResult.data) setProRequest(reqResult.data as WebsiteRequest);

    setLoading(false);
  };

  // Pull suggested URL from approved/provisioned external domain_requests
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("domain_requests")
        .select("domain_name, domain_type, status")
        .eq("org_id", org.id)
        .eq("domain_type", "external")
        .in("status", ["approved", "provisioned", "active"])
        .order("created_at", { ascending: false })
        .limit(1);
      const row = (data && data[0]) as any;
      if (row?.domain_name) setDomainSuggestion(`https://${row.domain_name.replace(/^https?:\/\//i, "")}`);
    })();
  }, [org.id]);

  useEffect(() => { load(); }, [org.id]);

  const handleSaveSettings = async () => {
    // Save guard: require active plan
    if (!hasActivePlan) {
      toast({
        title: "No active plan",
        description: "You need an active Website Builder plan to save settings. Choose a plan first.",
        variant: "destructive",
      });
      setActiveSection("plans");
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      org_id: org.id,
      is_enabled: settings.is_enabled,
      mode: settings.mode,
      tagline: settings.tagline || null,
      hero_description: settings.hero_description || null,
      hero_image_url: settings.hero_image_url || null,
      brand_color: settings.brand_color,
      accent_color: settings.accent_color,
      theme: settings.theme,
      api_key: settings.api_key || null,
      api_secret: settings.api_secret || null,
      webhook_url: settings.webhook_url || null,
      instagram_url: settings.instagram_url || null,
      facebook_url: settings.facebook_url || null,
      whatsapp_number: settings.whatsapp_number || null,
      font_heading: (settings as any).font_heading || "Inter",
      font_body: (settings as any).font_body || "Inter",
      color_palette: (settings as any).color_palette || {},
      favicon_url: (settings as any).favicon_url || null,
      vision_statement: (settings as any).vision_statement || null,
      mission_statement: (settings as any).mission_statement || null,
      our_story: (settings as any).our_story || null,
      public_website_url: ((settings as any).public_website_url || "").trim() || null,
    };

    // Save org details if changed
    if (orgDetails) {
      await supabase.from("organizations").update({
        description: orgDetails.description || null,
        email: orgDetails.email || null,
        phone: orgDetails.phone || null,
        address: orgDetails.address || null,
      }).eq("id", org.id);
    }

    const { error } = await supabase
      .from("org_websites")
      .upsert(payload as any, { onConflict: "org_id" });

    setSaving(false);
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Website settings saved!" });
      broadcastSync("settings_updated");
      load();

      // Auto-sync to the public custom-domain (non-native) site whenever
      // a public_website_url is configured — so Our Story / branding edits
      // saved here propagate to e.g. gabulkfashionstudio.org.ng immediately.
      const externalUrl = ((settings as any).public_website_url || "").trim();
      if (externalUrl && publishRef.current) {
        publishRef.current.publish({ silent: true }).catch(() => {});
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("org_catalogue_items").delete().eq("id", id);
    toast({ title: "Item deleted" });
    broadcastSync("catalogue_updated");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-bold text-2xl">Website Builder</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Create your public website or connect your own.</p>
        </div>
        {hasActivePlan && (
          <div className="flex gap-2 flex-wrap">
            <PublishWebsiteButton ref={publishRef} org={org} disabled={!canEdit} />
            <a href={resolvedPublicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Eye size={14} className="mr-1.5" /> Preview
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(resolvedPublicUrl); toast({ title: "Link copied!" }); }}
            >
              <Copy size={14} className="mr-1.5" /> Copy Link
            </Button>
          </div>
        )}
      </div>

      {/* Subscription status banner */}
      <SubscriptionBanner subscription={subscription} proRequest={proRequest} />

      {/* Tier banner with usage tracking */}
      <TierBanner
        subscription={subscription}
        proRequest={proRequest}
        catalogueCount={catalogue.length}
        onUpgrade={() => setActiveSection("plans")}
      />
      {/* Website URL display (only if has active plan) */}
      {hasActivePlan && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-6 flex items-center gap-3">
          <Globe size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Your public website URL
              {isExternalPublic && <span className="ml-2 text-[10px] uppercase tracking-wider text-accent font-semibold">External</span>}
            </p>
            <a href={resolvedPublicUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate">
              {resolvedPublicUrl} <ExternalLink size={12} />
            </a>
            {isExternalPublic && (
              <p className="text-[11px] text-muted-foreground mt-1">
                FYSORA FASHN routes all visitor links for {org.name} to this public-facing website.
                Native page still available at <code className="text-[10px]">{nativeWebsiteUrl}</code>.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-2 h-2 rounded-full ${settings.is_enabled ? "bg-green-500" : "bg-muted-foreground"}`} />
            <span className="text-xs text-muted-foreground">{settings.is_enabled ? "Live" : "Disabled"}</span>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {[
          { id: "plans" as const, icon: Crown, label: "Plans" },
          { id: "general" as const, icon: Globe, label: "General" },
          { id: "branding" as const, icon: Palette, label: "Branding" },
          { id: "company" as const, icon: Building2, label: "Company Info" },
          { id: "catalogue" as const, icon: Package, label: "Catalogue" },
          { id: "library" as const, icon: Layers, label: "Library" },
          { id: "templates" as const, icon: Sparkles, label: "Templates" },
          { id: "integration" as const, icon: Link2, label: "Integration" },
          { id: "guide" as const, icon: Book, label: "User Guide" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeSection === s.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <s.icon size={14} /> {s.label}
            {s.id === "plans" && (subscription || proRequest) && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* ── Plans ─────────────────────────────────────────────── */}
      {activeSection === "plans" && (
        <PricingSection
          org={org}
          subscription={subscription}
          proRequest={proRequest}
          canEdit={canEdit}
          onPaymentStarted={() => {
            toast({
              title: "Payment Window Opened",
              description: "Complete the payment in the new tab. Come back and refresh to see your plan status.",
            });
          }}
        />
      )}

      {/* ── General Settings ─────────────────────────────────── */}
      {activeSection === "general" && (
        <div className="space-y-6">
          {/* Public-facing website URL — promotes a custom domain or linked site */}
          <div className="rounded-xl bg-card border border-border p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading font-semibold text-base">Public-Facing Website</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When set, every link to {org.name} across FYSORA FASHN — Browse, Catalogue, Tailor pages — opens this URL instead of the native /site/{org.slug} page.
                  Use this to promote your custom domain or linked external website as the official storefront.
                </p>
              </div>
              <Globe size={18} className="text-primary shrink-0 mt-1" />
            </div>
            <div className="flex gap-2">
              <input
                value={(settings as any).public_website_url || ""}
                onChange={(e) => setSettings({ ...settings, public_website_url: e.target.value } as any)}
                disabled={!canEdit}
                placeholder="https://yourdomain.com"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              {domainSuggestion && domainSuggestion !== ((settings as any).public_website_url || "") && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings({ ...settings, public_website_url: domainSuggestion } as any)}
                  title={`Use approved custom domain: ${domainSuggestion}`}
                >
                  Use {domainSuggestion.replace(/^https?:\/\//, "")}
                </Button>
              )}
              {settings.mode === "custom_integration" && settings.webhook_url && settings.webhook_url !== ((settings as any).public_website_url || "") && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings({ ...settings, public_website_url: settings.webhook_url } as any)}
                  title="Use your linked external website URL"
                >
                  Use linked URL
                </Button>
              )}
              {((settings as any).public_website_url || "") && canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings({ ...settings, public_website_url: "" } as any)}
                  title="Clear — fall back to the native /site page"
                >
                  Clear
                </Button>
              )}
            </div>
            {((settings as any).public_website_url || "").trim() ? (
              <div className="text-[11px] text-muted-foreground">
                Visitors will be sent to <a href={resolvedPublicUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{resolvedPublicUrl}</a>.
                Native page remains reachable at <code>{nativeWebsiteUrl}</code>.
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Leave blank to keep using the native FYSORA FASHN page at <code>{nativeWebsiteUrl}</code>.
              </p>
            )}
            {canEdit && (
              <Button variant="hero" size="sm" onClick={handleSaveSettings} disabled={saving}>
                {saving ? "Saving..." : "Save Public URL"}
              </Button>
            )}
          </div>

          {/* Mode selector */}
          <div className="rounded-xl bg-card border border-border p-6">
            <h3 className="font-heading font-semibold text-base mb-4">Website Mode</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: "auto_builder", icon: Zap, title: "Auto Builder", desc: "We build your website automatically using your organization details and catalogue." },
                { value: "custom_integration", icon: Link2, title: "Custom Integration", desc: "Connect your own external website using our API key & secret for data sync." },
              ].map((opt) => (
                <button
                  key={opt.value}
                  disabled={!canEdit}
                  onClick={() => setSettings({ ...settings, mode: opt.value as "auto_builder" | "custom_integration" })}
                  className={`text-left p-5 rounded-xl border-2 transition-all ${settings.mode === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <opt.icon size={20} className={settings.mode === opt.value ? "text-primary mb-2" : "text-muted-foreground mb-2"} />
                  <p className="font-semibold text-sm mb-1">{opt.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {settings.mode === "auto_builder" && (
            <div className="rounded-xl bg-card border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-base">Website Content</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-muted-foreground">Website enabled</span>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${settings.is_enabled ? "bg-primary" : "bg-muted"}`}
                    onClick={() => canEdit && setSettings({ ...settings, is_enabled: !settings.is_enabled })}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.is_enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tagline</label>
                <input
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. Where African Heritage Meets Contemporary Style"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hero Description</label>
                <textarea
                  value={settings.hero_description}
                  onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Brief description of your brand for the homepage hero section"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hero Image URL</label>
                <input
                  value={settings.hero_image_url}
                  onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                  disabled={!canEdit}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.brand_color} disabled={!canEdit}
                      onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                      className="h-9 w-16 rounded border border-input cursor-pointer"
                    />
                    <input value={settings.brand_color} onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                      disabled={!canEdit} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.accent_color} disabled={!canEdit}
                      onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      className="h-9 w-16 rounded border border-input cursor-pointer"
                    />
                    <input value={settings.accent_color} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      disabled={!canEdit} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instagram URL</label>
                  <input value={settings.instagram_url} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://instagram.com/..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Facebook URL</label>
                  <input value={settings.facebook_url} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://facebook.com/..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp Number</label>
                  <input value={settings.whatsapp_number} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    disabled={!canEdit} placeholder="+234 800 000 0000" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Twitter / X URL</label>
                  <input value={settings.twitter_url} onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://x.com/..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <input value={settings.linkedin_url} onChange={(e) => setSettings({ ...settings, linkedin_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://linkedin.com/company/..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">TikTok URL</label>
                  <input value={settings.tiktok_url} onChange={(e) => setSettings({ ...settings, tiktok_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://tiktok.com/@..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">YouTube URL</label>
                  <input value={settings.youtube_url} onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://youtube.com/@..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Social Media Sync */}
              {canEdit && org && (
                <SocialSyncPanel ownerId={org.id} ownerType="organization" orgId={org.id} />
              )}
            </div>
          )}

          {/* Pro-gated: Custom Domain */}
          {(() => {
            const domainAccess = checkFeatureAccess(currentTier, "customDomain");
            if (!domainAccess.allowed) {
              return <UpgradePrompt featureName="Custom Domain" onUpgrade={() => setActiveSection("plans")} />;
            }
            return (
              <div className="rounded-xl bg-card border border-border p-6 space-y-3">
                <h3 className="font-heading font-semibold text-base">Custom Domain</h3>
                <p className="text-xs text-muted-foreground">Point your own domain to your FYSORA FASHN (Fashion Stitches Africa) website (+$2/mo).</p>
                <input
                  placeholder="yourbrand.com"
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            );
          })()}

          {/* Pro-gated: SEO Tools */}
          {(() => {
            const seoAccess = checkFeatureAccess(currentTier, "seoTools");
            if (!seoAccess.allowed) {
              return <UpgradePrompt featureName="SEO Optimization Tools" onUpgrade={() => setActiveSection("plans")} />;
            }
            return (
              <div className="rounded-xl bg-card border border-border p-6 space-y-3">
                <h3 className="font-heading font-semibold text-base">SEO Tools</h3>
                <p className="text-xs text-muted-foreground">Optimize your website for search engines with meta tags, sitemaps, and more.</p>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Meta Title</label>
                  <input disabled={!canEdit} placeholder="Your Brand | Custom Fashion"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Meta Description</label>
                  <textarea disabled={!canEdit} rows={2} placeholder="Describe your business for search engines..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
                </div>
              </div>
            );
          })()}

          {/* Upgrade cost info for Lite users */}
          {isLiteTier && subscription && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">
              <p className="font-medium flex items-center gap-2 mb-1">
                <Crown size={14} className="text-accent" /> Upgrade to Pro
              </p>
              {(() => {
                const cost = calculateUpgradeCost(subscription as any);
                return (
                  <p className="text-xs text-muted-foreground">
                    Your prorated upgrade cost: <strong className="text-foreground">${cost.upgradeAmount.toFixed(0)}</strong> one-time
                    {" + "}<strong className="text-foreground">${cost.platformFee.toFixed(0)}</strong> platform fee.
                    {subscription.status === "trial" && " Discount applied for unused trial time."}
                  </p>
                );
              })()}
            </div>
          )}

          {canEdit && (
            <Button variant="hero" onClick={handleSaveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Website Settings"}
            </Button>
          )}
        </div>
      )}

      {/* ── Branding ─────────────────────────────────────────── */}
      {activeSection === "branding" && (
        <OrgBrandingPanel
          org={{ ...org, ...orgDetails }}
          websiteSettings={{
            brand_color: settings.brand_color,
            accent_color: settings.accent_color,
            font_heading: (settings as any).font_heading,
            font_body: (settings as any).font_body,
            color_palette: (settings as any).color_palette,
            favicon_url: (settings as any).favicon_url,
            vision_statement: (settings as any).vision_statement,
            mission_statement: (settings as any).mission_statement,
            our_story: (settings as any).our_story,
          }}
          canEdit={canEdit}
          onSettingsChange={(updates) => setSettings({ ...settings, ...updates } as any)}
          onOrgChange={(updates) => setOrgDetails({ ...orgDetails, ...updates })}
          onSave={handleSaveSettings}
          saving={saving}
        />
      )}

      {/* ── Company Info ─────────────────────────────────────── */}
      {activeSection === "company" && (
        <CompanyOfficersPanel orgId={org.id} canEdit={canEdit} />
      )}


      {/* ── Catalogue ────────────────────────────────────────── */}
      {activeSection === "catalogue" && (
        <div className="space-y-4">
          {/* Catalogue limit warning */}
          {(() => {
            const limits = getTierLimits(currentTier);
            const atLimit = limits.maxProducts > 0 && catalogue.length >= limits.maxProducts;
            const nearLimit = limits.maxProducts > 0 && catalogue.length >= limits.maxProducts * 0.8;
            const noEcommerce = limits.maxProducts === 0 && currentTier === "lite";
            if (noEcommerce) return (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm">
                <AlertCircle size={14} className="text-destructive shrink-0" />
                <span>E-commerce catalogue is limited on the Lite plan (0 product slots). Items are display-only.</span>
              </div>
            );
            if (atLimit) return (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-destructive shrink-0" />
                  <span>You've reached your catalogue limit ({limits.maxProducts} items). <strong>Upgrade to Pro</strong> for up to 100 items.</span>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 border-accent text-accent" onClick={() => setActiveSection("plans")}>
                  <Crown size={12} className="mr-1" /> Upgrade
                </Button>
              </div>
            );
            if (nearLimit) return (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-2 text-sm">
                <AlertCircle size={14} className="text-yellow-600 shrink-0" />
                <span>You're using {catalogue.length}/{limits.maxProducts} catalogue slots.</span>
              </div>
            );
            return null;
          })()}

          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Catalogue Items ({catalogue.length})</h3>
            {canEdit && (
              <Button
                variant="hero"
                size="sm"
                disabled={(() => {
                  const limits = getTierLimits(currentTier);
                  return limits.maxProducts > 0 && catalogue.length >= limits.maxProducts;
                })()}
                onClick={() => {
                  if (!hasActivePlan) {
                    toast({ title: "No active plan", description: "Choose a Website Builder plan first.", variant: "destructive" });
                    setActiveSection("plans");
                    return;
                  }
                  setAddingItem(true);
                }}
              >
                <Plus size={14} className="mr-1" /> Add Item
              </Button>
            )}
          </div>

          {(addingItem || editingItem) && (
            <CatalogueItemForm
              item={editingItem}
              orgId={org.id}
              currency={org.currency || "NGN"}
              onSave={() => { setAddingItem(false); setEditingItem(null); load(); }}
              onCancel={() => { setAddingItem(false); setEditingItem(null); }}
            />
          )}

          {catalogue.length === 0 && !addingItem ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Package size={32} className="mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No catalogue items yet. Add items to showcase your work on the website.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogue.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setAddingItem(false); }}>
                          <Edit2 size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                  {item.price != null && (
                    <p className="text-sm font-bold text-primary">{item.price.toLocaleString()} {item.currency}</p>
                  )}
                  <div className={`text-xs px-2 py-0.5 rounded-full w-fit ${item.is_available ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {item.is_available ? "Available" : "Unavailable"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Integration ──────────────────────────────────────── */}
      {activeSection === "integration" && (
        <div className="rounded-xl bg-card border border-border p-6 space-y-6">
          <div>
            <h3 className="font-heading font-semibold text-base mb-1">API Integration</h3>
            <p className="text-xs text-muted-foreground">Use these credentials to connect your own website or app to sync data with FYSORA FASHN (Fashion Stitches Africa).</p>
          </div>

          {/* Upgrade prompt for Lite users on custom integration */}
          {isLiteTier && (
            <UpgradePrompt featureName="Custom Integration & API Access" onUpgrade={() => setActiveSection("plans")} />
          )}

          {settings.mode === "auto_builder" ? (
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
              Switch to <strong className="text-foreground">Custom Integration</strong> mode in the General tab to enable API credentials.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5"><Key size={14} /> API Key</label>
                <div className="flex gap-2">
                  <input
                    value={settings.api_key}
                    onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Your API key for external integration"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(settings.api_key); toast({ title: "Copied!" }); }}>
                    <Copy size={14} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5"><Key size={14} /> API Secret</label>
                <input
                  value={settings.api_secret}
                  onChange={(e) => setSettings({ ...settings, api_secret: e.target.value })}
                  disabled={!canEdit}
                  type="password"
                  placeholder="Your API secret (keep this confidential)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">External Website URL</label>
                <input
                  value={settings.webhook_url}
                  onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                  disabled={!canEdit}
                  placeholder="https://yourwebsite.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">Visitors to your FYSORA FASHN (Fashion Stitches Africa) page will be redirected here.</p>
              </div>

              {canEdit && (
                <Button variant="hero" onClick={handleSaveSettings} disabled={saving}>
                  {saving ? "Saving..." : "Save Integration Settings"}
                </Button>
              )}
            </div>
          )}

          {/* API endpoint reference */}
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold text-sm mb-3">Available API Endpoints</h4>
            <div className="space-y-2">
              {[
                { method: "GET", path: `/api/orgs/${org.slug}/catalogue`, desc: "Fetch catalogue items" },
                { method: "POST", path: `/api/orgs/${org.slug}/consultations`, desc: "Create a consultation booking" },
                { method: "GET", path: `/api/orgs/${org.slug}/profile`, desc: "Fetch organisation profile" },
              ].map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/50">
                  <span className={`px-2 py-0.5 rounded font-mono font-semibold ${ep.method === "GET" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"}`}>{ep.method}</span>
                  <code className="text-muted-foreground font-mono flex-1">{ep.path}</code>
                  <span className="text-muted-foreground">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Templates ────────────────────────────────────────── */}
      {activeSection === "templates" && (
        <WebsiteTemplatePicker
          selectedTemplateId={settings.theme === "light" ? "hertunba-luxe" : "dark-atelier"}
          onSelect={(templateId) => {
            toast({ title: "Template selected", description: `"${templateId}" will be applied when you save settings.` });
          }}
        />
      )}

      {/* ── User Guide ───────────────────────────────────────── */}
      {activeSection === "guide" && (
        <WebsiteBuilderManual
          userRole={role || "org_admin"}
          currentPlan={currentTier as "lite" | "pro" | "pro-lite" | "none"}
          orgName={org.name}
        />
      )}
    </motion.div>
  );
};

// ── Catalogue Item Form ───────────────────────────────────────────────────────
const CatalogueItemForm = ({ item, orgId, currency, onSave, onCancel }: {
  item: CatalogueItem | null;
  orgId: string;
  currency: string;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || "",
    price: item?.price?.toString() || "",
    currency: item?.currency || currency,
    is_available: item?.is_available ?? true,
    tags: item?.tags?.join(", ") || "",
    image_url: item?.image_url || "",
    sort_order: item?.sort_order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);

    const payload = {
      org_id: orgId,
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      price: form.price ? parseFloat(form.price) : null,
      currency: form.currency,
      is_available: form.is_available,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      image_url: form.image_url || null,
      sort_order: form.sort_order,
    };

    const { error } = item
      ? await supabase.from("org_catalogue_items").update(payload).eq("id", item.id)
      : await supabase.from("org_catalogue_items").insert(payload);

    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: item ? "Item updated" : "Item added" }); onSave(); }
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{item ? "Edit Item" : "New Catalogue Item"}</h4>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Bespoke Ankara Senator"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Menswear, Womenswear"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          placeholder="Brief description of this garment/service"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Price</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="85000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Currency</label>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="NGN"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Product Image / Short Video</label>
        <MediaDropzone
          value={form.image_url ? { url: form.image_url, type: "image" } : null}
          onClear={() => setForm({ ...form, image_url: "" })}
          aspect="square"
          label="Drop product image here"
          hint="Or click to browse. PNG, JPG, WebP up to 50MB."
          onUpload={async (file) => {
            const path = `org/${orgId}/catalogue/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
            const { error: upErr } = await supabase.storage.from("garment-images").upload(path, file, { upsert: true });
            if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return null; }
            const { data } = supabase.storage.from("garment-images").getPublicUrl(path);
            setForm((f) => ({ ...f, image_url: data.publicUrl }));
            return data.publicUrl;
          }}
        />
        <input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
          placeholder="…or paste an image URL"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="ankara, bespoke, menswear"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
            className="rounded" />
          <span className="text-sm">Available / Visible on website</span>
        </label>
      </div>

      <div className="flex gap-2">
        <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1" /> {saving ? "Saving..." : "Save Item"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default WebsiteBuilderTab;
