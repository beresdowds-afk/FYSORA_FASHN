import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Search, Building2, MapPin, Globe, ArrowLeft, Phone, Palette,
  Star, ChevronRight, Loader2, ShoppingBag, Filter, Sparkles,
  Video, Ruler, CreditCard, Lock, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { joinOrganization } from "@/lib/joinOrganization";
import { resolvePublicSiteUrl, isExternalSiteUrl } from "@/lib/publicSiteUrl";
import { reportSchemaError } from "@/lib/schemaErrorReporter";

interface OrgCard {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  currency: string | null;
  phone: string | null;
  logo_url: string | null;
  specialties: string[] | null;
  created_at: string;
  catalogue_count?: number;
  categories?: string[];
  public_website_url?: string | null;
}

const REGIONS = ["All Regions", "West Africa", "East Africa", "North Africa", "Southern Africa", "Central Africa", "International"];

const PLATFORM_FEATURES = [
  { key: "ai_measurements", name: "AI Body Measurements", desc: "Video-based AI measurements for precise tailoring", icon: Ruler, price: 10, billing: "per_session" },
  { key: "virtual_tryon", name: "Virtual Try-On", desc: "See garments on your body using AI", icon: Sparkles, price: 5, billing: "per_use" },
  { key: "video_consultation", name: "Video Consultation", desc: "Live video sessions with tailors", icon: Video, price: 15, billing: "per_session" },
  { key: "priority_orders", name: "Priority Orders", desc: "Get your orders fast-tracked with priority handling", icon: Star, price: 25, billing: "one_time" },
  { key: "premium_catalogue", name: "Premium Catalogue Access", desc: "Access exclusive premium garment collections", icon: ShoppingBag, price: 10, billing: "monthly" },
];

