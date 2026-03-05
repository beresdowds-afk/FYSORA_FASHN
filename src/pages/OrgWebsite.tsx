import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Instagram, MessageCircle, Phone, Mail, MapPin, ExternalLink, Scissors, Calendar, BookOpen, Home, Menu, X, Sparkles, Lock, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
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

const OrgWebsite = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [website, setWebsite] = useState<OrgWebsiteData | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<"home" | "catalogue" | "booking">("home");
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

      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!orgData) { setLoading(false); return; }
      setOrg(orgData);

      const { data: websiteData } = await supabase
        .from("org_websites")
        .select("*")
        .eq("org_id", orgData.id)
        .single();

      if (websiteData) setWebsite(websiteData as unknown as OrgWebsiteData);

      const [catalogueResult, officersResult] = await Promise.all([
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
      ]);

      setCatalogue((catalogueResult.data || []) as CatalogueItem[]);
      setOfficers((officersResult.data || []) as OfficerData[]);
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

  // Custom integration mode — show redirect notice
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
    { id: "catalogue" as const, label: "Catalogue", icon: BookOpen },
    { id: "booking" as const, label: "Book Appointment", icon: Calendar },
  ];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: bgColor, fontFamily: fontBody }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-full object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                <Scissors size={14} className="text-white" />
              </div>
            )}
            <span className="font-bold text-sm tracking-wide" style={{ color: accentColor }}>{org.name}</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`text-sm font-medium transition-colors ${activePage === item.id ? "text-white" : "text-gray-400 hover:text-white"}`}
                style={activePage === item.id ? { color: accentColor } : {}}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#111] border-t border-white/10 px-4 py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }}
                className="text-left text-sm font-medium text-gray-300 hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="pt-16">
        {activePage === "home" && (
          <HomePage org={org} website={website} brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} officers={officers} onNavigate={setActivePage} user={user} requireAuth={requireAuth} />
        )}
        {activePage === "catalogue" && (
          <CataloguePage items={catalogue} currency={currency} brandColor={brandColor} accentColor={accentColor} user={user} requireAuth={requireAuth} />
        )}
        {activePage === "booking" && (
          <BookingPage org={org} brandColor={brandColor} accentColor={accentColor} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-3" style={{ color: accentColor }}>{org.name}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{website.tagline || org.description || "Quality tailoring services."}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Navigation</h4>
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => { setActivePage(item.id); window.scrollTo(0, 0); }} className="text-left text-gray-300 hover:text-white text-sm transition-colors">
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Contact</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                {org.phone && <span className="flex items-center gap-2"><Phone size={14} /> {org.phone}</span>}
                {org.email && <span className="flex items-center gap-2"><Mail size={14} /> {org.email}</span>}
                {org.address && <span className="flex items-center gap-2"><MapPin size={14} /> {org.address}</span>}
                <div className="flex gap-3 mt-2">
                  {website.instagram_url && (
                    <a href={website.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <Instagram size={18} />
                    </a>
                  )}
                  {website.facebook_url && (
                    <a href={website.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <Facebook size={18} />
                    </a>
                  )}
                  {website.whatsapp_number && (
                    <a href={`https://wa.me/${website.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <MessageCircle size={18} />
                    </a>
                  )}
                  {website.twitter_url && (
                    <a href={website.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <Twitter size={18} />
                    </a>
                  )}
                  {website.linkedin_url && (
                    <a href={website.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <Linkedin size={18} />
                    </a>
                  )}
                  {website.tiktok_url && (
                    <a href={website.tiktok_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.8.1V9.01a6.37 6.37 0 0 0-.8-.05 6.34 6.34 0 0 0-6.34 6.34A6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V9.06a8.16 8.16 0 0 0 4.77 1.52V7.15a4.82 4.82 0 0 1-1.01-.46z"/></svg>
                    </a>
                  )}
                  {website.youtube_url && (
                    <a href={website.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      <Youtube size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} {org.name}. All rights reserved.</span>
            <span>Powered by <a href="/" className="hover:text-white transition-colors">Fashion Stitches Africa</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─── Home Page ───────────────────────────────────────────────────────────────
const HomePage = ({ org, website, brandColor, accentColor, fontHeading, officers, onNavigate, user, requireAuth }: {
  org: OrgData;
  website: OrgWebsiteData;
  brandColor: string;
  accentColor: string;
  fontHeading: string;
  officers: OfficerData[];
  onNavigate: (p: "home" | "catalogue" | "booking") => void;
  user: any;
  requireAuth: (action: string) => boolean;
}) => (
  <div>
    {/* Hero */}
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      {website.hero_image_url ? (
        <div className="absolute inset-0">
          <img src={website.hero_image_url} alt="Hero" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/60 via-transparent to-[#0d0d0d]" />
        </div>
      ) : (
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 50%, ${brandColor}22 0%, transparent 60%)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 20%, ${accentColor}11 0%, transparent 50%)` }} />
          {/* Decorative pattern */}
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
          <div className="flex flex-wrap gap-4">
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
        </motion.div>
      </div>
    </section>

    {/* Services section */}
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

    {/* FSA Platform Features — visible but auth-gated */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Sparkles, title: "AI Body Measurements", desc: "Get precise measurements using your phone camera — powered by AI.", action: "ai_measurements" },
            { icon: Scissors, title: "Virtual Try-On", desc: "See how garments look on you before ordering — try styles virtually.", action: "virtual_tryon" },
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

    {/* Officers / Team Section */}
    {officers.length > 0 && (
      <section className="py-24 border-t border-white/10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-bold text-3xl md:text-4xl mb-4" style={{ fontFamily: fontHeading }}>Meet Our Team</h2>
            <p className="text-gray-400 max-w-xl mx-auto">The people behind the craft.</p>
          </motion.div>
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
                <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-500">
                  {officer.email && <a href={`mailto:${officer.email}`} className="hover:text-white transition-colors">{officer.email}</a>}
                  {officer.phone && <span>{officer.phone}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    )}

    {/* Vision & Mission */}
    {(website.vision_statement || website.mission_statement) && (
      <section className="py-24 border-t border-white/10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {website.vision_statement && (
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-8" style={{ background: accentColor }} />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Our Vision</span>
                </div>
                <p className="text-lg text-gray-300 leading-relaxed">{website.vision_statement}</p>
              </motion.div>
            )}
            {website.mission_statement && (
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-8" style={{ background: brandColor }} />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brandColor }}>Our Mission</span>
                </div>
                <p className="text-lg text-gray-300 leading-relaxed">{website.mission_statement}</p>
              </motion.div>
            )}
          </div>
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

        {/* Categories */}
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
                {/* Image placeholder */}
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
