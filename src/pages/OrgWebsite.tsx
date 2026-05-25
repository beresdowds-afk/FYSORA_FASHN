import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram, MessageCircle, Phone, Mail, MapPin, ExternalLink, Scissors, Calendar, BookOpen,
  Home, Menu, X, Sparkles, Lock, Facebook, Twitter, Linkedin, Youtube, Users, Download,
  PhoneCall, MessageSquare, Send, Map, ChevronUp, Info, Globe, Heart, ShoppingBag,
  Leaf, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTemplate, isLightTemplate } from "@/config/websiteTemplates";

// ─── Types ───────────────────────────────────────────────────────────────────
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
  our_story?: string | null;
  template_id?: string | null;
}

interface OfficerData {
  id: string;
  full_name: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  bio: string | null;
  photo_url: string | null;
  display_order: number;
  is_public?: boolean;
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
const FloatingCTA = ({ org, website, brandColor, isLight }: { org: OrgData; website: OrgWebsiteData; brandColor: string; isLight: boolean }) => {
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
            <span className={`hidden sm:block px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? "bg-black/80 text-white" : "bg-white/90 text-black"} backdrop-blur-sm`}>
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
const GoogleMapsLink = ({ address, isLight }: { address: string; isLight: boolean }) => (
  <a
    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
      isLight
        ? "border border-black/10 text-black/60 hover:text-black hover:border-black/20 bg-black/5"
        : "border border-white/15 text-gray-300 hover:text-white hover:border-white/30 bg-white/5"
    }`}
  >
    <Map size={16} className="text-red-400" />
    View on Google Maps
  </a>
);

// ─── Newsletter Signup ───────────────────────────────────────────────────────
const NewsletterSignup = ({ brandColor, isLight }: { brandColor: string; isLight: boolean }) => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  if (subscribed) {
    return (
      <p className="text-sm text-green-600 flex items-center gap-2">
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
        className={`flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none transition-colors ${
          isLight
            ? "border border-black/10 bg-white text-black placeholder:text-black/30 focus:border-black/30"
            : "border border-white/10 bg-white/5 text-white placeholder:text-gray-600 focus:border-white/30"
        }`}
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: brandColor }}
      >
        Subscribe
      </button>
    </form>
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
      className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full flex items-center justify-center border border-black/10 bg-white/80 backdrop-blur-sm hover:scale-110 transition-transform shadow-lg"
    >
      <ChevronUp size={18} style={{ color: brandColor }} />
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
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

      const { data: orgData } = user
        ? await (supabase.from("organizations_public" as any).select("*").eq("slug", slug).single() as any)
        : await (supabase.from("organizations_summary" as any).select("*").eq("slug", slug).single() as any);

      if (!orgData) { setLoading(false); return; }
      setOrg(orgData as any);

      const { data: websiteData } = await supabase
        .from("org_websites_public" as any)
        .select("*")
        .eq("org_id", (orgData as any).id)
        .single();

      if (websiteData) setWebsite(websiteData as unknown as OrgWebsiteData);

      const [catalogueResult, officersResult, tailorsResult] = await Promise.all([
        supabase.from("org_catalogue_items").select("*").eq("org_id", orgData.id).eq("is_available", true).order("sort_order"),
        supabase.rpc("get_public_org_officers", { _org_id: orgData.id }),
        supabase.from("tailor_contracts").select("tailor_id").eq("org_id", orgData.id).eq("status", "active"),
      ]);

      setCatalogue((catalogueResult.data || []) as CatalogueItem[]);
      setOfficers((officersResult.data || []) as OfficerData[]);

      const tailorIds = (tailorsResult.data || []).map((t: any) => t.tailor_id);
      if (tailorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, display_name, specialty, bio").in("id", tailorIds);
        setTailors((profiles || []) as TailorData[]);
      }

      setLoading(false);
    };
    load();
  }, [slug]);

  // Determine template — GABULK FASHION STUDIO uses Heritage Luxe by default
  const templateId = useMemo(() => {
    if (website?.template_id) return website.template_id;
    // Auto-detect GABULK
    if (org?.name?.toUpperCase().includes("GABULK")) return "hertunba-luxe";
    return "dark-atelier";
  }, [website, org]);

  const template = getTemplate(templateId);
  const isLight = isLightTemplate(templateId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: template.design.bgBase }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: template.design.textSecondary }} />
      </div>
    );
  }

  if (!org || !website || !website.is_enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: template.design.bgBase, color: template.design.textPrimary }}>
        <Scissors size={48} style={{ color: template.design.textSecondary }} className="opacity-50" />
        <h1 className="text-2xl font-bold">Website not found</h1>
        <p style={{ color: template.design.textSecondary }}>This organization doesn't have a public website yet.</p>
        <Link to="/" className="text-sm hover:underline" style={{ color: template.design.textSecondary }}>← Back to FYSORA FASHN (Fashion Stitches Africa)</Link>
      </div>
    );
  }

  if (website.mode === "custom_integration" && website.webhook_url) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: template.design.bgBase, color: template.design.textPrimary }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{org.name}</h1>
          <p className="mb-6" style={{ color: template.design.textSecondary }}>This organisation uses a custom website integration.</p>
          <a href={website.webhook_url} target="_blank" rel="noopener noreferrer">
            <Button>Visit Website <ExternalLink size={16} className="ml-2" /></Button>
          </a>
        </div>
      </div>
    );
  }

  const brandColor = website.brand_color || "#8B5CF6";
  const accentColor = website.accent_color || "#D4AF37";
  const currency = org.currency || "NGN";
  const fontHeading = website.font_heading || template.design.fontHeadingDefault;
  const fontBody = website.font_body || template.design.fontBodyDefault;
  const td = template.design;

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
    (link as HTMLLinkElement).href = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700`).join("&")}&display=swap`;
  }

  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "about" as const, label: "About", icon: Info },
    { id: "catalogue" as const, label: "Collections", icon: BookOpen },
    { id: "tailors" as const, label: "Artisans", icon: Users },
    { id: "booking" as const, label: "Book", icon: Calendar },
  ];

  const socialLinks = [
    website.instagram_url && { icon: Instagram, href: website.instagram_url, label: "Instagram" },
    website.facebook_url && { icon: Facebook, href: website.facebook_url, label: "Facebook" },
    website.whatsapp_number && { icon: MessageCircle, href: `https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`, label: "WhatsApp" },
    website.twitter_url && { icon: Twitter, href: website.twitter_url, label: "X" },
    website.linkedin_url && { icon: Linkedin, href: website.linkedin_url, label: "LinkedIn" },
    website.youtube_url && { icon: Youtube, href: website.youtube_url, label: "YouTube" },
    website.tiktok_url && { icon: Globe, href: website.tiktok_url, label: "TikTok" },
  ].filter(Boolean) as { icon: any; href: string; label: string }[];

  // Shared style helpers
  const textMain = { color: td.textPrimary };
  const textMuted = { color: td.textSecondary };
  const borderStyle = isLight ? "border-black/[0.08]" : "border-white/[0.08]";

  return (
    <div className="min-h-screen" style={{ backgroundColor: td.bgBase, color: td.textPrimary, fontFamily: `'${fontBody}', sans-serif` }}>
      {/* ─── Editorial Navigation ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${borderStyle}`}
        style={{ backgroundColor: isLight ? `${td.bgBase}ee` : `${td.bgBase}ee` }}>
        {/* FSA Banner */}
        <div className="text-center py-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ background: isLight ? `${brandColor}08` : `${brandColor}15`, color: accentColor }}>
          Powered by FYSORA FASHN (Fashion Stitches Africa) — <Link to={`/site/${slug}/install`} className="underline hover:no-underline">Get the App</Link>
        </div>

        <div className={`${td.containerMaxWidth} mx-auto flex items-center justify-between h-16 px-6 lg:px-12`}>
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-full object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                <Scissors size={16} className="text-white" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium text-sm tracking-wide" style={{ fontFamily: `'${fontHeading}'`, color: td.textPrimary }}>{org.name}</span>
              {website.tagline && <span className="text-[10px] hidden sm:block" style={textMuted}>{website.tagline}</span>}
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                className="text-xs font-medium tracking-[0.12em] uppercase transition-colors"
                style={{ color: activePage === item.id ? brandColor : td.textSecondary }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3">
            {org.phone && (
              <a href={`tel:${org.phone}`} className={`w-9 h-9 rounded-full flex items-center justify-center border ${borderStyle} transition-colors hover:opacity-70`}>
                <PhoneCall size={14} style={textMuted} />
              </a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className={`w-9 h-9 rounded-full flex items-center justify-center border ${borderStyle} transition-colors hover:opacity-70`}>
                <Mail size={14} style={textMuted} />
              </a>
            )}
            {website.whatsapp_number && (
              <a href={`https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-full flex items-center justify-center border ${borderStyle} transition-colors hover:opacity-70`}>
                <MessageCircle size={14} style={textMuted} />
              </a>
            )}
          </div>

          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={textMain}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`lg:hidden border-t ${borderStyle} overflow-hidden`}
              style={{ backgroundColor: td.bgSurface }}
            >
              <div className="px-6 py-6 flex flex-col gap-5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                    className="text-left text-sm tracking-[0.1em] uppercase flex items-center gap-3"
                    style={{ color: activePage === item.id ? brandColor : td.textSecondary }}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
                <div className={`flex gap-3 pt-4 border-t ${borderStyle}`}>
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border ${borderStyle} text-xs font-medium`} style={textMuted}>
                      <PhoneCall size={14} /> Call
                    </a>
                  )}
                  {org.email && (
                    <a href={`mailto:${org.email}`} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border ${borderStyle} text-xs font-medium`} style={textMuted}>
                      <Mail size={14} /> Email
                    </a>
                  )}
                  {website.whatsapp_number && (
                    <a href={`https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border ${borderStyle} text-xs font-medium`} style={textMuted}>
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Page Content ─── */}
      <div className="pt-[calc(4rem+1.75rem)]">
        {activePage === "home" && (
          <HomePage org={org} website={website} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} officers={officers} tailors={tailors} slug={slug!} onNavigate={setActivePage} user={user} requireAuth={requireAuth} template={template} isLight={isLight} />
        )}
        {activePage === "about" && (
          <AboutPage org={org} website={website} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} officers={officers} template={template} isLight={isLight} />
        )}
        {activePage === "catalogue" && (
          <CataloguePage items={catalogue} currency={currency} brandColor={brandColor} accentColor={accentColor} user={user} requireAuth={requireAuth} template={template} isLight={isLight} fontHeading={fontHeading} />
        )}
        {activePage === "tailors" && (
          <TailorsPage tailors={tailors} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} slug={slug!} template={template} isLight={isLight} />
        )}
        {activePage === "booking" && (
          <BookingPage org={org} brandColor={brandColor} accentColor={accentColor} template={template} isLight={isLight} fontHeading={fontHeading} />
        )}
      </div>

      <FloatingCTA org={org} website={website} brandColor={brandColor} isLight={isLight} />

      {/* ─── Luxe Footer ─── */}
      <footer className={`border-t ${borderStyle} pt-20 pb-10 mt-20`} style={{ backgroundColor: td.bgSurface }}>
        <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-full object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                    <Scissors size={12} className="text-white" />
                  </div>
                )}
                <span className="text-lg" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>{org.name}</span>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={textMuted}>{website.tagline || org.description}</p>
              {org.address && <GoogleMapsLink address={org.address} isLight={isLight} />}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] mb-5" style={textMuted}>Navigate</h4>
              <div className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => { setActivePage(item.id); window.scrollTo(0, 0); }} className="text-left text-sm transition-colors hover:opacity-70 flex items-center gap-2" style={textMuted}>
                    <item.icon size={13} style={{ color: accentColor }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] mb-5" style={textMuted}>Contact</h4>
              <div className="flex flex-col gap-3 text-sm mb-5" style={textMuted}>
                {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-2 hover:opacity-70"><Phone size={14} /> {org.phone}</a>}
                {org.email && <a href={`mailto:${org.email}`} className="flex items-center gap-2 hover:opacity-70"><Mail size={14} /> {org.email}</a>}
                {org.address && <span className="flex items-center gap-2"><MapPin size={14} /> {org.address}</span>}
              </div>
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-full border ${borderStyle} flex items-center justify-center transition-colors hover:opacity-70`} style={textMuted} title={s.label}>
                      <s.icon size={16} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] mb-5" style={textMuted}>Stay Updated</h4>
              <p className="text-sm mb-4" style={textMuted}>Subscribe for new collections and exclusive offers.</p>
              <NewsletterSignup brandColor={brandColor} isLight={isLight} />
              <div className={`mt-6 p-4 rounded-xl border ${borderStyle}`} style={{ backgroundColor: isLight ? `${brandColor}06` : "rgba(255,255,255,0.03)" }}>
                <p className="text-xs mb-2" style={textMuted}>Get the {org.name} app</p>
                <Link
                  to={`/site/${slug}/install`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: brandColor }}
                >
                  <Download size={14} /> Download App
                </Link>
                <p className="text-[10px] mt-2" style={{ color: `${td.textSecondary}99` }}>Install {org.name} on your device with a guided tour</p>
              </div>
            </div>
          </div>

          {/* Sustainability */}
          {td.showSustainabilityBadge && (
            <div className={`border-t ${borderStyle} py-6 mb-6 flex items-center justify-center gap-3`}>
              <Leaf size={16} style={{ color: "#22c55e" }} />
              <span className="text-xs tracking-[0.15em] uppercase" style={textMuted}>{template.copy.sustainabilityNote}</span>
            </div>
          )}

          <div className={`border-t ${borderStyle} pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs`} style={textMuted}>
            <span>© {new Date().getFullYear()} {org.name}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="hover:opacity-70 transition-colors">Create FSA Account</Link>
              <span>·</span>
              <Link to="/" className="hover:opacity-70 transition-colors">FYSORA FASHN (Fashion Stitches Africa)</Link>
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTop brandColor={brandColor} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE — Editorial Luxury
// ═══════════════════════════════════════════════════════════════════════════════
const HomePage = ({ org, website, brandColor, accentColor, fontHeading, officers, tailors, slug, onNavigate, user, requireAuth, template, isLight }: {
  org: OrgData; website: OrgWebsiteData; brandColor: string; accentColor: string; fontHeading: string;
  officers: OfficerData[]; tailors: TailorData[]; slug: string;
  onNavigate: (p: "home" | "about" | "catalogue" | "booking" | "tailors") => void;
  user: any; requireAuth: (action: string) => boolean;
  template: any; isLight: boolean;
}) => {
  const td = template.design;
  const textMuted = { color: td.textSecondary };
  const borderStyle = isLight ? "border-black/[0.08]" : "border-white/[0.08]";
  const [storyOpen, setStoryOpen] = useState(false);
  const hasStory = !!(website.our_story && website.our_story.trim());

  return (
    <div>
      {/* ─── Hero: Full-screen Editorial ─── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {website.hero_image_url ? (
          <div className="absolute inset-0">
            <img src={website.hero_image_url} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: td.bgSurface }}>
            <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse at 30% 50%, ${brandColor} 0%, transparent 60%)` }} />
            {/* Textile pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ankara" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M0 40 Q20 0 40 40 Q60 80 80 40" stroke={accentColor} strokeWidth="0.5" fill="none" />
                  <path d="M0 40 Q20 80 40 40 Q60 0 80 40" stroke={brandColor} strokeWidth="0.5" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ankara)" />
            </svg>
          </div>
        )}

        <div className={`relative ${td.containerMaxWidth} mx-auto px-6 lg:px-12 py-32`}>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="max-w-3xl">
            {/* Editorial accent line */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-16" style={{ background: accentColor }} />
              <span className="text-[11px] font-medium uppercase tracking-[0.25em]" style={{ color: website.hero_image_url ? "#ffffff99" : td.textSecondary }}>
                Est. {new Date().getFullYear()}
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-6"
              style={{
                fontFamily: `'${fontHeading}'`,
                fontWeight: td.headingWeight,
                letterSpacing: td.headingSpacing,
                color: website.hero_image_url ? "#ffffff" : td.textPrimary,
              }}
            >
              {org.name}
            </h1>

            {website.tagline && (
              <p className="text-xl md:text-2xl mb-4 font-light tracking-wide" style={{ color: website.hero_image_url ? "#ffffffcc" : accentColor }}>
                {website.tagline}
              </p>
            )}

            {website.hero_description && (
              <p className="text-base md:text-lg leading-relaxed mb-10 max-w-xl" style={{ color: website.hero_image_url ? "#ffffff99" : td.textSecondary }}>
                {website.hero_description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={() => onNavigate("catalogue")}
                className="px-10 py-4 rounded-none font-medium text-xs uppercase tracking-[0.2em] text-white transition-all hover:opacity-90"
                style={{ background: brandColor }}
              >
                {template.copy.ctaPrimary}
              </button>
              <button
                onClick={() => onNavigate("about")}
                className="px-10 py-4 rounded-none font-medium text-xs uppercase tracking-[0.2em] border transition-all hover:opacity-70"
                style={{
                  borderColor: website.hero_image_url ? "#ffffff44" : `${td.textPrimary}22`,
                  color: website.hero_image_url ? "#ffffff" : td.textPrimary,
                }}
              >
                {template.copy.ctaSecondary}
              </button>
              {hasStory && (
                <button
                  onClick={() => setStoryOpen(true)}
                  className="px-10 py-4 rounded-none font-medium text-xs uppercase tracking-[0.2em] border transition-all hover:opacity-90 inline-flex items-center gap-2"
                  style={{
                    borderColor: accentColor,
                    color: website.hero_image_url ? "#ffffff" : accentColor,
                    background: website.hero_image_url ? `${accentColor}33` : "transparent",
                  }}
                >
                  <BookOpen size={14} /> Our Story
                </button>
              )}
            </div>

            {org.address && <GoogleMapsLink address={org.address} isLight={!website.hero_image_url && isLight} />}
          </motion.div>
        </div>
      </section>

      {/* ─── Our Story Card (modal) ─── */}
      {hasStory && (
        <AnimatePresence>
          {storyOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setStoryOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`Our story — ${org.name}`}
            >
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto"
                style={{ background: td.bgSurface, color: td.textPrimary, borderRadius: 10 }}
              >
                <button
                  onClick={() => setStoryOpen(false)}
                  aria-label="Close"
                  className="absolute top-4 right-4 p-2 rounded-full hover:opacity-70 z-10"
                  style={{ color: td.textPrimary }}
                >
                  <X size={18} />
                </button>
                <div className="p-8 md:p-12 space-y-10">
                  {/* Header with org logo */}
                  <div className="flex flex-col items-center text-center">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={`${org.name} logo`}
                        className="w-24 h-24 md:w-28 md:h-28 object-contain rounded-full border mb-5"
                        style={{ borderColor: `${accentColor}55`, background: `${brandColor}08` }}
                      />
                    ) : (
                      <div
                        className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center rounded-full mb-5 text-3xl font-light"
                        style={{ background: `${brandColor}12`, color: accentColor }}
                      >
                        {org.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3 justify-center">
                      <div className="h-px w-10" style={{ background: accentColor }} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: accentColor }}>Our Story</span>
                      <div className="h-px w-10" style={{ background: accentColor }} />
                    </div>
                    <h2 className="text-3xl md:text-4xl" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>
                      {org.name}
                    </h2>
                    <div className="text-base md:text-lg leading-relaxed whitespace-pre-line mt-6 text-left" style={{ color: td.textSecondary }}>
                      {website.our_story}
                    </div>
                  </div>

                  {/* Vision & Mission */}
                  {(website.vision_statement || website.mission_statement) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {website.vision_statement && (
                        <div className="p-6 border rounded-lg" style={{ borderColor: `${accentColor}33`, background: `${brandColor}06` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Eye size={14} style={{ color: accentColor }} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: accentColor }}>Our Vision</span>
                          </div>
                          <p className="text-sm md:text-base leading-relaxed" style={{ color: td.textSecondary }}>{website.vision_statement}</p>
                        </div>
                      )}
                      {website.mission_statement && (
                        <div className="p-6 border rounded-lg" style={{ borderColor: `${brandColor}33`, background: `${accentColor}06` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} style={{ color: brandColor }} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: brandColor }}>Our Mission</span>
                          </div>
                          <p className="text-sm md:text-base leading-relaxed" style={{ color: td.textSecondary }}>{website.mission_statement}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Our Team */}
                  {officers.filter(o => o.is_public).length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-6 justify-center">
                        <div className="h-px w-8" style={{ background: brandColor }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: brandColor }}>Our Team</span>
                        <div className="h-px w-8" style={{ background: brandColor }} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {officers.filter(o => o.is_public).map((officer) => (
                          <div key={officer.id} className="text-center">
                            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-3 border" style={{ borderColor: `${accentColor}40` }}>
                              {officer.photo_url ? (
                                <img src={officer.photo_url} alt={officer.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: `${brandColor}12` }}>
                                  <span className="text-lg font-light" style={{ color: td.textSecondary }}>
                                    {officer.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="font-medium text-sm" style={{ fontFamily: `'${fontHeading}'`, color: td.textPrimary }}>{officer.full_name}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: accentColor }}>{officer.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ─── Services Strip ─── */}
      <section className={`${td.sectionPadding} border-t ${borderStyle}`}>
        <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12`}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-4 block" style={textMuted}>What We Offer</span>
            <h2 className="text-3xl md:text-4xl" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Crafted With Care</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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
                transition={{ delay: i * 0.15 }}
                className="text-center group"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110" style={{ background: `${brandColor}12` }}>
                  <item.icon size={28} style={{ color: brandColor }} />
                </div>
                <h3 className="text-lg font-medium mb-3" style={{ fontFamily: `'${fontHeading}'` }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={textMuted}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Best Sellers / Featured ─── */}
      <section className={`${td.sectionPadding} border-t ${borderStyle}`} style={{ backgroundColor: td.bgSurface }}>
        <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12`}>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-center justify-between mb-12">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-2 block" style={textMuted}>Featured</span>
              <h2 className="text-3xl" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Best Sellers</h2>
            </div>
            <button onClick={() => onNavigate("catalogue")} className="text-xs font-medium uppercase tracking-[0.15em] hover:opacity-70 transition-colors" style={{ color: brandColor }}>
              View All →
            </button>
          </motion.div>
          {/* This will be empty if no catalogue items */}
        </div>
      </section>

      {/* ─── FSA Platform Features ─── */}
      <section className={`${td.sectionPadding} border-t ${borderStyle}`}>
        <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12`}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles size={18} style={{ color: brandColor }} />
              <span className="text-[11px] font-medium uppercase tracking-[0.25em]" style={{ color: brandColor }}>Powered by FYSORA FASHN (Fashion Stitches Africa)</span>
            </div>
            <h2 className="text-3xl md:text-4xl mb-3" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Smart Fashion Tools</h2>
            <p className="max-w-xl mx-auto text-sm leading-relaxed" style={textMuted}>Access AI-powered measurements, virtual try-on, and seamless ordering.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, title: "AI Body Measurements", desc: "Get precise measurements using your phone camera — powered by AI.", action: "ai_measurements" },
              { icon: Eye, title: "Virtual Try-On", desc: "See how garments look on you before ordering — try styles virtually.", action: "virtual_tryon" },
              { icon: Calendar, title: "Video Consultation", desc: "Book a live video session with a tailor for real-time style advice.", action: "video_consultation" },
              { icon: ShoppingBag, title: "Place an Order", desc: "Commission bespoke garments directly with tracked delivery.", action: "place_order" },
            ].map((feat, i) => (
              <motion.div
                key={feat.action}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-8 border ${borderStyle} hover:shadow-lg transition-all cursor-pointer group`}
                style={{ backgroundColor: `${brandColor}06` }}
                onClick={() => requireAuth(feat.action)}
              >
                {!user && (
                  <div className="absolute top-4 right-4">
                    <Lock size={14} style={{ color: `${td.textSecondary}60` }} />
                  </div>
                )}
                <div className="w-12 h-12 flex items-center justify-center mb-5" style={{ background: `${brandColor}12` }}>
                  <feat.icon size={24} style={{ color: brandColor }} />
                </div>
                <h3 className="font-medium text-base mb-2" style={{ fontFamily: `'${fontHeading}'` }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={textMuted}>{feat.desc}</p>
                <span className="text-xs font-medium uppercase tracking-[0.1em] group-hover:opacity-70" style={{ color: brandColor }}>
                  {user ? "Open →" : "Sign in →"}
                </span>
              </motion.div>
            ))}
          </div>
          {!user && (
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-sm mt-8" style={textMuted}>
              These features require a free <Link to="/auth" style={{ color: brandColor }} className="hover:underline">FYSORA FASHN (Fashion Stitches Africa)</Link> account.
            </motion.p>
          )}
        </div>
      </section>

      {/* ─── Tailors Showcase ─── */}
      {tailors.length > 0 && (
        <section className={`${td.sectionPadding} border-t ${borderStyle}`} style={{ backgroundColor: td.bgSurface }}>
          <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12`}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
              <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-3 block" style={textMuted}>The Team</span>
              <h2 className="text-3xl md:text-4xl" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Our Artisans</h2>
            </motion.div>
            <div className={`grid gap-8 ${tailors.length <= 3 ? "grid-cols-1 md:grid-cols-" + tailors.length : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {tailors.slice(0, 6).map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Link to={`/site/${slug}/tailor/${t.id}`} className={`block p-6 border ${borderStyle} hover:shadow-lg transition-all group`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 flex items-center justify-center" style={{ background: `${brandColor}12` }}>
                        <Scissors size={24} style={{ color: brandColor }} />
                      </div>
                      <div>
                        <h3 className="font-medium text-base" style={{ fontFamily: `'${fontHeading}'` }}>{t.display_name || "Tailor"}</h3>
                        {t.specialty && <span className="text-xs" style={{ color: accentColor }}>{t.specialty}</span>}
                      </div>
                    </div>
                    {t.bio && <p className="text-sm line-clamp-2 leading-relaxed" style={textMuted}>{t.bio}</p>}
                    <span className="inline-block mt-4 text-xs font-medium uppercase tracking-[0.1em] group-hover:opacity-70" style={{ color: accentColor }}>
                      View Portfolio →
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA Banner ─── */}
      <section className={`${td.sectionPadding}`}>
        <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="py-16 px-12 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${brandColor}15, ${accentColor}08)`, border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}` }}
          >
            <h2 className="text-3xl md:text-4xl mb-4" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Ready to Start?</h2>
            <p className="mb-8 max-w-md mx-auto text-sm leading-relaxed" style={textMuted}>Book a free consultation and let us bring your vision to life with Africa's finest fabrics.</p>
            <button
              onClick={() => onNavigate("booking")}
              className="px-10 py-4 text-white font-medium text-xs uppercase tracking-[0.2em] transition-all hover:opacity-90"
              style={{ background: brandColor }}
            >
              Book Now — It's Free
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABOUT PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const AboutPage = ({ org, website, brandColor, accentColor, fontHeading, officers, template, isLight }: {
  org: OrgData; website: OrgWebsiteData; brandColor: string; accentColor: string; fontHeading: string;
  officers: OfficerData[]; template: any; isLight: boolean;
}) => {
  const td = template.design;
  const textMuted = { color: td.textSecondary };
  const borderStyle = isLight ? "border-black/[0.08]" : "border-white/[0.08]";

  return (
    <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12 py-20`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-20 text-center max-w-2xl mx-auto">
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-4 block" style={textMuted}>Our Story</span>
          <h1 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>About {org.name}</h1>
          <p className="text-base leading-relaxed" style={textMuted}>{org.description || template.copy.aboutIntro}</p>
        </div>

        {(website.our_story || website.vision_statement || website.mission_statement || officers.filter(o => o.is_public).length > 0) && (
          <div className="text-center mb-24 p-8 border rounded-lg" style={{ borderColor: `${accentColor}22`, backgroundColor: `${brandColor}04` }}>
            <p className="text-sm mb-4" style={textMuted}>
              Discover our journey, vision, mission and the team behind {org.name}.
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: accentColor }}>
              Tap the “Our Story” button on the home page
            </p>
          </div>
        )}

      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE PAGE — Editorial Grid (Hertunba Aka Olu Style)
// ═══════════════════════════════════════════════════════════════════════════════
const CataloguePage = ({ items, currency, brandColor, accentColor, user, requireAuth, template, isLight, fontHeading }: {
  items: CatalogueItem[]; currency: string; brandColor: string; accentColor: string;
  user: any; requireAuth: (action: string) => boolean;
  template: any; isLight: boolean; fontHeading: string;
}) => {
  const td = template.design;
  const textMuted = { color: td.textSecondary };
  const borderStyle = isLight ? "border-black/[0.08]" : "border-white/[0.08]";
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]))];

  let filtered = selectedCategory === "All" ? items : items.filter((i) => i.category === selectedCategory);

  if (sortBy === "price-low") filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
  if (sortBy === "price-high") filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));

  return (
    <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12 py-20`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Collection Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-4 block" style={textMuted}>Collection</span>
          <h1 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Our Catalogue</h1>
          {td.editorialDescriptions && (
            <p className="text-base leading-relaxed" style={{ ...textMuted, fontStyle: "italic" }}>{template.copy.catalogueIntro}</p>
          )}
        </div>

        {/* Filters & Sort */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b ${borderStyle}`}>
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all"
                style={{
                  background: selectedCategory === cat ? brandColor : "transparent",
                  color: selectedCategory === cat ? "#ffffff" : td.textSecondary,
                  border: selectedCategory === cat ? "none" : `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-4 py-2 bg-transparent border rounded-none focus:outline-none"
            style={{ borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)", color: td.textSecondary }}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
          </select>
        </div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24" style={textMuted}>
            <Scissors size={40} className="mx-auto mb-4 opacity-30" />
            <p>No items in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group cursor-pointer"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Image Container — Portrait ratio like Hertunba */}
                <div className="relative overflow-hidden mb-4" style={{ aspectRatio: "3/4" }}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: `${brandColor}08` }}>
                      <Scissors size={32} style={{ color: `${td.textSecondary}40` }} />
                      <span className="text-[10px] mt-2" style={{ color: `${td.textSecondary}60` }}>{item.category}</span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <AnimatePresence>
                    {hoveredId === item.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-end justify-center pb-4 bg-gradient-to-t from-black/40 to-transparent"
                      >
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); requireAuth("virtual_tryon"); }}
                            className="px-4 py-2 bg-white text-black text-[10px] font-medium uppercase tracking-[0.12em] hover:bg-gray-100 transition-colors"
                          >
                            Try On
                          </button>
                          <button className="w-9 h-9 bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
                            <Heart size={14} className="text-black" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sold out badge */}
                  {item.tags?.includes("sold-out") && (
                    <div className="absolute top-3 left-3 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] bg-black text-white">
                      Sold Out
                    </div>
                  )}
                </div>

                {/* Product Info — Clean, minimal like Hertunba */}
                <div>
                  <h3 className="text-sm font-medium mb-1 tracking-wide" style={{ fontFamily: `'${fontHeading}'` }}>{item.name}</h3>
                  {item.price ? (
                    <span className="text-sm" style={textMuted}>
                      {item.price.toLocaleString()} {item.currency || currency}
                    </span>
                  ) : (
                    <span className="text-xs italic" style={textMuted}>Price on request</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAILORS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TailorsPage = ({ tailors, brandColor, accentColor, fontHeading, slug, template, isLight }: {
  tailors: TailorData[]; brandColor: string; accentColor: string; fontHeading: string; slug: string;
  template: any; isLight: boolean;
}) => {
  const td = template.design;
  const textMuted = { color: td.textSecondary };
  const borderStyle = isLight ? "border-black/[0.08]" : "border-white/[0.08]";

  return (
    <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12 py-20`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-16 text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-4 block" style={textMuted}>The Craft</span>
          <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Our Artisans</h1>
          <p className="max-w-lg mx-auto text-sm leading-relaxed" style={textMuted}>Discover the talented artisans behind our bespoke creations.</p>
        </div>

        {tailors.length === 0 ? (
          <div className="text-center py-24" style={textMuted}>
            <Scissors size={48} className="mx-auto mb-4 opacity-30" />
            <p>No tailors listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {tailors.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/site/${slug}/tailor/${t.id}`} className={`block border ${borderStyle} overflow-hidden hover:shadow-lg transition-all group`}>
                  <div className="h-32 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandColor}12, ${accentColor}08)` }}>
                    <div className="absolute bottom-0 left-6 translate-y-1/2">
                      <div className="w-20 h-20 flex items-center justify-center border-4" style={{ borderColor: `${brandColor}30`, background: `${brandColor}10`, borderRadius: "50%" }}>
                        <Scissors size={32} style={{ color: brandColor }} className="opacity-50" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-14">
                    <h3 className="font-medium text-lg mb-1" style={{ fontFamily: `'${fontHeading}'` }}>{t.display_name || "Tailor"}</h3>
                    {t.specialty && <span className="text-xs" style={{ color: accentColor }}>{t.specialty}</span>}
                    {t.bio && <p className="text-sm mt-3 line-clamp-3 leading-relaxed" style={textMuted}>{t.bio}</p>}
                    <span className="inline-block mt-4 text-xs font-medium uppercase tracking-[0.1em] group-hover:opacity-70" style={{ color: accentColor }}>
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
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const BookingPage = ({ org, brandColor, accentColor, template, isLight, fontHeading }: {
  org: OrgData; brandColor: string; accentColor: string; template: any; isLight: boolean; fontHeading: string;
}) => {
  const td = template.design;
  const textMuted = { color: td.textSecondary };
  const borderStyle = isLight ? "border-black/[0.08]" : "border-white/[0.08]";

  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    service_type: "consultation", preferred_date: "", preferred_time: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("org_consultations").insert({ org_id: org.id, ...form, preferred_date: form.preferred_date || null });
    setSubmitting(false);
    if (err) setError("Something went wrong. Please try again.");
    else setSubmitted(true);
  };

  const serviceTypes = [
    { value: "consultation", label: "Style Consultation" },
    { value: "measurement", label: "Measurement Session" },
    { value: "fitting", label: "Fitting Appointment" },
    { value: "order_pickup", label: "Order Pickup" },
    { value: "other", label: "Other" },
  ];
  const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  const inputClass = `w-full px-4 py-3 text-sm focus:outline-none transition-colors ${
    isLight
      ? "border border-black/10 bg-white text-black placeholder:text-black/30 focus:border-black/30"
      : "border border-white/10 bg-white/5 text-white placeholder:text-gray-600 focus:border-white/30"
  }`;

  if (submitted) {
    return (
      <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12 py-32 flex flex-col items-center justify-center text-center max-w-lg mx-auto`}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${brandColor}12` }}>
            <Calendar size={36} style={{ color: brandColor }} />
          </div>
          <h2 className="text-3xl" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Booking Received</h2>
          <p className="leading-relaxed" style={textMuted}>
            Thank you, <strong style={{ color: td.textPrimary }}>{form.customer_name}</strong>! We'll confirm via email within 24 hours.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ customer_name: "", customer_email: "", customer_phone: "", service_type: "consultation", preferred_date: "", preferred_time: "", message: "" }); }}
            className={`px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] border ${borderStyle} hover:opacity-70 transition-colors`}
          >
            Book Another Appointment
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`${td.containerMaxWidth} mx-auto px-6 lg:px-12 py-20 max-w-2xl`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-12 text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] mb-4 block" style={textMuted}>Appointments</span>
          <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: `'${fontHeading}'`, fontWeight: td.headingWeight }}>Book a Session</h1>
          <p className="text-sm" style={textMuted}>Fill in your details and we'll confirm within 24 hours.</p>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-5 p-10 border ${borderStyle}`} style={{ backgroundColor: `${td.bgSurface}` }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Full Name *</label>
              <input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Your name" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Email *</label>
              <input required type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="your@email.com" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Phone Number</label>
            <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="+234 800 000 0000" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Service Type *</label>
            <select required value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className={inputClass} style={{ backgroundColor: td.bgSurface }}>
              {serviceTypes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Preferred Date</label>
              <input type="date" min={new Date().toISOString().split("T")[0]} value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} className={inputClass} style={{ backgroundColor: td.bgSurface }} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Preferred Time</label>
              <select value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} className={inputClass} style={{ backgroundColor: td.bgSurface }}>
                <option value="">Select a time</option>
                {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={textMuted}>Special Requests</label>
            <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your style ideas..." className={`${inputClass} resize-none`} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 text-white font-medium text-xs uppercase tracking-[0.2em] transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: brandColor }}
          >
            {submitting ? "Submitting..." : "Request Appointment"}
          </button>
          <p className="text-center text-[10px]" style={{ color: `${td.textSecondary}80` }}>
            We'll reach out within 24 hours to confirm.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default OrgWebsite;
