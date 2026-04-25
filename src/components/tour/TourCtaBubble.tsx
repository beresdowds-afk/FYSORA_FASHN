import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, X, ShoppingBag, Scissors, Sparkles, Building2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DISMISS_KEY = "fsa_tour_bubble_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const ROLES = [
  { key: "customer", label: "Customer", icon: ShoppingBag, hint: "Shop & order" },
  { key: "tailor", label: "Tailor", icon: Scissors, hint: "Run your studio" },
  { key: "designer", label: "Designer", icon: Sparkles, hint: "Showcase & sell" },
  { key: "organization", label: "Fashion House", icon: Building2, hint: "Full ERP" },
] as const;

export const TourCtaBubble = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem(DISMISS_KEY);
      if (t && Date.now() - Number(t) < DISMISS_TTL_MS) return;
    } catch {}
    const t = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
    setOpen(false);
  };

  const goTour = (role?: string) => {
    const path = role ? `/platform-tour?role=${role}` : "/platform-tour";
    navigate(path);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 max-w-[calc(100vw-2rem)]">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="w-[20rem] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 border-b border-border relative">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Close"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
                  <Volume2 size={10} /> Voiced Tour
                </Badge>
              </div>
              <h3 className="font-heading font-bold text-sm leading-snug">
                Take a 2-minute auto-play tour of FYSORA FASHN
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Pick your role to see every free + premium feature.
              </p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.key}
                    onClick={() => goTour(r.key)}
                    className="text-left rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-muted/50 p-2.5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-1.5 transition-colors">
                      <Icon size={14} className="text-primary" />
                    </div>
                    <p className="text-xs font-semibold leading-tight">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{r.hint}</p>
                  </button>
                );
              })}
            </div>
            <div className="px-3 pb-3 flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={dismiss} className="text-[11px] h-7 text-muted-foreground">
                Don't show again
              </Button>
              <Button size="sm" onClick={() => goTour()} className="text-[11px] h-7 gap-1">
                <Play size={11} /> Start
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="bubble"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 240 }}
            onClick={() => setOpen(true)}
            className="group relative flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-primary text-primary-foreground shadow-2xl hover:shadow-primary/40 transition-shadow"
            aria-label="Open guided tour"
          >
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
            <span className="relative w-7 h-7 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Volume2 size={14} />
            </span>
            <span className="relative text-xs font-semibold whitespace-nowrap">
              Take the voiced tour
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TourCtaBubble;