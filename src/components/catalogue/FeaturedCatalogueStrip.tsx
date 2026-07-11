import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Star, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface FeaturedItem {
  id: string;
  name: string;
  image_url: string | null;
  org_name: string;
  category?: string | null;
  source_type?: string | null;
  source_id?: string | null;
}

export default function FeaturedCatalogueStrip() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

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

      const mapped: FeaturedItem[] = (data || [])
        .map((row: any) => row.org_catalogue_items)
        .filter(Boolean)
        .map((it: any) => ({ ...it, org_name: it.organizations?.name || "Unknown" }));

      const seen = new Set<string>();
      let deduped = mapped.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));

      // Fallback: when there are no curated featured slots, surface the most
      // recent published catalogue items so the marquee + pull-down still
      // showcase products.
      if (deduped.length === 0) {
        const recentRes = await (supabase as any)
          .from("org_catalogue_items")
          .select("id, name, image_url, category, organizations(name)")
          .eq("is_available", true)
          .order("created_at", { ascending: false })
          .limit(12);
        if (recentRes.error) {
          const { reportSchemaError } = await import("@/lib/schemaErrorReporter");
          reportSchemaError(recentRes.error, { table: "org_catalogue_items", route: "/" });
        }
        deduped = (recentRes.data || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          image_url: it.image_url,
          category: it.category,
          org_name: it.organizations?.name || "Featured",
          source_type: null,
          source_id: null,
        }));
      }

      setItems(deduped);
      setLoading(false);
    };
    loadFeatured();
  }, []);

  if (loading) {
    return (
      <div className="bg-ebony/90 backdrop-blur-md border-b border-primary/10 h-10 flex items-center px-4 shrink-0">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return null;

  // Triple the items so the marquee always overflows the viewport — keeps
  // the infinite sideways scroll seamless even when only 1–2 items exist.
  const loop = [...items, ...items, ...items];
  const openSimilar = (it: FeaturedItem) => {
    const params = new URLSearchParams();
    if (it.source_type && it.source_id) {
      params.set("source_type", it.source_type);
      params.set("source_id", it.source_id);
    }
    params.set("focus", it.id);
    // Navigate directly to /platform-catalogue so the query params survive
    // (the `/` route redirects with <Navigate> which strips search params).
    navigate(`/platform-catalogue?${params.toString()}`);
  };

  return (
    <div className="relative shrink-0">
      <motion.div
        layout
        initial={false}
        animate={{ height: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="bg-ebony/90 backdrop-blur-md border-b border-primary/10 overflow-hidden"
      >
        <div className="relative h-[120px] flex items-center px-2">
          <div className="shrink-0 flex flex-col items-center justify-center px-3 gap-1 border-r border-ivory/10 mr-2 h-full">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-ivory/70" style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}>Featured</span>
          </div>
          <div className="flex-1 overflow-hidden mask-fade">
            <div
              className="flex gap-3 py-1 will-change-transform"
              style={{ animation: `featured-marquee ${Math.max(20, items.length * 4)}s linear infinite`, width: "max-content" }}
            >
              {loop.map((it, idx) => (
                <button
                  key={`${it.id}-${idx}`}
                  type="button"
                  onClick={() => openSimilar(it)}
                  className="shrink-0 w-[140px] rounded-lg bg-card border border-primary/20 overflow-hidden shadow-md cursor-pointer group text-left hover:-translate-y-1 transition-transform"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={20} className="text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-1 left-1 text-[8px] bg-primary text-primary-foreground px-1 py-0">
                      <Star size={7} className="mr-0.5" /> Featured
                    </Badge>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="font-semibold text-[10px] truncate leading-tight">{it.name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{it.org_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab handle to pull down / hide */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Pull down featured products" : "Hide featured products"}
        className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-20 h-6 w-16 rounded-b-full bg-ebony/95 border border-t-0 border-primary/30 flex items-center justify-center gap-1 text-primary text-[10px] font-semibold hover:bg-primary hover:text-ebony transition-colors shadow"
      >
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        <Sparkles size={10} />
      </button>

      <style>{`
        @keyframes featured-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .mask-fade {
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 32px, black calc(100% - 32px), transparent 100%);
                  mask-image: linear-gradient(to right, transparent 0, black 32px, black calc(100% - 32px), transparent 100%);
        }
      `}</style>
    </div>
  );
}
