import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Download, Smartphone, Check, Share, ArrowRight, Apple, Chrome, Scissors,
  Volume2, VolumeX, ChevronLeft, ChevronRight, ShoppingBag, Ruler,
  Sparkles, Package, MessageSquare, Crown, Play, Pause, X, Star, Camera,
  CreditCard, Bell, Video, Heart, Zap, Lock
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string | null;
}

interface WebsiteData {
  brand_color: string;
  accent_color: string;
  tagline: string | null;
  hero_image_url: string | null;
  font_heading: string | null;
}

// ─── Feature Tour Steps ────────────────────────────────────────────────────
interface TourFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  narration: string;
  icon: React.ElementType;
  tier: "basic" | "premium";
  color: string;
}

const buildTourFeatures = (orgName: string): TourFeature[] => [
  {
    id: "welcome",
    title: `Welcome to ${orgName}`,
    subtitle: "Your personal fashion experience",
    description: `Install this app to get the full ${orgName} experience — browse styles, book appointments, track orders, and more, all from your home screen.`,
    narration: `Welcome! You're about to install the ${orgName} customer app, powered by FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa). This app gives you direct access to ${orgName}'s full catalogue, booking system, and all premium platform features. Let me walk you through everything you'll get.`,
    icon: Heart,
    tier: "basic",
    color: "#f43f5e",
  },
  {
    id: "catalogue",
    title: "Browse Catalogue",
    subtitle: "Explore styles & designs",
    description: "Browse the full catalogue of garments, fabrics, and designs. Filter by category, view pricing, and add favourites to your wishlist.",
    narration: `First up, the catalogue. You'll have access to ${orgName}'s complete collection of garments and designs. Browse by category, check prices in your local currency, and save your favourites to a wishlist for later.`,
    icon: ShoppingBag,
    tier: "basic",
    color: "#8b5cf6",
  },
  {
    id: "booking",
    title: "Book Appointments",
    subtitle: "Schedule fittings & consultations",
    description: "Book measurement sessions, fitting appointments, and design consultations directly through the app with real-time availability.",
    narration: `Booking appointments is seamless. Check ${orgName}'s real-time availability, pick a slot that works for you, and book measurement sessions or design consultations — all in a few taps.`,
    icon: Star,
    tier: "basic",
    color: "#f59e0b",
  },
  {
    id: "orders",
    title: "Order Tracking",
    subtitle: "Real-time status updates",
    description: "Place orders and track every stage — from measurements through fabric selection, production, and delivery to your doorstep.",
    narration: "Once you place an order, track its journey in real time. You'll see every milestone from initial measurements, through production, to delivery. You'll get notifications at each stage so you're never left guessing.",
    icon: Package,
    tier: "basic",
    color: "#22c55e",
  },
  {
    id: "payments",
    title: "Secure Payments",
    subtitle: "Multiple payment options",
    description: "Pay securely with card, bank transfer, or mobile money. View payment history, download receipts, and manage invoices.",
    narration: "Payments are secure and flexible. Pay with your card, bank transfer, or mobile money. All transactions are encrypted, and you can download receipts and invoices anytime from your payment history.",
    icon: CreditCard,
    tier: "basic",
    color: "#3b82f6",
  },
  {
    id: "communications",
    title: "Direct Messaging",
    subtitle: "Chat, SMS, WhatsApp & calls",
    description: "Message the fashion house directly via in-app chat, SMS, WhatsApp, or schedule video consultations for personalized service.",
    narration: `Stay connected with ${orgName} through multiple channels. Send messages via in-app chat, SMS, or WhatsApp. For more detailed discussions, you can even schedule video consultations for one-on-one design sessions.`,
    icon: MessageSquare,
    tier: "basic",
    color: "#06b6d4",
  },
  {
    id: "notifications",
    title: "Smart Notifications",
    subtitle: "Never miss an update",
    description: "Receive push notifications for order updates, appointment reminders, new catalogue additions, and exclusive promotions.",
    narration: "Stay informed with smart notifications. You'll get alerts for order milestones, appointment reminders, new catalogue drops, and exclusive promotions from the fashion house.",
    icon: Bell,
    tier: "basic",
    color: "#ec4899",
  },
  {
    id: "ai-measurements",
    title: "AI Body Measurements",
    subtitle: "Perfect fit, no tape needed",
    description: "Use AI-powered body scanning to capture accurate measurements from your phone camera. Save multiple profiles for family members.",
    narration: "Here's where it gets exciting. Our AI measurement system uses your phone camera to capture accurate body measurements — no tape measure needed. You can save multiple profiles for yourself and family members, ensuring a perfect fit every time.",
    icon: Ruler,
    tier: "premium",
    color: "#8b5cf6",
  },
  {
    id: "virtual-tryon",
    title: "Virtual Try-On",
    subtitle: "See it before you buy",
    description: "Upload your photo and visualize how any garment from the catalogue will look on you before ordering. Share previews with friends.",
    narration: "Virtual try-on lets you see how any garment will look on you before placing an order. Simply upload a photo, pick a design, and get a realistic preview. You can even share it with friends for their opinion!",
    icon: Camera,
    tier: "premium",
    color: "#f43f5e",
  },
  {
    id: "video-consult",
    title: "Video Consultations",
    subtitle: "Face-to-face, anywhere",
    description: "Book one-on-one video sessions with designers and tailors for personalized design discussions, fittings, and style advice.",
    narration: "Premium members can book video consultations with designers and tailors. Discuss your vision face-to-face, get real-time style advice, and even have live measurements taken during the call.",
    icon: Video,
    tier: "premium",
    color: "#6366f1",
  },
  {
    id: "priority",
    title: "Priority Service",
    subtitle: "Skip the queue",
    description: "Premium members get priority order processing, dedicated support channels, and early access to new collections and seasonal drops.",
    narration: "With premium, you get priority treatment. Your orders are processed first, you get dedicated support channels, and early access to new collections before they're available to everyone else.",
    icon: Zap,
    tier: "premium",
    color: "#f59e0b",
  },
  {
    id: "subscribe",
    title: "Unlock Everything",
    subtitle: "Premium for just $10/year",
    description: "Subscribe to unlock all premium features — AI measurements, virtual try-on, video consultations, priority service, and more.",
    narration: "Ready to get the full experience? For just ten dollars a year, unlock every premium feature — AI measurements, virtual try-on, video consultations, priority service, and much more. Install the app now and get started!",
    icon: Crown,
    tier: "premium",
    color: "#c8963e",
  },
];

