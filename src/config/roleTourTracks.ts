import type { PlatformTourStep } from "./platformTourSteps";
import { platformTourSteps } from "./platformTourSteps";

export type TourRole = "customer" | "tailor" | "designer" | "organization";

export interface RoleTourTrack {
  role: TourRole;
  label: string;
  tagline: string;
  icon: string; // lucide icon name
  accent: string; // tailwind gradient suffix
  steps: PlatformTourStep[];
  ctaLabel: string;
  ctaPath: string;
}

// Tailor tour — free + premium features for solo tailors
const tailorSteps: PlatformTourStep[] = [
  {
    id: "tailor-welcome",
    title: "Welcome, Master Tailor",
    subtitle: "Grow your craft, globally",
    description:
      "FYSORA FASHN gives independent tailors a digital storefront, smart tools, and access to customers across Africa and beyond.",
    narration:
      "Welcome, master tailor! FYSORA FASHN gives independent tailors a digital storefront, smart production tools, and access to thousands of customers across Africa and beyond. Let me show you everything you can do — both free and premium.",
    icon: "Scissors",
    visual: "welcome",
    highlights: ["Free Tailor Studio", "Verified Profile", "Global Reach"],
  },
  {
    id: "tailor-profile",
    title: "Your Tailor Studio (Free)",
    subtitle: "Your personal storefront",
    description:
      "Get a free studio page with your portfolio, services, pricing, and direct booking — no monthly fee to start.",
    narration:
      "Every tailor gets a free studio page. Showcase your portfolio, list your services and pricing, and accept direct bookings from customers — with no monthly fee to start.",
    icon: "Building2",
    visual: "fashion-houses",
    highlights: ["Free Forever Tier", "Portfolio Gallery", "Direct Bookings"],
  },
  {
    id: "tailor-orders",
    title: "Order & Production Workflow",
    subtitle: "Pending → Confirmed → Sewing → Delivered",
    description:
      "Track every order through nine production stages. Customers see real-time status; you stay organized.",
    narration:
      "Manage every order through our nine-stage production workflow — from pending and confirmed, to measuring, cutting, sewing, fitting, and delivery. Your customers see live status updates, and you stay perfectly organized.",
    icon: "Package",
    visual: "orders",
    highlights: ["9-Stage Workflow", "Auto Notifications", "Customer Visibility"],
  },
  {
    id: "tailor-measurements",
    title: "AI Measurements (Premium)",
    subtitle: "3-tier Gemini-powered scanning",
    description:
      "Capture customer measurements via AI body scan, AR, or 360° video calls — eliminating fitting errors.",
    narration:
      "With our premium AI measurements, you can capture customer measurements through three tiers: Gemini AI body scan, ARCore augmented reality, or live 360-degree video call sessions. Say goodbye to fitting errors and re-makes.",
    icon: "Ruler",
    visual: "measurements",
    highlights: ["Gemini Flash + Pro", "ARCore Scanning", "Video Call Sessions"],
  },
  {
    id: "tailor-tryon",
    title: "Virtual Try-On (Premium)",
    subtitle: "Fashn.ai powered previews",
    description:
      "Let customers preview your designs on themselves before ordering. Five credits per try-on, billed transparently.",
    narration:
      "Premium Virtual Try-On lets your customers see your garments on themselves before they order. Powered by Fashn dot AI, each try-on costs five credits — auto-deducted from your wallet, fully transparent billing.",
    icon: "Sparkles",
    visual: "try-on",
    highlights: ["Fashn.ai Engine", "5 credits/try-on", "Higher Conversion"],
  },
  {
    id: "tailor-comms",
    title: "Multi-channel Messaging (Free)",
    subtitle: "SMS · WhatsApp · In-App",
    description:
      "Reach customers via WhatsApp, SMS, email, or in-app chat — pay only for what you send.",
    narration:
      "Reach customers through WhatsApp, SMS, email, or in-app chat — all from one inbox. The hub itself is free; you only pay metered token rates for outbound messages.",
    icon: "MessageSquare",
    visual: "communications",
    highlights: ["Unified Inbox", "Token-billed Sends", "Smart Templates"],
  },
  {
    id: "tailor-subscribe",
    title: "Tailor Subscription",
    subtitle: "$29/month — unlock everything",
    description:
      "Premium subscription unlocks AI measurements, virtual try-on, priority placement in search, and zero platform commission on direct bookings.",
    narration:
      "The Tailor subscription, just twenty-nine dollars a month, unlocks all premium features: AI measurements, virtual try-on, priority search placement, and zero platform commission on direct bookings. Upgrade when you're ready.",
    icon: "Crown",
    visual: "subscribe",
    highlights: ["$29/mo", "Zero Direct-Booking Commission", "Priority Listing"],
  },
];

