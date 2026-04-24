import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Scissors, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Star, ShoppingBag, Tag, Sparkles, ExternalLink, Home
} from "lucide-react";

interface TailorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  specialty: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string | null;
}

interface WebsiteData {
  brand_color: string;
  accent_color: string;
  font_heading?: string | null;
  font_body?: string | null;
  color_palette?: Record<string, string> | null;
  instagram_url?: string | null;
}

const TikTokIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.8.1V9.01a6.37 6.37 0 0 0-.8-.05 6.34 6.34 0 0 0-6.34 6.34A6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V9.06a8.16 8.16 0 0 0 4.77 1.52V7.15a4.82 4.82 0 0 1-1.01-.46z" />
  </svg>
);

const OrgTailorPage = () => {
  const { slug, tailorId } = useParams<{ slug: string; tailorId: string }>();
  
  const [org, setOrg] = useState<OrgData | null>(null);
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [tailor, setTailor] = useState<TailorProfile | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const load = async () => {
      if (!slug || !tailorId) return;

      const { data: orgData } = await (supabase
        .from("organizations_public" as any)
        .select("id, name, slug, logo_url, currency")
        .eq("slug", slug)
        .single() as any);

      if (!orgData) { setLoading(false); return; }
      setOrg(orgData as any);

      const [websiteRes, tailorRes, itemsRes] = await Promise.all([
        supabase.from("org_websites").select("brand_color, accent_color, font_heading, font_body, color_palette, instagram_url").eq("org_id", (orgData as any).id).single(),
        supabase.from("profiles").select("id, display_name, bio, specialty, instagram_url, facebook_url, twitter_url, tiktok_url, youtube_url, linkedin_url, portfolio_url").eq("id", tailorId).single(),
        supabase.from("tailor_catalogue_items").select("*").eq("tailor_id", tailorId).eq("is_published", true).order("created_at", { ascending: false }),
      ]);

      if (websiteRes.data) setWebsite(websiteRes.data as unknown as WebsiteData);
      if (tailorRes.data) setTailor(tailorRes.data as TailorProfile);
      setItems(itemsRes.data || []);
      setLoading(false);
    };
    load();
  }, [slug, tailorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!org || !tailor) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
        <Scissors size={48} className="text-purple-400 opacity-50" />
        <h1 className="text-2xl font-bold">Tailor not found</h1>
        <Link to={`/site/${slug}`} className="text-purple-400 hover:underline text-sm">← Back to {org?.name || "Website"}</Link>
      </div>
    );
  }

  const brandColor = website?.brand_color || "#8B5CF6";
  const accentColor = website?.accent_color || "#D4AF37";
  const fontHeading = website?.font_heading || "Inter";
  const fontBody = website?.font_body || "Inter";
  const palette = website?.color_palette || {};
  const bgColor = palette.background || "#0d0d0d";
  const surfaceColor = palette.surface || "#1a1a1a";
  const currency = org.currency || "NGN";

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

  const categories = ["All", ...Array.from(new Set(items.map(i => i.category || "General").filter(Boolean)))];
  const filtered = selectedCategory === "All" ? items : items.filter(i => (i.category || "General") === selectedCategory);

  const socialLinks = [
    { url: tailor.instagram_url, icon: Instagram, label: "Instagram" },
    { url: tailor.facebook_url, icon: Facebook, label: "Facebook" },
    { url: tailor.twitter_url, icon: Twitter, label: "X" },
    { url: tailor.tiktok_url, icon: TikTokIcon, label: "TikTok" },
    { url: tailor.youtube_url, icon: Youtube, label: "YouTube" },
    { url: tailor.linkedin_url, icon: Linkedin, label: "LinkedIn" },
  ].filter(s => s.url);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: bgColor, fontFamily: fontBody }}>
      {/* Nav — matches org website */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <Link to={`/site/${slug}`} className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-full object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                <Scissors size={14} className="text-white" />
              </div>
            )}
            <span className="font-bold text-sm tracking-wide" style={{ color: accentColor }}>{org.name}</span>
          </Link>
          <Link
            to={`/site/${slug}`}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Home size={14} /> Back to Site
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16">
        <div className="relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 50%, ${brandColor}18 0%, transparent 60%)` }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 30%, ${accentColor}10 0%, transparent 50%)` }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="tailor-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill={accentColor} />
                  <line x1="0" y1="20" x2="40" y2="20" stroke={brandColor} strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tailor-pattern)" />
            </svg>
          </div>

          <div className="relative container mx-auto px-4 lg:px-8 py-20 md:py-28">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row items-start gap-8"
            >
              {/* Tailor avatar */}
              <div className="relative">
                <div
                  className="w-28 h-28 md:w-36 md:h-36 rounded-2xl flex items-center justify-center overflow-hidden border-2"
                  style={{ borderColor: `${accentColor}40`, background: `${brandColor}15` }}
                >
                  <Scissors size={48} style={{ color: brandColor }} className="opacity-60" />
                </div>
                <div
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: accentColor }}
                >
                  <Star size={14} className="text-black" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px w-8" style={{ background: accentColor }} />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                    {tailor.specialty || "Master Tailor"}
                  </span>
                </div>
                <h1
                  className="font-bold text-4xl md:text-5xl leading-tight mb-4"
                  style={{ fontFamily: fontHeading }}
                >
                  {tailor.display_name || "Tailor"}
                </h1>
                {tailor.bio && (
                  <p className="text-gray-400 text-lg leading-relaxed max-w-xl mb-6">{tailor.bio}</p>
                )}

                {/* Social links */}
                {socialLinks.length > 0 && (
                  <div className="flex gap-3 mb-6">
                    {socialLinks.map(s => (
                      <a
                        key={s.label}
                        href={s.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors hover:scale-110"
                        style={{ background: `${brandColor}10` }}
                      >
                        <s.icon size={16} />
                      </a>
                    ))}
                    {tailor.portfolio_url && (
                      <a
                        href={tailor.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors"
                        style={{ background: `${brandColor}10` }}
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag size={14} style={{ color: accentColor }} />
                    <strong className="text-white">{items.length}</strong> pieces
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Tag size={14} style={{ color: accentColor }} />
                    <strong className="text-white">{categories.length - 1}</strong> categories
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <section className="border-t border-white/10 py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-bold text-3xl mb-3" style={{ fontFamily: fontHeading }}>Portfolio & Catalogue</h2>
            <p className="text-gray-400 max-w-md mx-auto">Browse {tailor.display_name}'s collection — every piece is available as a bespoke commission.</p>
          </motion.div>

          {/* Category filters */}
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat ? "text-white" : "border border-white/20 text-gray-400 hover:border-white/40"
                  }`}
                  style={selectedCategory === cat ? { background: brandColor } : {}}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
              <p>No pieces available yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/25 transition-all group"
                >
                  <div className="aspect-[3/4] bg-white/5 flex items-center justify-center relative overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <Scissors size={36} style={{ color: accentColor }} />
                        <span className="text-xs text-gray-500">{item.category || "Fashion"}</span>
                      </div>
                    )}
                    {item.category && (
                      <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-gray-300 backdrop-blur-sm">
                        {item.category}
                      </span>
                    )}
                    {item.tryon_enabled && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-500/80 text-white backdrop-blur-sm flex items-center gap-1">
                        <Sparkles size={10} /> Try-On
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-2" style={{ fontFamily: fontHeading }}>{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-400">{tag}</span>
                        ))}
                      </div>
                    )}
                    {item.price && (
                      <span className="font-bold text-lg" style={{ color: accentColor }}>
                        {Number(item.price).toLocaleString()} <span className="text-sm font-normal text-gray-400">{item.currency || currency}</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8" style={{ background: surfaceColor }}>
        <div className="container mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>{tailor.display_name}</span>
            <span>·</span>
            <Link to={`/site/${slug}`} className="hover:text-white transition-colors">{org.name}</Link>
          </div>
          <span>Powered by <Link to="/" className="hover:text-white transition-colors">FYSORA FASHN (Fashion Stitches Africa)</Link></span>
        </div>
      </footer>
    </div>
  );
};

export default OrgTailorPage;
