import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface TourGuideProps {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: {
    target: string;
    title: string;
    description: string;
    placement?: "top" | "bottom" | "left" | "right";
  } | null;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

const TourGuide = ({ isActive, currentStep, totalSteps, step, next, prev, skip }: TourGuideProps) => {
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !step) {
      setPos(null);
      return;
    }

    const findTarget = () => {
      const el =
        document.querySelector(`[data-tour="${step.target}"]`) ||
        document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height });
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setPos(null);
      }
    };

    // Small delay to let DOM settle
    const timer = setTimeout(findTarget, 200);
    return () => clearTimeout(timer);
  }, [isActive, step, currentStep]);

  if (!isActive || !step) return null;

  const placement = step.placement || "bottom";

  const getBubbleStyle = (): React.CSSProperties => {
    if (!pos) return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const gap = 16;
    const style: React.CSSProperties = { position: "absolute", zIndex: 10001, maxWidth: 340 };

    switch (placement) {
      case "bottom":
        style.top = pos.top + pos.height + gap;
        style.left = pos.left + pos.width / 2;
        style.transform = "translateX(-50%)";
        break;
      case "top":
        style.top = pos.top - gap;
        style.left = pos.left + pos.width / 2;
        style.transform = "translate(-50%, -100%)";
        break;
      case "right":
        style.top = pos.top + pos.height / 2;
        style.left = pos.left + pos.width + gap;
        style.transform = "translateY(-50%)";
        break;
      case "left":
        style.top = pos.top + pos.height / 2;
        style.left = pos.left - gap;
        style.transform = "translate(-100%, -50%)";
        break;
    }

    return style;
  };

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-[10000] pointer-events-none">
            <div className="absolute inset-0 bg-foreground/40 pointer-events-auto" onClick={skip} />
            {/* Highlight cutout */}
            {pos && (
              <div
                className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
                style={{
                  top: pos.top - 4,
                  left: pos.left - 4,
                  width: pos.width + 8,
                  height: pos.height + 8,
                  boxShadow: "0 0 0 9999px hsl(var(--foreground) / 0.4)",
                  zIndex: 10000,
                }}
              />
            )}
          </div>

          {/* Bubble */}
          <motion.div
            ref={bubbleRef}
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            style={getBubbleStyle()}
            className="bg-card border border-border rounded-xl shadow-lg p-4 z-[10001] pointer-events-auto"
          >
            {/* Arrow nub */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles size={14} className="text-primary" />
                </div>
                <h4 className="font-heading font-semibold text-sm text-foreground">{step.title}</h4>
              </div>
              <button onClick={skip} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">
                {currentStep + 1} / {totalSteps}
              </span>
              <div className="flex gap-1.5">
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={prev} className="h-7 px-2 text-xs">
                    <ChevronLeft size={12} /> Back
                  </Button>
                )}
                <Button size="sm" onClick={next} className="h-7 px-3 text-xs">
                  {currentStep === totalSteps - 1 ? "Done" : "Next"} {currentStep < totalSteps - 1 && <ChevronRight size={12} />}
                </Button>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1 justify-center mt-3">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === currentStep ? "w-4 bg-primary" : i < currentStep ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TourGuide;
