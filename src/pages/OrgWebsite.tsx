import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram, MessageCircle, Phone, Mail, MapPin, ExternalLink, Scissors, Calendar, BookOpen,
  Home, Menu, X, Sparkles, Lock, Facebook, Twitter, Linkedin, Youtube, Users, Download,
  PhoneCall, MessageSquare, Send, Map, ChevronUp, Info, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrgWebsiteData {
  id: string;
  org_id: string;
  mode: string;
  is_enabled: boolean;
  tagline: string | null;
  hero_description: string | null;
  hero_image_url: string | null;
  brand_color: string;
  accent_color: string;
  theme: string;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  webhook_url: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  font_heading?: string | null;
  font_body?: string | null;
  color_palette?: Record<string, string> | null;
  favicon_url?: string | null;
  vision_statement?: string | null;
  mission_statement?: string | null;
}

interface OfficerData {
  id: string;
  full_name: string;
  title: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  photo_url: string | null;
  display_order: number;
  is_public: boolean;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  currency: string | null;
}

interface CatalogueItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  tags: string[] | null;
}

interface TailorData {
  id: string;
  display_name: string | null;
  specialty: string | null;
  bio: string | null;
}

// ─── Floating Communication CTA ──────────────────────────────────────────────
const FloatingCTA = ({ org, website, brandColor }: { org: OrgData; website: OrgWebsiteData; brandColor: string }) => {
  const [expanded, setExpanded] = useState(false);

  const actions = [
    org.phone && { icon: PhoneCall, label: "VoIP Call", href: `tel:${org.phone}`, color: "#22c55e" },
    org.email && { icon: Mail, label: "Email", href: `mailto:${org.email}`, color: "#3b82f6" },
    org.phone && { icon: MessageSquare, label: "SMS", href: `sms:${org.phone}`, color: "#f59e0b" },
    website.whatsapp_number && { icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`, color: "#25d366" },
  ].filter(Boolean) as { icon: any; label: string; href: string; color: string }[];

  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {expanded && actions.map((action, i) => (
          <motion.a
            key={action.label}
            href={action.href}
            target={action.label === "WhatsApp" ? "_blank" : undefined}
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 group"
          >
            <span className="hidden sm:block px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-black/80 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              {action.label}
            </span>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              style={{ background: action.color }}
            >
              <action.icon size={20} className="text-white" />
            </div>
          </motion.a>
        ))}
      </AnimatePresence>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all"
        style={{ background: brandColor }}
      >
        {expanded ? <X size={22} className="text-white" /> : <Send size={20} className="text-white" />}
      </button>
    </div>
  );
};

// ─── Google Maps Link ────────────────────────────────────────────────────────
const GoogleMapsLink = ({ address }: { address: string }) => (
  <a
    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-sm text-gray-300 hover:text-white hover:border-white/30 transition-all bg-white/5"
  >
    <Map size={16} className="text-red-400" />
    View on Google Maps
  </a>
);

// ─── Newsletter Signup ───────────────────────────────────────────────────────
const NewsletterSignup = ({ brandColor }: { brandColor: string }) => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  if (subscribed) {
    return (
      <p className="text-sm text-green-400 flex items-center gap-2">
        <Sparkles size={14} /> Thanks for subscribing!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors"
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: brandColor }}
      >
        Subscribe
      </button>
    </form>
  );
};

const OrgWebsite = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [website, setWebsite] = useState<OrgWebsiteData | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [tailors, setTailors] = useState<TailorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<"home" | "about" | "catalogue" | "booking" | "tailors">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const requireAuth = (action: string) => {
    if (!user) {
      navigate(`/auth?redirect=/site/${slug}&feature=${action}`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const load = async () => {
      if (!slug) return;

      // Use public view for authenticated users, summary for unauthenticated
      const { data: orgData } = user
        ? await (supabase
            .from("organizations_public" as any)
            .select("*")
            .eq("slug", slug)
            .single() as any)
        : await (supabase
            .from("organizations_summary" as any)
            .select("*")
            .eq("slug", slug)
            .single() as any);

      if (!orgData) { setLoading(false); return; }
      setOrg(orgData as any);

      const { data: websiteData } = await supabase
        .from("org_websites_public" as any)
        .select("*")
        .eq("org_id", (orgData as any).id)
        .single();

      if (websiteData) setWebsite(websiteData as unknown as OrgWebsiteData);

      const [catalogueResult, officersResult, tailorsResult] = await Promise.all([
        supabase
          .from("org_catalogue_items")
          .select("*")
          .eq("org_id", orgData.id)
          .eq("is_available", true)
          .order("sort_order"),
        supabase
          .from("org_company_officers")
          .select("*")
          .eq("org_id", orgData.id)
          .eq("is_public", true)
          .order("display_order"),
        supabase
          .from("tailor_contracts")
          .select("tailor_id")
          .eq("org_id", orgData.id)
          .eq("status", "active"),
      ]);

      setCatalogue((catalogueResult.data || []) as CatalogueItem[]);
      setOfficers((officersResult.data || []) as OfficerData[]);

      const tailorIds = (tailorsResult.data || []).map((t: any) => t.tailor_id);
      if (tailorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, specialty, bio")
          .in("id", tailorIds);
        setTailors((profiles || []) as TailorData[]);
      }

      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!org || !website || !website.is_enabled) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
        <Scissors size={48} className="text-purple-400 opacity-50" />
        <h1 className="text-2xl font-bold">Website not found</h1>
        <p className="text-gray-400">This organization doesn't have a public website yet.</p>
        <Link to="/" className="text-purple-400 hover:underline text-sm">← Back to Fashion Stitches</Link>
      </div>
    );
  }

  if (website.mode === "custom_integration" && website.webhook_url) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{org.name}</h1>
          <p className="text-gray-400 mb-6">This organisation uses a custom website integration.</p>
          <a href={website.webhook_url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Visit Website <ExternalLink size={16} className="ml-2" />
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const brandColor = website.brand_color || "#8B5CF6";
  const accentColor = website.accent_color || "#D4AF37";
  const currency = org.currency || "NGN";
  const fontHeading = website.font_heading || "Inter";
  const fontBody = website.font_body || "Inter";
  const palette = website.color_palette || {};
  const bgColor = palette.background || "#0d0d0d";
  const surfaceColor = palette.surface || "#1a1a1a";

  // Load Google Fonts
  const fontsToLoad = [...new Set([fontHeading, fontBody])].filter(f => f !== "Inter");
  if (fontsToLoad.length > 0) {
    const link = document.querySelector("#org-fonts") || (() => {
      const el = document.createElement("link");
      el.id = "org-fonts";
      el.rel = "stylesheet";
      document.head.appendChild(el);
      return el;
    })();
    (link as HTMLLinkElement).href = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")}&display=swap`;
  }

  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "about" as const, label: "About Us", icon: Info },
    { id: "catalogue" as const, label: "Catalogue", icon: BookOpen },
    { id: "tailors" as const, label: "Our Tailors", icon: Users },
    { id: "booking" as const, label: "Book Appointment", icon: Calendar },
  ];

  const socialLinks = [
    website.instagram_url && { icon: Instagram, href: website.instagram_url, label: "Instagram" },
    website.facebook_url && { icon: Facebook, href: website.facebook_url, label: "Facebook" },
    website.whatsapp_number && { icon: MessageCircle, href: `https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`, label: "WhatsApp" },
    website.twitter_url && { icon: Twitter, href: website.twitter_url, label: "X (Twitter)" },
    website.linkedin_url && { icon: Linkedin, href: website.linkedin_url, label: "LinkedIn" },
    website.youtube_url && { icon: Youtube, href: website.youtube_url, label: "YouTube" },
    website.tiktok_url && { icon: Globe, href: website.tiktok_url, label: "TikTok" },
  ].filter(Boolean) as { icon: any; href: string; label: string }[];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: bgColor, fontFamily: fontBody }}>
      {/* ─── Header with Logo, Banner & Menu ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/10">
        {/* Banner strip */}
        <div className="text-center py-1.5 text-[11px] font-medium tracking-wide" style={{ background: `${brandColor}15`, color: accentColor }}>
          ✨ Powered by Fashion Stitches Africa — <Link to="/install" className="underline hover:no-underline">Get the App</Link>
        </div>
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-full object-contain border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                <Scissors size={16} className="text-white" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wide" style={{ color: accentColor }}>{org.name}</span>
              {website.tagline && <span className="text-[10px] text-gray-500 hidden sm:block">{website.tagline}</span>}
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); window.scrollTo(0, 0); }}
                className={`text-sm font-medium transition-colors ${activePage === item.id ? "text-white" : "text-gray-400 hover:text-white"}`}
                style={activePage === item.id ? { color: accentColor } : {}}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {org.phone && (
              <a href={`tel:${org.phone}`} className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-green-500/50 transition-colors" title="Call">
                <PhoneCall size={14} className="text-green-400" />
              </a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-blue-500/50 transition-colors" title="Email">
                <Mail size={14} className="text-blue-400" />
              </a>
            )}
            {website.whatsapp_number && (
              <a href={`https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-green-500/50 transition-colors" title="WhatsApp">
                <MessageCircle size={14} className="text-green-400" />
              </a>
            )}
          </div>

          <button className="lg:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-[#111] border-t border-white/10 overflow-hidden"
            >
              <div className="px-4 py-4 flex flex-col gap-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                    className="text-left text-sm font-medium text-gray-300 hover:text-white flex items-center gap-3"
                  >
                    <item.icon size={16} style={{ color: accentColor }} />
                    {item.label}
                  </button>
                ))}
                {/* Mobile CTA row */}
                <div className="flex gap-3 pt-3 border-t border-white/10">
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-green-400">
                      <PhoneCall size={14} /> Call
                    </a>
                  )}
                  {org.email && (
                    <a href={`mailto:${org.email}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-blue-400">
                      <Mail size={14} /> Email
                    </a>
                  )}
                  {website.whatsapp_number && (
                    <a href={`https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-green-400">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Extra top offset for banner + nav */}
      <div className="pt-[calc(4rem+1.75rem)]">
        {activePage === "home" && (
          <HomePage org={org} website={website} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} officers={officers} tailors={tailors} slug={slug!} onNavigate={setActivePage} user={user} requireAuth={requireAuth} />
        )}
        {activePage === "about" && (
          <AboutPage org={org} website={website} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} officers={officers} />
        )}
        {activePage === "catalogue" && (
          <CataloguePage items={catalogue} currency={currency} brandColor={brandColor} accentColor={accentColor} user={user} requireAuth={requireAuth} />
        )}
        {activePage === "tailors" && (
          <TailorsPage tailors={tailors} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} slug={slug!} />
        )}
        {activePage === "booking" && (
          <BookingPage org={org} brandColor={brandColor} accentColor={accentColor} />
        )}
      </div>

      {/* ─── Floating Communication CTA ─── */}
      <FloatingCTA org={org} website={website} brandColor={brandColor} />

      {/* ─── Enhanced Footer ─── */}
      <footer className="border-t border-white/10 pt-16 pb-8 mt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-full object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                    <Scissors size={12} className="text-white" />
                  </div>
                )}
                <span className="font-bold text-lg" style={{ color: accentColor }}>{org.name}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{website.tagline || org.description || "Quality tailoring services."}</p>

              {/* Google Maps */}
              {org.address && <GoogleMapsLink address={org.address} />}
            </div>

            {/* Sitemap */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Sitemap</h4>
              <div className="flex flex-col gap-2.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActivePage(item.id); window.scrollTo(0, 0); }}
                    className="text-left text-gray-300 hover:text-white text-sm transition-colors flex items-center gap-2"
                  >
                    <item.icon size={13} style={{ color: accentColor }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact & Social */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Contact</h4>
              <div className="flex flex-col gap-2.5 text-sm text-gray-400 mb-4">
                {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-2 hover:text-white transition-colors"><Phone size={14} /> {org.phone}</a>}
                {org.email && <a href={`mailto:${org.email}`} className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={14} /> {org.email}</a>}
                {org.address && <span className="flex items-center gap-2"><MapPin size={14} /> {org.address}</span>}
              </div>
              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {socialLinks.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors" title={s.label}>
                      <s.icon size={16} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Newsletter & App Download */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Stay Updated</h4>
              <p className="text-sm text-gray-500 mb-3">Subscribe for latest styles, offers, and updates.</p>
              <NewsletterSignup brandColor={brandColor} />

              {/* App Download */}
              <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs text-gray-400 mb-2">Get the Fashion Stitches Africa app</p>
                <Link
                  to="/install"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: brandColor }}
                >
                  <Download size={14} />
                  Download App
                </Link>
                <p className="text-[10px] text-gray-600 mt-2">Register a free FSA account to access all features</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} {org.name}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="hover:text-white transition-colors">Create FSA Account</Link>
              <span>·</span>
              <Link to="/" className="hover:text-white transition-colors">Fashion Stitches Africa</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      <ScrollToTop brandColor={brandColor} />
    </div>
  );
};

// ─── Scroll To Top ───────────────────────────────────────────────────────────
const ScrollToTop = ({ brandColor }: { brandColor: string }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 bg-black/60 backdrop-blur-sm hover:scale-110 transition-transform"
    >
      <ChevronUp size={18} className="text-white" />
    </button>
  );
};

// ─── About Us Page ───────────────────────────────────────────────────────────
const AboutPage = ({ org, website, brandColor, accentColor, fontHeading, officers }: {
  org: OrgData;
  website: OrgWebsiteData;
  brandColor: string;
  accentColor: string;
  fontHeading: string;
  officers: OfficerData[];
}) => (
  <div className="container mx-auto px-4 lg:px-8 py-16">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-16 text-center">
        <h1 className="font-bold text-4xl md:text-5xl mb-4" style={{ fontFamily: fontHeading }}>About {org.name}</h1>
        <p className="text-gray-400 max-w-xl mx-auto">{org.description || website.tagline || "Crafting excellence in African fashion."}</p>
      </div>

      {/* Vision & Mission */}
      {(website.vision_statement || website.mission_statement) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {website.vision_statement && (
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="p-8 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-8" style={{ background: accentColor }} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Our Vision</span>
              </div>
              <p className="text-lg text-gray-300 leading-relaxed">{website.vision_statement}</p>
            </motion.div>
          )}
          {website.mission_statement && (
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="p-8 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-8" style={{ background: brandColor }} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brandColor }}>Our Mission</span>
              </div>
              <p className="text-lg text-gray-300 leading-relaxed">{website.mission_statement}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Officers / Team */}
      {officers.length > 0 && (
        <div>
          <div className="text-center mb-12">
            <h2 className="font-bold text-3xl mb-4" style={{ fontFamily: fontHeading }}>Meet Our Team</h2>
            <p className="text-gray-400 max-w-xl mx-auto">The people behind the craft.</p>
          </div>
          <div className={`grid gap-8 ${officers.length <= 3 ? `grid-cols-1 md:grid-cols-${officers.length}` : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
            {officers.map((officer, i) => (
              <motion.div
                key={officer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-white/10 mb-5 group-hover:border-white/30 transition-colors">
                  {officer.photo_url ? (
                    <img src={officer.photo_url} alt={officer.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <span className="text-3xl font-bold text-gray-500">
                        {officer.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: fontHeading }}>{officer.full_name}</h3>
                <p className="text-sm mb-2" style={{ color: accentColor }}>{officer.title}</p>
                {officer.bio && <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">{officer.bio}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  </div>
);

// ─── Home Page ───────────────────────────────────────────────────────────────
const HomePage = ({ org, website, brandColor, accentColor, fontHeading, officers, tailors, slug, onNavigate, user, requireAuth }: {
  org: OrgData;
  website: OrgWebsiteData;
  brandColor: string;
  accentColor: string;
  fontHeading: string;
  officers: OfficerData[];
  tailors: TailorData[];
  slug: string;
  onNavigate: (p: "home" | "about" | "catalogue" | "booking" | "tailors") => void;
  user: any;
  requireAuth: (action: string) => boolean;
}) => (
  <div>
    {/* Hero */}
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {website.hero_image_url ? (
        <div className="absolute inset-0">
          <img src={website.hero_image_url} alt="Hero" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/60 via-transparent to-[#0d0d0d]" />
        </div>
      ) : (
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 50%, ${brandColor}22 0%, transparent 60%)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 20%, ${accentColor}11 0%, transparent 50%)` }} />
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ankara" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 30 Q15 0 30 30 Q45 60 60 30" stroke={accentColor} strokeWidth="1" fill="none" />
                <path d="M0 30 Q15 60 30 30 Q45 0 60 30" stroke={brandColor} strokeWidth="1" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ankara)" />
          </svg>
        </div>
      )}

      <div className="relative container mx-auto px-4 lg:px-8 py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-12" style={{ background: accentColor }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
              Est. {new Date().getFullYear()}
            </span>
          </div>
          <h1 className="font-bold text-5xl md:text-7xl leading-tight mb-6" style={{ fontFamily: fontHeading }}>
            {org.name}
          </h1>
          {website.tagline && (
            <p className="text-xl md:text-2xl mb-4 font-light" style={{ color: accentColor }}>
              {website.tagline}
            </p>
          )}
          {website.hero_description && (
            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-xl">
              {website.hero_description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => onNavigate("booking")}
              className="px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-widest transition-all hover:scale-105"
              style={{ background: brandColor }}
            >
              Book Appointment
            </button>
            <button
              onClick={() => onNavigate("catalogue")}
              className="px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-widest border transition-all hover:bg-white/10"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              View Catalogue
            </button>
          </div>
          {/* Google Maps quick link on hero */}
          {org.address && <GoogleMapsLink address={org.address} />}
        </motion.div>
      </div>
    </section>

    {/* Services */}
    <section className="py-24 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-bold text-3xl md:text-4xl mb-4">What We Offer</h2>
          <p className="text-gray-400 max-w-xl mx-auto">From concept to creation — we handle every aspect of your garment journey.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Scissors, title: "Bespoke Tailoring", desc: "Every piece is crafted to your exact measurements. No two garments are the same." },
            { icon: Calendar, title: "Consultations", desc: "Book a session with our expert tailors to discuss styles, fabrics, and timelines." },
            { icon: BookOpen, title: "African Textiles", desc: "Premium Ankara, Adire, Kente, and Aso-Oke sourced from across the continent." },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${brandColor}22` }}>
                <item.icon size={24} style={{ color: brandColor }} />
              </div>
              <h3 className="font-bold text-xl mb-3">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* FSA Platform Features */}
    <section className="py-24 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles size={20} className="text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">Powered by Fashion Stitches Africa</span>
          </div>
          <h2 className="font-bold text-3xl md:text-4xl mb-4">Smart Fashion Tools</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Access AI-powered measurements, virtual try-on, and seamless ordering — all from this page.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Sparkles, title: "AI Body Measurements", desc: "Get precise measurements using your phone camera — powered by AI.", action: "ai_measurements" },
            { icon: Scissors, title: "Virtual Try-On", desc: "See how garments look on you before ordering — try styles virtually.", action: "virtual_tryon" },
            { icon: Calendar, title: "Video Consultation", desc: "Book a live video session with a tailor for real-time style advice and fittings.", action: "video_consultation" },
            { icon: BookOpen, title: "Place an Order", desc: "Commission bespoke garments directly with tracked delivery and payments.", action: "place_order" },
          ].map((feat, i) => (
            <motion.div
              key={feat.action}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer group"
              onClick={() => requireAuth(feat.action)}
            >
              {!user && (
                <div className="absolute top-4 right-4">
                  <Lock size={14} className="text-purple-400/60" />
                </div>
              )}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-purple-500/20">
                <feat.icon size={24} className="text-purple-400" />
              </div>
              <h3 className="font-bold text-xl mb-3">{feat.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{feat.desc}</p>
              <span className="text-sm font-medium text-purple-400 group-hover:underline">
                {user ? "Open →" : "Sign in to access →"}
              </span>
            </motion.div>
          ))}
        </div>
        {!user && (
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-sm text-gray-500 mt-8">
            These features require a free <a href="/auth" className="text-purple-400 hover:underline">Fashion Stitches Africa</a> account.
          </motion.p>
        )}
      </div>
    </section>

    {/* Our Tailors Showcase */}
    {tailors.length > 0 && (
      <section className="py-24 border-t border-white/10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-bold text-3xl md:text-4xl mb-4" style={{ fontFamily: fontHeading }}>Our Tailors</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Meet the skilled artisans who bring your visions to life.</p>
          </motion.div>
          <div className={`grid gap-8 ${tailors.length <= 3 ? "grid-cols-1 md:grid-cols-" + tailors.length : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {tailors.slice(0, 6).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/site/${slug}/tailor/${t.id}`}
                  className="block p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${brandColor}20` }}>
                      <Scissors size={24} style={{ color: brandColor }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-white transition-colors">{t.display_name || "Tailor"}</h3>
                      {t.specialty && <span className="text-xs" style={{ color: accentColor }}>{t.specialty}</span>}
                    </div>
                  </div>
                  {t.bio && <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">{t.bio}</p>}
                  <span className="inline-block mt-4 text-sm font-medium group-hover:translate-x-1 transition-transform" style={{ color: accentColor }}>
                    View Portfolio →
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
          {tailors.length > 6 && (
            <div className="text-center mt-8">
              <button onClick={() => onNavigate("tailors")} className="text-sm font-medium hover:underline" style={{ color: accentColor }}>
                View All Tailors ({tailors.length}) →
              </button>
            </div>
          )}
        </div>
      </section>
    )}

    {/* CTA */}
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl p-12 text-center border border-white/10 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${brandColor}22, ${accentColor}11)` }}
        >
          <h2 className="font-bold text-3xl md:text-4xl mb-4">Ready to Start Your Order?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">Book a free consultation and let us bring your vision to life with Africa's finest fabrics.</p>
          <button
            onClick={() => onNavigate("booking")}
            className="px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-widest transition-all hover:scale-105"
            style={{ background: brandColor }}
          >
            Book Now — It's Free
          </button>
        </motion.div>
      </div>
    </section>
  </div>
);

// ─── Catalogue Page ───────────────────────────────────────────────────────────
const CataloguePage = ({ items, currency, brandColor, accentColor, user, requireAuth }: {
  items: CatalogueItem[];
  currency: string;
  brandColor: string;
  accentColor: string;
  user: any;
  requireAuth: (action: string) => boolean;
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]))];
  const filtered = selectedCategory === "All" ? items : items.filter((i) => i.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 lg:px-8 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-12 text-center">
          <h1 className="font-bold text-4xl md:text-5xl mb-4">Our Catalogue</h1>
          <p className="text-gray-400 max-w-lg mx-auto">Explore our collections — every piece is available as a bespoke commission tailored to your measurements.</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? "text-white" : "border border-white/20 text-gray-400 hover:border-white/40"}`}
              style={selectedCategory === cat ? { background: brandColor } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Scissors size={40} className="mx-auto mb-4 opacity-30" />
            <p>No items in this category yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/25 transition-all group"
              >
                <div className="h-56 bg-white/5 flex items-center justify-center relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Scissors size={36} style={{ color: accentColor }} />
                      <span className="text-xs text-gray-500">{item.category}</span>
                    </div>
                  )}
                  {item.category && (
                    <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-gray-300 backdrop-blur-sm">
                      {item.category}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                  {item.description && (
                    <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">{item.description}</p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-400">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    {item.price ? (
                      <span className="font-bold text-xl" style={{ color: accentColor }}>
                        {item.price.toLocaleString()} <span className="text-sm font-normal text-gray-400">{item.currency || currency}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Price on request</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); requireAuth("virtual_tryon"); }}
                      className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {!user && <Lock size={10} />}
                      Try On
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Tailors Page ────────────────────────────────────────────────────────────
const TailorsPage = ({ tailors, brandColor, accentColor, fontHeading, slug }: {
  tailors: TailorData[];
  brandColor: string;
  accentColor: string;
  fontHeading: string;
  slug: string;
}) => (
  <div className="container mx-auto px-4 lg:px-8 py-16">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-12 text-center">
        <h1 className="font-bold text-4xl md:text-5xl mb-4" style={{ fontFamily: fontHeading }}>Our Tailors</h1>
        <p className="text-gray-400 max-w-lg mx-auto">Discover the talented artisans behind our bespoke creations.</p>
      </div>

      {tailors.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Scissors size={48} className="mx-auto mb-4 opacity-30" />
          <p>No tailors listed yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tailors.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/site/${slug}/tailor/${t.id}`}
                className="block rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/25 hover:bg-white/10 transition-all group"
              >
                <div className="h-32 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandColor}20, ${accentColor}10)` }}>
                  <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`tp-${t.id}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="15" cy="15" r="1" fill={accentColor} />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#tp-${t.id})`} />
                  </svg>
                  <div className="absolute bottom-0 left-6 translate-y-1/2">
                    <div className="w-20 h-20 rounded-xl border-4 flex items-center justify-center" style={{ borderColor: `${brandColor}40`, background: `${brandColor}20` }}>
                      <Scissors size={32} style={{ color: brandColor }} className="opacity-60" />
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-14">
                  <h3 className="font-bold text-xl mb-1" style={{ fontFamily: fontHeading }}>{t.display_name || "Tailor"}</h3>
                  {t.specialty && (
                    <span className="text-xs font-medium" style={{ color: accentColor }}>{t.specialty}</span>
                  )}
                  {t.bio && (
                    <p className="text-gray-400 text-sm mt-3 line-clamp-3 leading-relaxed">{t.bio}</p>
                  )}
                  <span className="inline-block mt-4 text-sm font-medium group-hover:translate-x-1 transition-transform" style={{ color: accentColor }}>
                    View Portfolio →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  </div>
);

// ─── Booking Page ─────────────────────────────────────────────────────────────
const BookingPage = ({ org, brandColor, accentColor }: {
  org: OrgData;
  brandColor: string;
  accentColor: string;
}) => {
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    service_type: "consultation",
    preferred_date: "",
    preferred_time: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const { error: err } = await supabase
      .from("org_consultations")
      .insert({
        org_id: org.id,
        ...form,
        preferred_date: form.preferred_date || null,
      });

    setSubmitting(false);
    if (err) {
      setError("Something went wrong. Please try again or contact us directly.");
    } else {
      setSubmitted(true);
    }
  };

  const serviceTypes = [
    { value: "consultation", label: "Style Consultation" },
    { value: "measurement", label: "Measurement Session" },
    { value: "fitting", label: "Fitting Appointment" },
    { value: "order_pickup", label: "Order Pickup" },
    { value: "other", label: "Other" },
  ];

  const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  if (submitted) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-24 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${brandColor}22` }}>
            <Calendar size={36} style={{ color: brandColor }} />
          </div>
          <h2 className="font-bold text-3xl">Booking Received!</h2>
          <p className="text-gray-400 leading-relaxed">
            Thank you, <strong className="text-white">{form.customer_name}</strong>! We've received your appointment request and will confirm via email within 24 hours.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ customer_name: "", customer_email: "", customer_phone: "", service_type: "consultation", preferred_date: "", preferred_time: "", message: "" }); }}
            className="px-6 py-3 rounded-full text-sm font-medium border border-white/20 hover:bg-white/10 transition-colors"
          >
            Book Another Appointment
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-16 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-10 text-center">
          <h1 className="font-bold text-4xl md:text-5xl mb-4">Book an Appointment</h1>
          <p className="text-gray-400">Fill in your details and we'll confirm your slot within 24 hours.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Full Name *</label>
              <input
                required
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email *</label>
              <input
                required
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Phone Number</label>
            <input
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              placeholder="+234 800 000 0000"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Service Type *</label>
            <select
              required
              value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              {serviceTypes.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Preferred Date</label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={form.preferred_date}
                onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Preferred Time</label>
              <select
                value={form.preferred_time}
                onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select a time</option>
                {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Message / Special Requests</label>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell us about your style ideas, fabric preferences, or any other details..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-semibold text-sm uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: brandColor }}
          >
            {submitting ? "Submitting..." : "Request Appointment"}
          </button>

          <p className="text-center text-xs text-gray-500">
            We'll reach out within 24 hours to confirm your appointment.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default OrgWebsite;
