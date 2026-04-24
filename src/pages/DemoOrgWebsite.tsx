import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram, MessageCircle, Phone, Mail, MapPin, Scissors, Calendar, BookOpen,
  Home, Menu, X, Sparkles, Lock, Facebook, Twitter, Linkedin, Youtube, Users, Download,
  PhoneCall, MessageSquare, Send, Map, ChevronUp, Info, Globe, Star
} from "lucide-react";

// ─── Demo Data ───────────────────────────────────────────────────────────────
const DEMO_ORG = {
  name: "Adire Couture Lagos",
  slug: "adire-couture",
  description: "Premium bespoke African fashion house specialising in Adire, Aso-Oke, and contemporary West African designs.",
  logo_url: null,
  email: "hello@adirecouture.ng",
  phone: "+234 801 234 5678",
  address: "12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria",
  country: "NG",
  currency: "NGN",
};

const DEMO_WEBSITE = {
  tagline: "Where Heritage Meets High Fashion",
  hero_description: "We craft bespoke garments that celebrate African heritage with modern sophistication. Every stitch tells a story of culture, elegance, and individuality.",
  brand_color: "#8B5CF6",
  accent_color: "#D4AF37",
  vision_statement: "To become Africa's leading bespoke fashion house, preserving traditional textile artistry while pushing the boundaries of contemporary design for a global audience.",
  mission_statement: "We empower individuals to express their cultural identity through exquisitely crafted garments, using ethically sourced African textiles and providing an unmatched tailoring experience from consultation to delivery.",
  instagram_url: "https://instagram.com",
  facebook_url: "https://facebook.com",
  whatsapp_number: "+2348012345678",
  twitter_url: "https://x.com",
  linkedin_url: "https://linkedin.com",
  youtube_url: "https://youtube.com",
  font_heading: "Poppins",
  font_body: "Inter",
};

const DEMO_OFFICERS = [
  { id: "1", full_name: "Adesola Okonkwo", title: "Creative Director & Founder", bio: "Award-winning designer with 15 years of experience blending traditional African motifs with contemporary silhouettes.", photo_url: null },
  { id: "2", full_name: "Chidinma Eze", title: "Head of Tailoring", bio: "Master tailor trained in both Savile Row techniques and traditional Nigerian garment construction.", photo_url: null },
  { id: "3", full_name: "Babajide Adeyemi", title: "Operations Manager", bio: "Ensures seamless delivery from order placement to doorstep, managing logistics across West Africa.", photo_url: null },
];

const DEMO_CATALOGUE = [
  { id: "1", name: "Royal Agbada Set", description: "Hand-embroidered three-piece agbada set in premium guinea brocade with gold thread detailing.", category: "Men's Traditional", price: 185000, currency: "NGN", tags: ["Agbada", "Embroidered", "Premium"], image_url: null },
  { id: "2", name: "Adire Maxi Dress", description: "Contemporary maxi dress in hand-dyed indigo Adire fabric with modern cut and traditional patterns.", category: "Women's Contemporary", price: 95000, currency: "NGN", tags: ["Adire", "Indigo", "Maxi"], image_url: null },
  { id: "3", name: "Aso-Oke Bridal Collection", description: "Full bridal ensemble in hand-woven Aso-Oke with intricate beadwork and custom colour matching.", category: "Bridal", price: 450000, currency: "NGN", tags: ["Bridal", "Aso-Oke", "Beadwork"], image_url: null },
  { id: "4", name: "Ankara Power Suit", description: "Tailored two-piece suit in vibrant Ankara print, perfect for the modern African professional.", category: "Women's Contemporary", price: 120000, currency: "NGN", tags: ["Ankara", "Business", "Tailored"], image_url: null },
  { id: "5", name: "Senator Kaftan", description: "Elegant senator-style kaftan in soft cashmere blend with subtle embroidery on collar and cuffs.", category: "Men's Traditional", price: 75000, currency: "NGN", tags: ["Senator", "Kaftan", "Casual"], image_url: null },
  { id: "6", name: "Kente Clutch & Headwrap Set", description: "Matching accessories set featuring authentic Ghanaian Kente cloth, handcrafted clutch bag and gele headwrap.", category: "Accessories", price: 45000, currency: "NGN", tags: ["Kente", "Accessories", "Handmade"], image_url: null },
];