const BrowseOrganizations = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [myOrgIds, setMyOrgIds] = useState<Set<string>>(new Set());
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [requestingFeature, setRequestingFeature] = useState<string | null>(null);
  const [myFeatureRequests, setMyFeatureRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrgs = async () => {
      // Use public view for authenticated users, summary view for unauthenticated
      const { data } = user
        ? await (supabase
            .from("organizations_public" as any)
            .select("id, name, slug, country, region, currency, phone, logo_url, specialties, created_at")
            .eq("is_active", true)
            .order("name") as any)
        : await (supabase
            .from("organizations_summary" as any)
            .select("id, name, slug, logo_url, country, region")
            .order("name") as any);
      const orgsData = (data || []) as OrgCard[];
      
      const orgIds = orgsData.map((o: any) => o.id);
      let catalogueCounts: Record<string, number> = {};
      let categoryMap: Record<string, Set<string>> = {};
      let publicUrlMap: Record<string, string | null> = {};
      if (orgIds.length > 0) {
        const { data: cats } = await supabase
          .from("garment_catalog")
          .select("org_id, category")
          .eq("is_published", true)
          .in("org_id", orgIds);
        (cats || []).forEach(c => {
          catalogueCounts[c.org_id] = (catalogueCounts[c.org_id] || 0) + 1;
          if (!categoryMap[c.org_id]) categoryMap[c.org_id] = new Set();
          if (c.category) categoryMap[c.org_id].add(c.category);
        });
        const sitesRes = await (supabase
          .from("org_websites_public" as any)
          .select("org_id, public_website_url")
          .in("org_id", orgIds) as any);
        if (sitesRes.error) reportSchemaError(sitesRes.error, { table: "org_websites_public", route: "/browse" });
        (sitesRes.data || []).forEach((s: any) => { publicUrlMap[s.org_id] = s.public_website_url || null; });
      }

      setOrgs(orgsData.map((o: any) => ({
        ...o,
        catalogue_count: catalogueCounts[o.id] || 0,
        categories: categoryMap[o.id] ? [...categoryMap[o.id]] : [],
        public_website_url: publicUrlMap[o.id] || null,
      })));
      setLoading(false);
    };

    const fetchMyData = async () => {
      if (!user) return;
      const [{ data: memberData }, { data: featureData }] = await Promise.all([
        supabase.from("org_members").select("org_id").eq("user_id", user.id).eq("is_active", true),
        supabase.from("feature_access_requests").select("*").eq("user_id", user.id),
      ]);
      setMyOrgIds(new Set((memberData || []).map(m => m.org_id)));
      setMyFeatureRequests(featureData || []);
    };

    fetchOrgs();
    fetchMyData();
  }, [user]);

  const handleJoin = async (org: OrgCard) => {
    if (!user) { navigate("/auth?portal=1"); return; }
    setJoiningId(org.id);
    const result = await joinOrganization(org.id, "customer");
    if (!result.ok) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else if (result.paymentRequired && result.checkoutUrl) {
      toast({ title: "Redirecting to payment", description: `Complete the registration fee for ${org.name}.` });
      window.location.href = result.checkoutUrl;
    } else {
      toast({ title: "Joined!", description: `You've been added to ${org.name}.` });
      setMyOrgIds(prev => new Set([...prev, org.id]));
    }
    setJoiningId(null);
  };

  const handleRequestFeature = async (feature: typeof PLATFORM_FEATURES[0]) => {
    if (!user) { navigate("/auth?portal=1"); return; }
    setRequestingFeature(feature.key);
    const { error } = await supabase.from("feature_access_requests").insert({
      user_id: user.id,
      feature_key: feature.key,
      feature_name: feature.name,
      description: feature.desc,
      billing_type: feature.billing,
      price_amount: feature.price,
      price_currency: "USD",
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Request submitted!", description: `Your request for ${feature.name} has been sent.` });
      setMyFeatureRequests(prev => [...prev, { feature_key: feature.key, status: "pending" }]);
    }
    setRequestingFeature(null);
  };

  // Collect all unique categories and regions
  const allCategories = ["all", ...new Set(orgs.flatMap(o => o.categories || []))];
  const allRegions = ["All Regions", ...new Set(orgs.map(o => o.region || o.country || "Other").filter(Boolean))];

  const filtered = orgs.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.country || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.specialties || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchRegion = selectedRegion === "All Regions" || 
      o.region === selectedRegion || o.country === selectedRegion;
    const matchCategory = selectedCategory === "all" || 
      (o.categories || []).includes(selectedCategory);
    return matchSearch && matchRegion && matchCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <span className="font-heading font-bold text-sm">Browse Fashion Houses</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFeatureDialog(true)} className="gap-1.5">
              <Sparkles size={14} /> Premium Features
            </Button>
            {!user ? (
              <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/portal")}>My Portal</Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-6 max-w-5xl">
        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search fashion houses by name, country, or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Region filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Filter size={14} className="text-muted-foreground shrink-0 mt-1.5" />
            {allRegions.map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedRegion === region ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {allCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Palette size={14} className="text-muted-foreground shrink-0 mt-1.5" />
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} fashion house{filtered.length !== 1 ? "s" : ""} found
          {selectedRegion !== "All Regions" && ` in ${selectedRegion}`}
          {selectedCategory !== "all" && ` with ${selectedCategory} products`}
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No fashion houses found matching your filters.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSelectedRegion("All Regions"); setSelectedCategory("all"); setSearch(""); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((org, i) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 hover:shadow-gold transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 overflow-hidden">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <span className="font-heading font-bold text-primary-foreground text-lg">{org.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-base truncate">{org.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      {org.country && (
                        <span className="flex items-center gap-1"><MapPin size={10} /> {org.country}</span>
                      )}
                      {org.region && org.region !== org.country && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{org.region}</Badge>
                      )}
                      {org.currency && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{org.currency}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specialties & categories */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(org.specialties || []).slice(0, 3).map(s => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                  {(org.categories || []).slice(0, 2).map(c => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {(org.catalogue_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Palette size={10} className="text-primary" /> {org.catalogue_count} items
                    </span>
                  )}
                  {(() => {
                    const url = resolvePublicSiteUrl(org.slug, org.public_website_url);
                    const ext = isExternalSiteUrl(url);
                    return ext ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Globe size={10} /> Visit Site
                      </a>
                    ) : (
                      <button onClick={() => navigate(url)} className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Globe size={10} /> Visit Site
                      </button>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  {myOrgIds.has(org.id) ? (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/portal")}>
                      <ShoppingBag size={14} className="mr-1" /> Go to Portal
                    </Button>
                  ) : (
                    <Button variant="hero" size="sm" className="flex-1" onClick={() => handleJoin(org)} disabled={joiningId === org.id}>
                      {joiningId === org.id ? <><Loader2 size={14} className="mr-1 animate-spin" /> Joining...</> : "Join as Customer"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => navigate(`/catalogue/${org.id}`)}>
                    <Palette size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Features Dialog */}
      <Dialog open={showFeatureDialog} onOpenChange={setShowFeatureDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" /> Premium Platform Features
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Request access to premium features. Once approved, you'll receive a payment link.
          </p>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {PLATFORM_FEATURES.map(feature => {
              const existing = myFeatureRequests.find(r => r.feature_key === feature.key);
              const Icon = feature.icon;
              return (
                <div key={feature.key} className="rounded-xl border border-border p-4 hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{feature.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          ${feature.price} / {feature.billing.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                      <div className="mt-2">
                        {existing ? (
                          <Badge className={
                            existing.status === "approved" ? "bg-secondary/10 text-secondary" :
                            existing.status === "rejected" ? "bg-destructive/10 text-destructive" :
                            "bg-primary/10 text-primary"
                          }>
                            {existing.status === "approved" ? <><CheckCircle2 size={10} className="mr-1" /> Approved</> :
                             existing.status === "rejected" ? "Rejected" :
                             "Pending Review"}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestFeature(feature)}
                            disabled={requestingFeature === feature.key || !user}
                            className="gap-1"
                          >
                            {requestingFeature === feature.key ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CreditCard size={12} />
                            )}
                            {!user ? "Sign in to request" : "Request Access"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowseOrganizations;