// ─── Tour Card Component ───────────────────────────────────────────────────
const TourCard = ({ feature, isActive }: { feature: TourFeature; isActive: boolean; brandColor: string }) => {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.85 }}
      className={`rounded-2xl border p-6 transition-all ${
        isActive ? "border-white/20 bg-white/10 backdrop-blur-lg shadow-2xl" : "border-white/5 bg-white/5"
      }`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${feature.color}20` }}>
          <Icon size={24} style={{ color: feature.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-white truncate">{feature.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              feature.tier === "premium" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"
            }`}>
              {feature.tier}
            </span>
          </div>
          <p className="text-sm text-gray-400">{feature.subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{feature.description}</p>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const OrgCustomerInstall = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, stop, isSpeaking, isSupported: voiceSupported, voiceEnabled, toggleVoice } = useVoiceNarration();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);

  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Load org data
  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: orgData } = user
        ? await (supabase.from("organizations_public" as any).select("*").eq("slug", slug).single() as any)
        : await (supabase.from("organizations_summary" as any).select("*").eq("slug", slug).single() as any);
      if (!orgData) { setLoading(false); return; }
      setOrg(orgData as any);

      const { data: siteData } = await supabase
        .from("org_websites_public" as any)
        .select("brand_color, accent_color, tagline, hero_image_url, font_heading")
        .eq("org_id", (orgData as any).id)
        .single();
      if (siteData) setWebsite(siteData as unknown as WebsiteData);
      setLoading(false);
    };
    load();
  }, [slug, user]);

  // PWA install detection
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Record download to database
  const recordDownload = useCallback(async (method: string) => {
    if (!org) return;
    const ua = navigator.userAgent.toLowerCase();
    const platform = /iphone|ipad|ipod/.test(ua) ? "ios" : /android/.test(ua) ? "android" : "desktop";
    try {
      await supabase.from("org_app_downloads" as any).insert({
        org_id: org.id,
        user_id: user?.id || null,
        platform,
        install_method: method,
        user_agent: navigator.userAgent.slice(0, 500),
      } as any);
    } catch (e) {
      console.error("Failed to record download:", e);
    }
  }, [org, user]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      recordDownload("browser_prompt");
    }
    setDeferredPrompt(null);
  };

  const tourFeatures = org ? buildTourFeatures(org.name) : [];

  // Voice narration for current step
  const narrateStep = useCallback((step: number) => {
    if (voiceEnabled && tourFeatures[step]) {
      speak(tourFeatures[step].narration);
    }
  }, [voiceEnabled, tourFeatures, speak]);

  const goNext = useCallback(() => {
    if (tourStep < tourFeatures.length - 1) {
      const next = tourStep + 1;
      setTourStep(next);
      narrateStep(next);
    } else {
      stop();
      setShowTour(false);
      setAutoPlay(false);
    }
  }, [tourStep, tourFeatures.length, narrateStep, stop]);

  const goPrev = useCallback(() => {
    if (tourStep > 0) {
      const prev = tourStep - 1;
      setTourStep(prev);
      narrateStep(prev);
    }
  }, [tourStep, narrateStep]);

  // Auto-advance when narration ends
  useEffect(() => {
    if (!autoPlay || !showTour || isSpeaking) return;
    const timer = setTimeout(() => {
      if (tourStep < tourFeatures.length - 1) goNext();
      else { setAutoPlay(false); setShowTour(false); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [autoPlay, isSpeaking, showTour, tourStep, tourFeatures.length, goNext]);

  const startTour = () => {
    setTourStep(0);
    setShowTour(true);
    setAutoPlay(true);
    narrateStep(0);
  };

  const brandColor = website?.brand_color || "#8B5CF6";
  const accentColor = website?.accent_color || "#D4AF37";
  const fontHeading = website?.font_heading || "Inter";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: brandColor, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
        <Scissors size={48} className="opacity-50" style={{ color: brandColor }} />
        <h1 className="text-2xl font-bold">Organization not found</h1>
        <Link to="/" className="text-sm hover:underline" style={{ color: brandColor }}>← Back to FYSORA FASHN (Fashion Stitches Africa)</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white" style={{ fontFamily: `${fontHeading}, Inter, sans-serif` }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/10">
        <div className="text-center py-1.5 text-[11px] font-medium tracking-wide" style={{ background: `${brandColor}15`, color: accentColor }}>
          ✨ Powered by FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)
        </div>
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to={`/site/${slug}`} className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-full object-contain border border-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                <Scissors size={14} className="text-white" />
              </div>
            )}
            <span className="font-bold text-sm" style={{ color: accentColor }}>{org.name}</span>
          </Link>
          <Link to={`/site/${slug}`} className="text-xs text-gray-400 hover:text-white">← Back to Website</Link>
        </div>
      </div>

      <div className="pt-24 pb-16 container mx-auto px-4 max-w-lg">
        {/* Already installed */}
        {isStandalone && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: brandColor }}>
              <Check size={36} className="text-white" />
            </div>
            <h1 className="font-bold text-2xl mb-3">You're All Set!</h1>
            <p className="text-gray-400 mb-6">{org.name} is installed on your device.</p>
            <Button onClick={() => navigate(`/site/${slug}`)} className="w-full text-white" style={{ background: brandColor }}>
              Open App <ArrowRight size={16} className="ml-2" />
            </Button>
          </motion.div>
        )}

        {!isStandalone && (
          <>
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ background: `linear-gradient(135deg, ${brandColor}, ${accentColor})` }}>
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-16 h-16 rounded-2xl object-contain" />
                ) : (
                  <span className="font-bold text-white text-2xl">{org.name.charAt(0)}</span>
                )}
              </div>
              <h1 className="font-bold text-2xl mb-2">{org.name}</h1>
              <p className="text-gray-400 text-sm">{website?.tagline || org.description || "Your personal fashion experience"}</p>
            </motion.div>

            {/* Installed success */}
            {installed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border p-6 text-center mb-8" style={{ borderColor: `${brandColor}40`, background: `${brandColor}10` }}>
                <Check size={32} className="mx-auto mb-3" style={{ color: brandColor }} />
                <h2 className="font-bold text-lg">Successfully Installed!</h2>
                <p className="text-gray-400 text-sm mt-1">Find {org.name} on your home screen.</p>
              </motion.div>
            )}

            {!installed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-5">
                {/* Voice Tour Button */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                  <Sparkles size={28} className="mx-auto mb-3" style={{ color: accentColor }} />
                  <h2 className="font-bold text-lg mb-1">Take a Guided Tour</h2>
                  <p className="text-gray-400 text-sm mb-4">Discover all features with a narrated walkthrough</p>
                  <Button onClick={startTour} className="w-full text-white font-semibold" style={{ background: brandColor }}>
                    <Play size={16} className="mr-2" /> Start Voice Tour
                  </Button>
                </div>

                {/* Install section */}
                {deferredPrompt && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                    <Chrome size={28} className="text-blue-400 mx-auto mb-3" />
                    <h2 className="font-bold text-lg mb-2">Install {org.name} App</h2>
                    <p className="text-gray-400 text-sm mb-4">Add to your home screen for the best experience.</p>
                    <Button onClick={handleInstall} className="w-full text-white" style={{ background: brandColor }}>
                      <Download size={16} className="mr-2" /> Install App
                    </Button>
                  </div>
                )}

                {isIOS && !deferredPrompt && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <Apple size={28} className="text-white mx-auto mb-3" />
                    <h2 className="font-bold text-lg mb-3 text-center">Install on iPhone / iPad</h2>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${brandColor}20`, color: brandColor }}>1</span>
                        <span>Tap the <Share size={14} className="inline" style={{ color: brandColor }} /> <strong>Share</strong> button at the bottom of Safari</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${brandColor}20`, color: brandColor }}>2</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${brandColor}20`, color: brandColor }}>3</span>
                        <span>Tap <strong>"Add"</strong> to confirm</span>
                      </li>
                    </ol>
                  </div>
                )}

                {isAndroid && !deferredPrompt && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <Smartphone size={28} className="mx-auto mb-3" style={{ color: brandColor }} />
                    <h2 className="font-bold text-lg mb-3 text-center">Install on Android</h2>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${brandColor}20`, color: brandColor }}>1</span>
                        <span>Tap the <strong>⋮ menu</strong> in your browser</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${brandColor}20`, color: brandColor }}>2</span>
                        <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${brandColor}20`, color: brandColor }}>3</span>
                        <span>Tap <strong>"Install"</strong> to confirm</span>
                      </li>
                    </ol>
                  </div>
                )}

                {!isIOS && !isAndroid && !deferredPrompt && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                    <Smartphone size={28} className="mx-auto mb-3" style={{ color: brandColor }} />
                    <h2 className="font-bold text-lg mb-2">Get the App</h2>
                    <p className="text-gray-400 text-sm mb-4">Open this page on your mobile device to install.</p>
                    <div className="bg-black/40 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-2">Share this link:</p>
                      <code className="text-sm font-medium break-all" style={{ color: brandColor }}>
                        {window.location.origin}/site/{slug}/install
                      </code>
                    </div>
                  </div>
                )}

                {/* Features grid */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="font-semibold text-sm mb-4 text-center text-gray-300">WHAT YOU GET</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Browse Catalogue", icon: ShoppingBag, premium: false },
                      { label: "Book Appointments", icon: Star, premium: false },
                      { label: "Order Tracking", icon: Package, premium: false },
                      { label: "Secure Payments", icon: CreditCard, premium: false },
                      { label: "Direct Messaging", icon: MessageSquare, premium: false },
                      { label: "Push Notifications", icon: Bell, premium: false },
                      { label: "AI Measurements", icon: Ruler, premium: true },
                      { label: "Virtual Try-On", icon: Camera, premium: true },
                      { label: "Video Consults", icon: Video, premium: true },
                      { label: "Priority Service", icon: Zap, premium: true },
                    ].map((f) => (
                      <div key={f.label} className="flex items-center gap-2 text-sm text-gray-300">
                        <f.icon size={14} className={f.premium ? "text-amber-400" : "text-green-400"} />
                        <span className="truncate">{f.label}</span>
                        {f.premium && <Lock size={10} className="text-amber-400/60 shrink-0" />}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 text-center mt-3">
                    <Lock size={9} className="inline mr-1" />Premium features require a $10/year subscription
                  </p>
                </div>
              </motion.div>
            )}

            {/* Bottom CTAs */}
            <div className="text-center mt-8 space-y-2">
              {!user && (
                <Button
                  onClick={() => navigate(`/auth?redirect=/site/${slug}/install`)}
                  className="w-full max-w-xs text-white font-semibold"
                  style={{ background: brandColor }}
                >
                  Sign In / Create FSA Account
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate(`/site/${slug}`)} className="w-full max-w-xs border-white/10 text-white text-sm hover:bg-white/5">
                Visit {org.name} Website
              </Button>
              {user && (
                <p className="text-[11px] text-gray-500">Signed in as {user.email}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Voice Tour Overlay ─── */}
      <AnimatePresence>
        {showTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col"
          >
            {/* Tour header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Feature Tour</p>
                  <p className="text-sm font-semibold" style={{ color: accentColor }}>{org.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {voiceSupported && (
                  <button onClick={toggleVoice} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10">
                    {voiceEnabled ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-gray-500" />}
                  </button>
                )}
                <button onClick={() => { setAutoPlay(!autoPlay); if (!autoPlay && !isSpeaking) narrateStep(tourStep); }} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10">
                  {autoPlay ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
                </button>
                <button onClick={() => { stop(); setShowTour(false); setAutoPlay(false); }} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10">
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="px-4 py-2">
              <div className="flex gap-1">
                {tourFeatures.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full flex-1 transition-all cursor-pointer"
                    style={{ background: i <= tourStep ? brandColor : "rgba(255,255,255,0.1)" }}
                    onClick={() => { setTourStep(i); narrateStep(i); }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5 text-center">
                {tourStep + 1} of {tourFeatures.length} • {tourFeatures[tourStep]?.tier === "premium" ? "⭐ Premium" : "✓ Basic"}
              </p>
            </div>

            {/* Card */}
            <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto">
              <div className="w-full max-w-md">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tourStep}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TourCard feature={tourFeatures[tourStep]} isActive={true} brandColor={brandColor} />
                  </motion.div>
                </AnimatePresence>

                {/* Speaking indicator */}
                {isSpeaking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 mt-4"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 rounded-full"
                          style={{ background: brandColor }}
                          animate={{ height: [8, 20, 8] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">Narrating...</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={tourStep === 0}
                className="border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft size={16} className="mr-1" /> Previous
              </Button>
              <Button
                onClick={goNext}
                className="text-white font-semibold"
                style={{ background: brandColor }}
              >
                {tourStep === tourFeatures.length - 1 ? "Finish Tour" : "Next"} <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrgCustomerInstall;