const DEMO_TAILORS = [
  { id: "t1", display_name: "Emeka Nwosu", specialty: "Agbada & Kaftan Specialist", bio: "10 years mastering the art of flowing West African robes with precision hand-embroidery." },
  { id: "t2", display_name: "Folake Akinwale", specialty: "Bridal & Aso-Oke Expert", bio: "Specialist in traditional bridal wear, blending heritage weaving with modern bridal trends." },
  { id: "t3", display_name: "Ibrahim Musa", specialty: "Contemporary Menswear", bio: "Fusion designer creating sharp modern cuts with traditional African fabrics and techniques." },
];

// ─── Floating CTA ────────────────────────────────────────────────────────────
const FloatingCTA = ({ brandColor }: { brandColor: string }) => {
  const [expanded, setExpanded] = useState(false);
  const actions = [
    { icon: PhoneCall, label: "VoIP Call", color: "#22c55e" },
    { icon: Mail, label: "Email", color: "#3b82f6" },
    { icon: MessageSquare, label: "SMS", color: "#f59e0b" },
    { icon: MessageCircle, label: "WhatsApp", color: "#25d366" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {expanded && actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <span className="hidden sm:block px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-black/80 backdrop-blur-sm shadow-lg">
              {action.label}
            </span>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform" style={{ background: action.color }}>
              <action.icon size={20} className="text-white" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button onClick={() => setExpanded(!expanded)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all" style={{ background: brandColor }}>
        {expanded ? <X size={22} className="text-white" /> : <Send size={20} className="text-white" />}
      </button>
    </div>
  );
};

// ─── Newsletter ──────────────────────────────────────────────────────────────
const NewsletterSignup = ({ brandColor }: { brandColor: string }) => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  if (subscribed) return <p className="text-sm text-green-400 flex items-center gap-2"><Sparkles size={14} /> Thanks for subscribing!</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (email) setSubscribed(true); }} className="flex gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30" />
      <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: brandColor }}>Subscribe</button>
    </form>
  );
};

