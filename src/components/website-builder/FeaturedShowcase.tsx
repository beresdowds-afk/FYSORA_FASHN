import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export type ShowcaseVariant = "infinite-scroll" | "popup" | "fade" | "fly";
export type ShowcaseSpeed = "slow" | "medium" | "fast";

export interface ShowcaseItem {
  id: string;
  name: string;
  image_url?: string | null;
  price?: number | string | null;
  currency?: string | null;
}

interface Props {
  items: ShowcaseItem[];
  variant?: ShowcaseVariant;
  speed?: ShowcaseSpeed;
  className?: string;
  itemLimit?: number;
  pauseOnHover?: boolean;
  mobileSpeed?: ShowcaseSpeed;
  respectReducedMotion?: boolean;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(max-width: 640px)");
    const on = () => setMobile(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return mobile;
}

const SPEED_MS: Record<ShowcaseSpeed, number> = {
  slow: 5000,
  medium: 3000,
  fast: 1600,
};
const MARQUEE_DURATION: Record<ShowcaseSpeed, string> = {
  slow: "60s",
  medium: "35s",
  fast: "18s",
};

function Card({ item, tabIndex = -1 }: { item: ShowcaseItem; tabIndex?: number }) {
  return (
    <div
      tabIndex={tabIndex}
      role="group"
      aria-label={`${item.name}${item.price != null ? `, ${item.currency ?? ""} ${item.price}` : ""}`}
      className="w-44 sm:w-56 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-card shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-sm font-medium truncate">{item.name}</div>
        {item.price != null && (
          <div className="text-xs text-muted-foreground">
            {item.currency ?? ""} {typeof item.price === "number" ? item.price.toLocaleString() : item.price}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeaturedShowcase({
  items,
  variant = "infinite-scroll",
  speed = "medium",
  className,
  itemLimit = 8,
  pauseOnHover = true,
  mobileSpeed,
  respectReducedMotion = true,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const trimmed = useMemo(
    () => (items ?? []).slice(0, Math.max(1, Math.min(itemLimit, 48))),
    [items, itemLimit]
  );
  const effectiveSpeed: ShowcaseSpeed = isMobile && mobileSpeed ? mobileSpeed : speed;

  if (!trimmed || trimmed.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground py-8 text-center", className)}>
        No featured products yet.
      </div>
    );
  }

  // Reduced-motion fallback: static accessible grid for every variant.
  if (respectReducedMotion && reduced) {
    return (
      <div
        className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", className)}
        role="list"
        aria-label="Featured products"
      >
        {trimmed.map((it) => (
          <div key={it.id} role="listitem"><Card item={it} tabIndex={0} /></div>
        ))}
      </div>
    );
  }

  if (variant === "infinite-scroll") {
    return (
      <InfiniteScroll items={trimmed} speed={effectiveSpeed} pauseOnHover={pauseOnHover} className={className} />
    );
  }

  return (
    <RotatingShowcase
      items={trimmed}
      variant={variant}
      speed={effectiveSpeed}
      pauseOnHover={pauseOnHover}
      className={className}
    />
  );
}

function InfiniteScroll({
  items, speed, pauseOnHover, className,
}: { items: ShowcaseItem[]; speed: ShowcaseSpeed; pauseOnHover: boolean; className?: string }) {
  const [paused, setPaused] = useState(false);
  const doubled = [...items, ...items];
  return (
    <div
      className={cn("overflow-hidden relative group", className)}
      role="region"
      aria-label="Featured products, continuous marquee"
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="flex gap-4 w-max"
        style={{
          animation: `featured-marquee ${MARQUEE_DURATION[speed]} linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {doubled.map((it, i) => (
          <Card key={`${it.id}-${i}`} item={it} tabIndex={i < items.length ? 0 : -1} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur rounded-full p-1.5 border border-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
        aria-label={paused ? "Resume showcase" : "Pause showcase"}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
      <style>{`
        @keyframes featured-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function RotatingShowcase({
  items, variant, speed, pauseOnHover, className,
}: { items: ShowcaseItem[]; variant: Exclude<ShowcaseVariant, "infinite-scroll">; speed: ShowcaseSpeed; pauseOnHover: boolean; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalMs = SPEED_MS[speed];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [items.length, intervalMs, paused]);

  const current = items[index];
  const animClass = useMemo(() => {
    switch (variant) {
      case "popup": return "animate-scale-in";
      case "fade": return "animate-fade-in";
      case "fly": return "animate-slide-in-right";
      default: return "animate-fade-in";
    }
  }, [variant]);

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center justify-center min-h-[280px] py-6 outline-none", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products"
      tabIndex={0}
      onKeyDown={onKey}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button type="button" onClick={prev} aria-label="Previous product"
        className="absolute left-1 z-10 bg-background/80 backdrop-blur rounded-full p-1.5 border border-border hover:bg-background">
        <ChevronLeft size={16} />
      </button>
      <div key={`${current.id}-${index}`} className={cn("transition-all", animClass)} aria-live="polite" aria-atomic="true">
        <Card item={current} tabIndex={0} />
      </div>
      <button type="button" onClick={next} aria-label="Next product"
        className="absolute right-1 z-10 bg-background/80 backdrop-blur rounded-full p-1.5 border border-border hover:bg-background">
        <ChevronRight size={16} />
      </button>
      <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume" : "Pause"}
        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur rounded-full p-1 border border-border">
        {paused ? <Play size={12} /> : <Pause size={12} />}
      </button>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show item ${i + 1} of ${items.length}`}
            aria-current={i === index}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              i === index ? "bg-primary w-4" : "bg-muted-foreground/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}