// Designer tour — free + premium features for designers
const designerSteps: PlatformTourStep[] = [
  {
    id: "designer-welcome",
    title: "Welcome, Designer",
    subtitle: "Showcase. Sell. Scale.",
    description:
      "Designers get a free personal studio org and access to a global stage of buyers, tailors, and collaborators.",
    narration:
      "Welcome, designer! You're set up with a free personal designer studio and access to a global stage of buyers, tailors, and collaborators. Here's what you can do.",
    icon: "Sparkles",
    visual: "welcome",
    highlights: ["Free Personal Studio", "Designer Portal", "Global Stage"],
  },
  {
    id: "designer-portal",
    title: "Designer Portal (Free)",
    subtitle: "Your creative command centre",
    description:
      "Manage collections, drop-dates, lookbooks, and assets from a portal built for creatives.",
    narration:
      "The Designer Portal is your creative command centre. Manage collections, plan drop dates, build lookbooks, and organize your asset library — all from one place, free of charge.",
    icon: "Building2",
    visual: "fashion-houses",
    highlights: ["Collections Manager", "Lookbook Builder", "Asset Library"],
  },
  {
    id: "designer-website-lite",
    title: "Website Builder Lite (Free)",
    subtitle: "Your subdomain, instantly live",
    description:
      "Spin up a designer website on a free FYSORA subdomain. No code, fully synced with your catalogue.",
    narration:
      "Spin up a complete designer website in minutes with Website Builder Lite — free, on a FYSORA subdomain, with no code required. It stays automatically synced with your catalogue.",
    icon: "Building2",
    visual: "catalogue",
    highlights: ["Free Subdomain", "No-code Editor", "Auto-sync Catalogue"],
  },
  {
    id: "designer-website-pro",
    title: "Website Builder Pro (Premium)",
    subtitle: "Custom domain · advanced themes",
    description:
      "Upgrade to bring your own domain, unlock advanced themes, embeddable try-on widgets, and analytics.",
    narration:
      "Upgrade to Website Builder Pro to bring your own custom domain, unlock advanced themes, embed our virtual try-on widget on your site, and access detailed visitor analytics.",
    icon: "Crown",
    visual: "catalogue",
    highlights: ["Custom Domain", "Embed Try-On", "Visitor Analytics"],
  },
  {
    id: "designer-tryon",
    title: "Virtual Try-On (Premium)",
    subtitle: "Convert browsers into buyers",
    description:
      "Let customers see your designs on themselves. Embed the widget on any external site you own.",
    narration:
      "Premium Virtual Try-On lets customers see your designs on themselves before buying. Embed our SDK widget on any external website you own — five credits per try-on, billed transparently.",
    icon: "Sparkles",
    visual: "try-on",
    highlights: ["Embeddable SDK", "Fashn.ai Engine", "5 credits/try-on"],
  },
  {
    id: "designer-tailors",
    title: "Delegate to Tailors",
    subtitle: "Production at scale",
    description:
      "Delegate orders to verified tailors via formal subcontracts with transparent revenue splits.",
    narration:
      "Need production capacity? Delegate orders to verified tailors through formal subcontracts, with fully transparent revenue splits and shared order tracking.",
    icon: "Package",
    visual: "orders",
    highlights: ["Tailor Marketplace", "Auto Revenue Split", "Shared Tracking"],
  },
  {
    id: "designer-subscribe",
    title: "Designer Subscription",
    subtitle: "$15/month — go pro",
    description:
      "Unlock Website Builder Pro, virtual try-on credits bundle, premium analytics, and embed SDK access.",
    narration:
      "The Designer subscription is fifteen dollars a month and unlocks Website Builder Pro, a virtual try-on credits bundle, premium analytics, and full embed SDK access for any external site.",
    icon: "Crown",
    visual: "subscribe",
    highlights: ["$15/mo", "Pro Website", "Try-on Credits Bundle"],
  },
];