// ─── Main Demo Component ─────────────────────────────────────────────────────
const DemoOrgWebsite = () => {
  const [activePage, setActivePage] = useState<"home" | "about" | "catalogue" | "tailors">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandColor = DEMO_WEBSITE.brand_color;
  const accentColor = DEMO_WEBSITE.accent_color;
  const fontHeading = DEMO_WEBSITE.font_heading;

  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "about" as const, label: "About Us", icon: Info },
    { id: "catalogue" as const, label: "Catalogue", icon: BookOpen },
    { id: "tailors" as const, label: "Our Tailors", icon: Users },
  ];

  const socialLinks = [
    { icon: Instagram, label: "Instagram" },
    { icon: Facebook, label: "Facebook" },
    { icon: MessageCircle, label: "WhatsApp" },
    { icon: Twitter, label: "X" },
    { icon: Linkedin, label: "LinkedIn" },
    { icon: Youtube, label: "YouTube" },
  ];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#0d0d0d", fontFamily: "Inter, sans-serif" }}>
      {/* ─── Demo Banner ─── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-yellow-500/90 text-black text-center py-1.5 text-xs font-bold tracking-wide">
        ⚡ DEMO PREVIEW — This is a sample of how an organization app looks on FYSORA FASHN (Fashion Stitches Africa)
      </div>

      {/* ─── Header ─── */}
      <nav className="fixed top-7 left-0 right-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/10">
        <div className="text-center py-1.5 text-[11px] font-medium tracking-wide" style={{ background: `${brandColor}15`, color: accentColor }}>
          ✨ Powered by FYSORA FASHN (Fashion Stitches Africa) — <Link to="/install" className="underline hover:no-underline">Get the App</Link>
        </div>
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
              <Scissors size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wide" style={{ color: accentColor }}>{DEMO_ORG.name}</span>
              <span className="text-[10px] text-gray-500 hidden sm:block">{DEMO_WEBSITE.tagline}</span>
            </div>
          </div>

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

          <div className="hidden lg:flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-green-500/50 transition-colors cursor-pointer" title="Call">
              <PhoneCall size={14} className="text-green-400" />
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-blue-500/50 transition-colors cursor-pointer" title="Email">
              <Mail size={14} className="text-blue-400" />
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-green-500/50 transition-colors cursor-pointer" title="WhatsApp">
              <MessageCircle size={14} className="text-green-400" />
            </div>
          </div>

          <button className="lg:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden bg-[#111] border-t border-white/10 overflow-hidden">
              <div className="px-4 py-4 flex flex-col gap-4">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); window.scrollTo(0, 0); }} className="text-left text-sm font-medium text-gray-300 hover:text-white flex items-center gap-3">
                    <item.icon size={16} style={{ color: accentColor }} />
                    {item.label}
                  </button>
                ))}
                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-green-400 cursor-pointer"><PhoneCall size={14} /> Call</div>
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-blue-400 cursor-pointer"><Mail size={14} /> Email</div>
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-green-400 cursor-pointer"><MessageCircle size={14} /> WhatsApp</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="pt-[calc(4rem+3.5rem)]">
        {activePage === "home" && <DemoHomePage brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} onNavigate={setActivePage} />}
        {activePage === "about" && <DemoAboutPage brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} />}
        {activePage === "catalogue" && <DemoCataloguePage brandColor={brandColor} accentColor={accentColor} />}
        {activePage === "tailors" && <DemoTailorsPage brandColor={brandColor} accentColor={accentColor} fontHeading={fontHeading} />}
      </div>

      <FloatingCTA brandColor={brandColor} />

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/10 pt-16 pb-8 mt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                  <Scissors size={12} className="text-white" />
                </div>
                <span className="font-bold text-lg" style={{ color: accentColor }}>{DEMO_ORG.name}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{DEMO_WEBSITE.tagline}</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DEMO_ORG.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-sm text-gray-300 hover:text-white hover:border-white/30 transition-all bg-white/5">
                <Map size={16} className="text-red-400" />
                View on Google Maps
              </a>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Sitemap</h4>
              <div className="flex flex-col gap-2.5">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => { setActivePage(item.id); window.scrollTo(0, 0); }} className="text-left text-gray-300 hover:text-white text-sm transition-colors flex items-center gap-2">
                    <item.icon size={13} style={{ color: accentColor }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Contact</h4>
              <div className="flex flex-col gap-2.5 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-2"><Phone size={14} /> {DEMO_ORG.phone}</span>
                <span className="flex items-center gap-2"><Mail size={14} /> {DEMO_ORG.email}</span>
                <span className="flex items-center gap-2"><MapPin size={14} /> {DEMO_ORG.address}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {socialLinks.map((s) => (
                  <div key={s.label} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer" title={s.label}>
                    <s.icon size={16} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Stay Updated</h4>
              <p className="text-sm text-gray-500 mb-3">Subscribe for latest styles, offers, and updates.</p>
              <NewsletterSignup brandColor={brandColor} />
              <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs text-gray-400 mb-2">Get the FYSORA FASHN (Fashion Stitches Africa) app</p>
                <Link to="/install" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: brandColor }}>
                  <Download size={14} /> Download App
                </Link>
                <p className="text-[10px] text-gray-600 mt-2">Register a free FSA account to access all features</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} {DEMO_ORG.name}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="hover:text-white transition-colors">Create FSA Account</Link>
              <span>·</span>
              <Link to="/" className="hover:text-white transition-colors">FYSORA FASHN (Fashion Stitches Africa)</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─── Home Page ───────────────────────────────────────────────────────────────
const DemoHomePage = ({ brandColor, accentColor, fontHeading, onNavigate }: { brandColor: string; accentColor: string; fontHeading: string; onNavigate: (p: any) => void }) => (
  <div>
    {/* Hero */}
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 50%, ${brandColor}22 0%, transparent 60%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 20%, ${accentColor}11 0%, transparent 50%)` }} />
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ankara-demo" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M0 30 Q15 0 30 30 Q45 60 60 30" stroke={accentColor} strokeWidth="1" fill="none" />
              <path d="M0 30 Q15 60 30 30 Q45 0 60 30" stroke={brandColor} strokeWidth="1" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ankara-demo)" />
        </svg>
      </div>

      <div className="relative container mx-auto px-4 lg:px-8 py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-12" style={{ background: accentColor }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Est. 2020</span>
          </div>
          <h1 className="font-bold text-5xl md:text-7xl leading-tight mb-6" style={{ fontFamily: fontHeading }}>{DEMO_ORG.name}</h1>
          <p className="text-xl md:text-2xl mb-4 font-light" style={{ color: accentColor }}>{DEMO_WEBSITE.tagline}</p>
          <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-xl">{DEMO_WEBSITE.hero_description}</p>
          <div className="flex flex-wrap gap-4 mb-6">
            <button className="px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-widest transition-all hover:scale-105" style={{ background: brandColor }}>Book Appointment</button>
            <button onClick={() => onNavigate("catalogue")} className="px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-widest border transition-all hover:bg-white/10" style={{ borderColor: accentColor, color: accentColor }}>View Catalogue</button>
          </div>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DEMO_ORG.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-sm text-gray-300 hover:text-white hover:border-white/30 transition-all bg-white/5">
            <Map size={16} className="text-red-400" /> View on Google Maps
          </a>
        </motion.div>
      </div>
    </section>

    {/* Services */}
    <section className="py-24 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-bold text-3xl md:text-4xl mb-4">What We Offer</h2>
          <p className="text-gray-400 max-w-xl mx-auto">From concept to creation — we handle every aspect of your garment journey.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Scissors, title: "Bespoke Tailoring", desc: "Every piece is crafted to your exact measurements. No two garments are the same." },
            { icon: Calendar, title: "Consultations", desc: "Book a session with our expert tailors to discuss styles, fabrics, and timelines." },
            { icon: BookOpen, title: "African Textiles", desc: "Premium Ankara, Adire, Kente, and Aso-Oke sourced from across the continent." },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
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

    {/* Smart Fashion Tools */}
    <section className="py-24 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles size={20} className="text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">Powered by FYSORA FASHN (Fashion Stitches Africa)</span>
          </div>
          <h2 className="font-bold text-3xl md:text-4xl mb-4">Smart Fashion Tools</h2>
          <p className="text-gray-400 max-w-xl mx-auto">AI-powered measurements, virtual try-on, and seamless ordering.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Sparkles, title: "AI Body Measurements", desc: "Get precise measurements using your phone camera — powered by AI." },
            { icon: Scissors, title: "Virtual Try-On", desc: "See how garments look on you before ordering — try styles virtually." },
            { icon: Calendar, title: "Video Consultation", desc: "Book a live video session with a tailor for real-time style advice and fittings." },
            { icon: BookOpen, title: "Place an Order", desc: "Commission bespoke garments directly with tracked delivery and payments." },
          ].map((feat, i) => (
            <motion.div key={feat.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer group">
              <div className="absolute top-4 right-4"><Lock size={14} className="text-purple-400/60" /></div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-purple-500/20">
                <feat.icon size={24} className="text-purple-400" />
              </div>
              <h3 className="font-bold text-xl mb-3">{feat.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{feat.desc}</p>
              <span className="text-sm font-medium text-purple-400 group-hover:underline">Sign in to access →</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Tailors preview */}
    <section className="py-24 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-bold text-3xl md:text-4xl mb-4" style={{ fontFamily: fontHeading }}>Our Tailors</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Meet the skilled artisans who bring your visions to life.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {DEMO_TAILORS.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${brandColor}20` }}>
                  <Scissors size={24} style={{ color: brandColor }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t.display_name}</h3>
                  <span className="text-xs" style={{ color: accentColor }}>{t.specialty}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{t.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="rounded-3xl p-12 text-center border border-white/10 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandColor}22, ${accentColor}11)` }}>
          <h2 className="font-bold text-3xl md:text-4xl mb-4">Ready to Start Your Order?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">Book a free consultation and let us bring your vision to life with Africa's finest fabrics.</p>
          <button className="px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-widest transition-all hover:scale-105" style={{ background: brandColor }}>Book Now — It's Free</button>
        </div>
      </div>
    </section>
  </div>
);

