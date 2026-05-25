import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import IdentityVerificationGate from "@/components/shared/IdentityVerificationGate";
import FreeTourConsentDialog from "@/components/shared/FreeTourConsentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, ShoppingBag, Tag, Building2, LogIn, Eye, Lock,
  Info, Check, X, ShieldCheck, Star, Sparkles, UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Tour bubble removed — platform-catalogue and platform-tour are kept independent
import { MOCK_CATALOGUE_ITEMS } from "@/data/mockCatalogueItems";
import { track } from "@/lib/analytics";
import { resolveHomeRoute } from "@/lib/roleHome";

const MAX_FREE_TOURS = 2;
const CANONICAL_URL = "https://fs-africa.org.ng/";
const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/90707f6a-3ae7-447b-850c-88c0da0c0a3d/id-preview-f417a96b--0a83ebdb-a98b-48d3-aab1-d2e653ee34e4.lovable.app-1771102457681.png";
const SEO_TITLE = "Shop African Fashion — Platform Catalogue | FYSORA FASHN";
const SEO_DESCRIPTION =
  "Browse curated African fashion: bespoke garments, designers, and tailors. Search, filter and discover products from verified fashion houses across Africa.";

interface CatalogueItem {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  tags: string[] | null;
  is_available: boolean;
  org_name?: string;
}

const PlatformCataloguePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [featured, setFeatured] = useState<CatalogueItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // Free tour state
  const [toursUsed, setToursUsed] = useState(0);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tourActive, setTourActive] = useState(false); // true when user accepted consent for this session
  // Guest interaction-blocked state: drives a clear in-page message
  const [guestBlockedAction, setGuestBlockedAction] = useState<string | null>(null);

  // Signed-in role-based redirect: privileged operational roles belong on their
  // own portal, not browsing the marketplace. Customers / super_admin /
  // super_assistant stay here (catalogue is their home / oversight surface).
  useEffect(() => {
    if (authLoading || roleLoading || !user || !userRole) return;
    const stayRoles = ["customer", "super_admin", "super_assistant"];
    if (stayRoles.includes(userRole)) return;
    resolveHomeRoute(user.id).then((home) => {
      if (home && home !== "/") navigate(home, { replace: true });
    });
  }, [authLoading, roleLoading, user, userRole, navigate]);

  // Fire a one-shot view event for guest CTA exposure.
  useEffect(() => {
    if (authLoading || user) return;
    track("guest_cta_view", { path: "/" });
  }, [authLoading, user]);

  // Determine user role + profile info
  useEffect(() => {
    if (!user) { setRoleLoading(false); setProfileLoading(false); return; }
    const fetchAll = async () => {
      const [roleRes, profileRes, subRes] = await Promise.all([
        supabase.from("user_roles" as any).select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("free_tours_used, identity_verified").eq("id", user.id).single(),
        supabase.from("customer_subscriptions" as any).select("id").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);
      setUserRole((roleRes.data as any)?.role || "customer");
      setToursUsed((profileRes.data as any)?.free_tours_used || 0);
      setIsVerified(!!(profileRes.data as any)?.identity_verified);
      setHasSubscription(!!subRes.data);
      setRoleLoading(false);
      setProfileLoading(false);
    };
    fetchAll();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("org_catalogue_items")
        .select("*, organizations(name)")
        .eq("is_available", true)
        .order("name");

      const live = (data || []).map((item: any) => ({
        ...item,
        org_name: item.organizations?.name || "Unknown",
      }));
      // Temporarily fall back to mock products when live catalogue is empty,
      // so first-time visitors land on a populated marketplace.
      setItems(live.length > 0 ? live : (MOCK_CATALOGUE_ITEMS as unknown as CatalogueItem[]));
      setLoading(false);
    };
    load();
  }, []);

  // Featured products (weekly promotion slots) — surfaced at the top of the catalogue.
  useEffect(() => {
    const loadFeatured = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("featured_product_slots" as any)
        .select("catalogue_item_id, week_end, org_catalogue_items!inner(*, organizations(name))")
        .eq("is_active", true)
        .gte("week_end", today)
        .order("created_at", { ascending: false })
        .limit(12);
      const mapped: CatalogueItem[] = (data || [])
        .map((row: any) => row.org_catalogue_items)
        .filter(Boolean)
        .map((it: any) => ({ ...it, org_name: it.organizations?.name || "Unknown" }));
      // De-duplicate by id
      const seen = new Set<string>();
      setFeatured(mapped.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))));
    };
    loadFeatured();
  }, []);

  const categories = ["all", ...new Set(items.map(i => i.category || "general"))];
  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.org_name || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "all" || (i.category || "general") === selectedCategory;
    return matchSearch && matchCat;
  });

  const featuredStrip = featured.length > 0 ? (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-primary" />
        <h3 className="font-heading font-bold text-sm">Featured this week</h3>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{featured.length}</Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {featured.map((it) => (
          <div key={`f-${it.id}`} className="snap-start shrink-0 w-40 rounded-xl bg-card border border-primary/30 overflow-hidden shadow-gold">
            <div className="aspect-[3/4] bg-muted relative">
              {it.image_url
                ? <img src={it.image_url} alt={it.name} loading="lazy" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={28} className="text-muted-foreground" /></div>}
              <Badge className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground"><Star size={8} className="mr-0.5" />Featured</Badge>
            </div>
            <div className="p-2">
              <p className="font-semibold text-xs truncate">{it.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{it.org_name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : null;

  // Catalogue load doesn't depend on auth — render shell ASAP.
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const promptAuth = () => {
    setGuestBlockedAction("open this product");
    track("guest_product_card_click", { category: selectedCategory, items_count: items.length });
    // Scroll the alert into view so the message is unmissable
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Unauthenticated visitors get a free, non-interactive preview of the catalogue.
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>{SEO_TITLE}</title>
          <meta name="description" content={SEO_DESCRIPTION} />
          <link rel="canonical" href={CANONICAL_URL} />
          <meta property="og:title" content={SEO_TITLE} />
          <meta property="og:description" content={SEO_DESCRIPTION} />
          <meta property="og:url" content={CANONICAL_URL} />
          <meta property="og:type" content="website" />
          <meta property="og:image" content={OG_IMAGE} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={SEO_TITLE} />
          <meta name="twitter:description" content={SEO_DESCRIPTION} />
          <meta name="twitter:image" content={OG_IMAGE} />
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "FYSORA FASHN (Fashion Stitches Africa)",
            url: CANONICAL_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${CANONICAL_URL}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          })}</script>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: filtered.slice(0, 10).map((it, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: it.name,
              image: it.image_url || undefined,
            })),
          })}</script>
        </Helmet>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />
        <header className="border-b border-border bg-card sticky top-0 z-30">
          <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-heading font-bold text-sm leading-tight">Platform Catalogue</h1>
                <p className="text-[10px] text-muted-foreground">{filtered.length} curated products</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                <Eye size={10} className="mr-1" /> Free Preview
              </Badge>
              <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                <LogIn size={14} className="mr-1" /> Sign In
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 lg:px-8 py-4 max-w-6xl pb-36 sm:pb-28">
          {guestBlockedAction && (
            <Alert className="mb-4 border-primary/30 bg-primary/5">
              <Lock className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Sign in required to {guestBlockedAction}</AlertTitle>
              <AlertDescription className="text-xs">
                The platform catalogue is view-only for guests. Create a free account or sign in to open product
                details, contact fashion houses, save favourites, or place orders.
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="hero" onClick={() => { track("guest_signin_required_alert_cta"); navigate("/auth"); }}>
                    <LogIn size={12} className="mr-1" /> Sign in / Sign up
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setGuestBlockedAction(null)}>Dismiss</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {featuredStrip}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search products or fashion houses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products available yet.</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              onClickCapture={(e) => {
                // Any click on a product card triggers auth prompt
                e.preventDefault();
                e.stopPropagation();
                promptAuth();
              }}
            >
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); promptAuth(); } }}
                  className="rounded-xl bg-card border border-border overflow-hidden group cursor-pointer hover:border-primary/30 hover:shadow-gold transition-all duration-300 select-none"
                >
                  <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={32} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <Badge variant="secondary" className="text-[10px]">
                        <Lock size={10} className="mr-1" /> Sign in to view
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-heading font-semibold text-sm truncate">{item.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{item.org_name}</p>
                    {item.price != null && (
                      <p className="text-primary font-bold text-sm mt-1">
                        {item.currency || "USD"} {Number(item.price).toLocaleString()}
                      </p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {item.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Tag size={8} /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Floating guest CTA — replaces the old full-page Free Catalogue Preview */}
        <div
          className="fixed right-3 sm:right-6 z-30 max-w-[calc(100vw-1.5rem)] pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <Dialog onOpenChange={(open) => { if (open) track("guest_cta_dialog_open"); }}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 220, damping: 22 }}
              className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-primary/30 bg-card/95 backdrop-blur shadow-gold pl-3 pr-1.5 py-1.5"
            >
              <ShieldCheck size={14} className="text-primary shrink-0" />
              <span className="text-[11px] sm:text-xs text-muted-foreground hidden sm:inline">
                Guest preview
              </span>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" aria-label="What can I do as a guest?">
                  <Info size={12} className="sm:mr-1" /> <span className="hidden sm:inline">What can I do?</span>
                </Button>
              </DialogTrigger>
              <Button
                variant="hero"
                size="sm"
                className="h-7 rounded-full px-3 text-[11px]"
                onClick={() => { track("guest_cta_signin_click"); navigate("/auth"); }}
              >
                <UserPlus size={12} className="mr-1" /> Sign in
              </Button>
            </motion.div>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" /> Guest Access Policy
                </DialogTitle>
                <DialogDescription>
                  FYSORA FASHN (Fashion Stitches Africa) lets anyone preview the curated platform catalogue without creating an account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1 flex items-center gap-1.5"><Check size={14} className="text-secondary" /> Available without signing in</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                    <li>Read-only browsing of curated products</li>
                    <li>Searching, filtering, and viewing prices</li>
                    <li>Public-facing organization names &amp; tags</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1 flex items-center gap-1.5"><X size={14} className="text-destructive" /> Requires a free account</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                    <li>Opening product detail pages</li>
                    <li>Contacting an organization or designer</li>
                    <li>Bookings, measurements &amp; video calls</li>
                    <li>Placing orders and tracking shipments</li>
                  </ul>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                  Tapping any product card while in guest mode will redirect you to the sign-in page.
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="hero"
                  size="sm"
                  className="w-full"
                  onClick={() => { track("guest_cta_dialog_signin_click"); navigate("/auth"); }}
                >
                  <LogIn size={14} className="mr-1" /> Continue to Sign In
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Authenticated flow below — wait for role/profile to resolve
  if (roleLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPrivilegedRole = ["super_admin", "super_assistant", "org_admin", "manager", "tailor", "designer"].includes(userRole || "");
  const isCustomer = !isPrivilegedRole;
  const hasFullAccess = isPrivilegedRole || (hasSubscription && isVerified);

  // For customers: determine if they're on a free tour or need gating
  const isOnFreeTour = isCustomer && !hasFullAccess && tourActive;

  const catalogueContent = (readOnly: boolean) => (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <span className="font-heading font-bold text-sm">Platform Catalogue</span>
              <p className="text-[10px] text-muted-foreground">{filtered.length} products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {readOnly && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                <Eye size={10} className="mr-1" /> Read-Only Tour
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/browse")}>
              <Building2 size={14} className="mr-1" /> Browse Fashion Houses
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-6 max-w-6xl">
        {featuredStrip}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products or fashion houses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products available yet.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${readOnly ? "pointer-events-none select-none" : ""}`}>
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`rounded-xl bg-card border border-border overflow-hidden group transition-all duration-300 ${
                  readOnly ? "opacity-90" : "hover:border-primary/30 hover:shadow-gold"
                }`}
              >
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={32} className="text-muted-foreground" />
                    </div>
                  )}
                  {readOnly && (
                    <div className="absolute inset-0 bg-background/10 flex items-end justify-center pb-2">
                      <Badge variant="secondary" className="text-[9px] opacity-80">
                        <Eye size={8} className="mr-1" /> Preview Only
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-heading font-semibold text-sm truncate">{item.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{item.org_name}</p>
                  {item.price != null && (
                    <p className="text-primary font-bold text-sm mt-1">
                      {item.currency || "USD"} {Number(item.price).toLocaleString()}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 2).map((t: string) => (
                        <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Tag size={8} /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {readOnly && (
          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Enjoying the catalogue? Subscribe for <span className="font-semibold text-primary">$10/year</span> to unlock full access.
            </p>
            <Button size="sm" onClick={() => navigate("/portal")}>
              Subscribe & Verify Identity
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Privileged roles: full unrestricted access
  if (isPrivilegedRole) return catalogueContent(false);

  // Customers with subscription + verification: full access
  if (hasFullAccess) return catalogueContent(false);

  // Customers on an active free tour session: read-only view
  if (isOnFreeTour) return catalogueContent(true);

  // Customers who haven't started a tour or need consent: show consent/exhausted dialog
  return (
    <FreeTourConsentDialog
      toursUsed={toursUsed}
      maxTours={MAX_FREE_TOURS}
      onConsentGiven={() => {
        setToursUsed(prev => prev + 1);
        setTourActive(true);
      }}
      onSubscribe={() => navigate("/portal")}
    />
  );
};

export default PlatformCataloguePage;