// Organization (Fashion House) tour
const organizationSteps: PlatformTourStep[] = [
  {
    id: "org-welcome",
    title: "Welcome, Fashion House",
    subtitle: "Run your studio. Reach the world.",
    description:
      "Organizations get a multi-user dashboard, full ERP-style workflow, and storefronts for both web and mobile.",
    narration:
      "Welcome to FYSORA FASHN for fashion houses. You get a full multi-user dashboard, ERP-style production workflow, and ready-made storefronts for web and mobile. Here's everything you can do.",
    icon: "Building2",
    visual: "welcome",
    highlights: ["Multi-user Roles", "ERP Workflow", "Web + Mobile Storefronts"],
  },
  {
    id: "org-catalogue",
    title: "Catalogue & Social Sync (Free)",
    subtitle: "Publish once, sync everywhere",
    description:
      "Publish products to the platform catalogue and sync to Instagram, Facebook, X, TikTok, YouTube, Pinterest, and Threads.",
    narration:
      "Publish your products once and they appear in the platform catalogue and sync bidirectionally to seven social platforms — Instagram, Facebook, X, TikTok, YouTube, Pinterest, and Threads.",
    icon: "ShoppingBag",
    visual: "catalogue",
    highlights: ["7-platform Sync", "Featured Slots", "Real-time Pricing"],
  },
  {
    id: "org-orders",
    title: "Order Management (Free)",
    subtitle: "End-to-end production",
    description:
      "Nine-stage workflow, automated notifications, customer-facing tracking, and tailor delegation built in.",
    narration:
      "Manage every order end to end with our nine-stage workflow, automated customer notifications, real-time customer tracking, and built-in tailor subcontracting.",
    icon: "Package",
    visual: "orders",
    highlights: ["9 Stages", "Tailor Delegation", "Customer Tracking"],
  },
  {
    id: "org-comms",
    title: "Communications Hub (Free)",
    subtitle: "Omnichannel customer ops",
    description:
      "WhatsApp, SMS, email, and in-app chat from one inbox. Token-metered, with full archive.",
    narration:
      "Run all customer communications from one omnichannel inbox — WhatsApp, SMS, email, and in-app chat — with full message archives. You only pay metered token rates for outbound sends.",
    icon: "MessageSquare",
    visual: "communications",
    highlights: ["Omnichannel Inbox", "Full Archive", "Token Billing"],
  },
  {
    id: "org-website",
    title: "Website + Mobile App",
    subtitle: "Lite (free) · Pro · Mobile App",
    description:
      "Free subdomain website, optional Pro custom domain, and a self-installing customer PWA — branded for your house.",
    narration:
      "Get a free subdomain website with Website Builder Lite, upgrade to Pro for a custom domain, and offer your customers a self-installing branded mobile app — your own progressive web app, no app-store fees.",
    icon: "Building2",
    visual: "catalogue",
    highlights: ["Free Lite Site", "Pro Custom Domain", "Branded PWA"],
  },
  {
    id: "org-ai",
    title: "Premium AI Suite",
    subtitle: "Measurements · Try-On · Photo AI",
    description:
      "AI body measurements, virtual try-on, and Photoroom-powered product photo enhancement — billed per use.",
    narration:
      "Unlock the Premium AI Suite: tiered AI body measurements, Fashn dot AI virtual try-on, and Photoroom-powered product photo enhancement with automatic background removal — all billed per use, transparently.",
    icon: "Sparkles",
    visual: "try-on",
    highlights: ["AI Measurements", "Virtual Try-On", "Photo Enhancement"],
  },
  {
    id: "org-disputes",
    title: "Disputes, Tax & Invoicing",
    subtitle: "Built-in compliance",
    description:
      "AI-assisted dispute resolution, automated tax compliance for Nigeria + global, and full invoicing for every transaction.",
    narration:
      "We handle the hard parts: AI-assisted dispute resolution, automated tax compliance for both Nigerian and global jurisdictions, and full invoicing for every order, subscription, and service.",
    icon: "Crown",
    visual: "orders",
    highlights: ["AI Disputes", "Auto Tax", "Full Invoicing"],
  },
  {
    id: "org-subscribe",
    title: "Organization Plans",
    subtitle: "Free to start · Pro from $49/mo",
    description:
      "Start free with the core platform. Upgrade for premium AI bundles, Website Pro, branded mobile app, and reduced platform fees.",
    narration:
      "Start completely free with the core platform. Upgrade to a premium plan from forty-nine dollars a month for AI bundles, Website Builder Pro, the branded mobile app, and reduced platform fees on every transaction.",
    icon: "Crown",
    visual: "subscribe",
    highlights: ["Free Core Tier", "$49/mo Pro", "Reduced Fees"],
  },
];

export const roleTourTracks: Record<TourRole, RoleTourTrack> = {
  customer: {
    role: "customer",
    label: "Customer",
    tagline: "Shop, fit, and order from Africa's best",
    icon: "ShoppingBag",
    accent: "from-blue-500/20 to-primary/10",
    steps: platformTourSteps,
    ctaLabel: "Subscribe — $10/year",
    ctaPath: "/portal",
  },
  tailor: {
    role: "tailor",
    label: "Tailor",
    tagline: "Your craft, your studio, global customers",
    icon: "Scissors",
    accent: "from-amber-500/20 to-primary/10",
    steps: tailorSteps,
    ctaLabel: "Start Free — Tailor Studio",
    ctaPath: "/auth?role=tailor",
  },
  designer: {
    role: "designer",
    label: "Designer",
    tagline: "Showcase collections, sell worldwide",
    icon: "Sparkles",
    accent: "from-violet-500/20 to-primary/10",
    steps: designerSteps,
    ctaLabel: "Start Free — Designer Portal",
    ctaPath: "/auth?role=designer",
  },
  organization: {
    role: "organization",
    label: "Fashion House",
    tagline: "Run your studio end-to-end",
    icon: "Building2",
    accent: "from-emerald-500/20 to-primary/10",
    steps: organizationSteps,
    ctaLabel: "Register Fashion House",
    ctaPath: "/create-organization",
  },
};

export const tourRoleList: TourRole[] = ["customer", "tailor", "designer", "organization"];

export function isTourRole(value: string | null | undefined): value is TourRole {
  return !!value && (tourRoleList as string[]).includes(value);
}