// ─── About Page ──────────────────────────────────────────────────────────────
const DemoAboutPage = ({ brandColor, accentColor, fontHeading }: { brandColor: string; accentColor: string; fontHeading: string }) => (
  <div className="container mx-auto px-4 lg:px-8 py-16">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-16 text-center">
        <h1 className="font-bold text-4xl md:text-5xl mb-4" style={{ fontFamily: fontHeading }}>About {DEMO_ORG.name}</h1>
        <p className="text-gray-400 max-w-xl mx-auto">{DEMO_ORG.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8" style={{ background: accentColor }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Our Vision</span>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">{DEMO_WEBSITE.vision_statement}</p>
        </div>
        <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8" style={{ background: brandColor }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brandColor }}>Our Mission</span>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">{DEMO_WEBSITE.mission_statement}</p>
        </div>
      </div>

      <div className="text-center mb-12">
        <h2 className="font-bold text-3xl mb-4" style={{ fontFamily: fontHeading }}>Meet Our Team</h2>
        <p className="text-gray-400 max-w-xl mx-auto">The people behind the craft.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {DEMO_OFFICERS.map((officer, i) => (
          <motion.div key={officer.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-white/10 mb-5">
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <span className="text-3xl font-bold text-gray-500">{officer.full_name.split(" ").map(n => n[0]).join("")}</span>
              </div>
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ fontFamily: fontHeading }}>{officer.full_name}</h3>
            <p className="text-sm mb-2" style={{ color: accentColor }}>{officer.title}</p>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">{officer.bio}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

// ─── Catalogue Page ──────────────────────────────────────────────────────────
const DemoCataloguePage = ({ brandColor, accentColor }: { brandColor: string; accentColor: string }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(DEMO_CATALOGUE.map(i => i.category)))];
  const filtered = selectedCategory === "All" ? DEMO_CATALOGUE : DEMO_CATALOGUE.filter(i => i.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 lg:px-8 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-12 text-center">
          <h1 className="font-bold text-4xl md:text-5xl mb-4">Our Catalogue</h1>
          <p className="text-gray-400 max-w-lg mx-auto">Explore our collections — every piece is available as a bespoke commission.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? "text-white" : "border border-white/20 text-gray-400 hover:border-white/40"}`} style={selectedCategory === cat ? { background: brandColor } : {}}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/25 transition-all group">
              <div className="h-56 bg-white/5 flex items-center justify-center relative">
                <div className="flex flex-col items-center gap-2 opacity-30">
                  <Scissors size={36} style={{ color: accentColor }} />
                  <span className="text-xs text-gray-500">{item.category}</span>
                </div>
                <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-gray-300 backdrop-blur-sm">{item.category}</span>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">{item.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.map(tag => <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-400">{tag}</span>)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xl" style={{ color: accentColor }}>
                    ₦{item.price.toLocaleString()} <span className="text-sm font-normal text-gray-400">{item.currency}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-purple-400"><Lock size={10} /> Try On</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Tailors Page ────────────────────────────────────────────────────────────
const DemoTailorsPage = ({ brandColor, accentColor, fontHeading }: { brandColor: string; accentColor: string; fontHeading: string }) => (
  <div className="container mx-auto px-4 lg:px-8 py-16">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-12 text-center">
        <h1 className="font-bold text-4xl md:text-5xl mb-4" style={{ fontFamily: fontHeading }}>Our Tailors</h1>
        <p className="text-gray-400 max-w-lg mx-auto">Discover the talented artisans behind our bespoke creations.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {DEMO_TAILORS.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/25 hover:bg-white/10 transition-all">
            <div className="h-32 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandColor}20, ${accentColor}10)` }}>
              <div className="absolute bottom-0 left-6 translate-y-1/2">
                <div className="w-20 h-20 rounded-xl border-4 flex items-center justify-center" style={{ borderColor: `${brandColor}40`, background: `${brandColor}20` }}>
                  <Scissors size={32} style={{ color: brandColor }} className="opacity-60" />
                </div>
              </div>
            </div>
            <div className="p-6 pt-14">
              <h3 className="font-bold text-xl mb-1" style={{ fontFamily: fontHeading }}>{t.display_name}</h3>
              <span className="text-xs font-medium" style={{ color: accentColor }}>{t.specialty}</span>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">{t.bio}</p>
              <span className="inline-block mt-4 text-sm font-medium" style={{ color: accentColor }}>View Portfolio →</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

export default DemoOrgWebsite;
