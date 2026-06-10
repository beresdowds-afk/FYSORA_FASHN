import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Star, ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface FeaturedItem {
  id: string;
  name: string;
  image_url: string | null;
  org_name: string;
  category?: string | null;
}

export default function FeaturedCatalogueStrip() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setItems(mapped.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))));
      setLoading(false);
    };
    loadFeatured();
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const amount = 280;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  if (loading) {
    return (
      <div className="bg-ebony/90 backdrop-blur-md border-b border-primary/10 h-10 flex items-center px-4 shrink-0">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <motion.div
      layout
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: collapsed ? 36 : 120, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="bg-ebony/90 backdrop-blur-md border-b border-primary/10 overflow-hidden shrink-0"
    >
      {/* Collapsed state */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full h-9 flex items-center justify-center gap-2 text-[11px] text-primary hover:text-primary/80 transition-colors"
        >
          <Sparkles size={12} />
          <span>Featured Products ({items.length})</span>
          <ChevronRight size={12} className="rotate-90" />
        </button>
      )}

      {/* Expanded state */}
      {!collapsed && (
        <div className="relative h-[120px] flex items-center px-2">
          {/* Label */}
          <div className="shrink-0 flex flex-col items-center justify-center px-3 gap-1 border-r border-ivory/10 mr-2 h-full">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-ivory/70" style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}>Featured</span>
          </div>

          {/* Scroll buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-12 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-ebony/80 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-ebony transition-colors"
          >
            <ChevronLeft size={12} />
          </button>

          <div
            ref={scrollRef}
            className="flex-1 flex gap-3 overflow-x-auto scroll-smooth snap-x px-8 py-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((it) => (
              <motion.div
                key={it.id}
                whileHover={{ y: -4, scale: 1.03 }}
                className="snap-start shrink-0 w-[140px] rounded-lg bg-card border border-primary/20 overflow-hidden shadow-md cursor-pointer group"
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
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-10 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-ebony/80 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-ebony transition-colors"
          >
            <ChevronRight size={12} />
          </button>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(true)}
            className="shrink-0 w-7 h-7 rounded-full border border-ivory/10 flex items-center justify-center text-ivory/50 hover:text-ivory hover:border-ivory/30 transition-colors ml-1"
            aria-label="Collapse featured strip"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
