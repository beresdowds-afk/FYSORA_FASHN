import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { platformTourSteps } from "@/config/platformTourSteps";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, ShoppingBag, Building2, Ruler, Package,
  MessageSquare, Crown, ChevronRight, ChevronLeft,
  Volume2, VolumeX, X, Play, Pause, Eye,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, ShoppingBag, Building2, Ruler, Package, MessageSquare, Crown,
};

const VISUAL_GRADIENTS: Record<string, string> = {
  welcome: "from-primary/20 via-primary/5 to-transparent",
  catalogue: "from-blue-500/15 via-blue-500/5 to-transparent",
  "fashion-houses": "from-emerald-500/15 via-emerald-500/5 to-transparent",
  measurements: "from-violet-500/15 via-violet-500/5 to-transparent",
  "try-on": "from-pink-500/15 via-pink-500/5 to-transparent",
  orders: "from-amber-500/15 via-amber-500/5 to-transparent",
  communications: "from-cyan-500/15 via-cyan-500/5 to-transparent",
  subscribe: "from-primary/25 via-primary/10 to-transparent",
};

const PlatformTour = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, stop, isSpeaking, voiceEnabled, toggleVoice } = useVoiceNarration();
  const [currentStep, setCurrentStep] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const step = platformTourSteps[currentStep];
  const totalSteps = platformTourSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const StepIcon = ICON_MAP[step.icon] || Sparkles;

  // Narrate current step
  useEffect(() => {
    if (autoPlay && voiceEnabled && step) {
      const timer = setTimeout(() => speak(step.narration), 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep, autoPlay, voiceEnabled]);

  const goNext = useCallback(() => {
    stop();
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setTourComplete(true);
    }
  }, [currentStep, totalSteps, stop]);

  const goPrev = useCallback(() => {
    stop();
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep, stop]);

  const exitTour = useCallback(() => {
    stop();
    navigate("/platform-catalogue");
  }, [stop, navigate]);

  const goSubscribe = useCallback(() => {
    stop();
    navigate("/portal");
  }, [stop, navigate]);

  if (tourComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card p-8 max-w-lg mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary" />
          </div>
          <h2 className="font-heading font-bold text-2xl mb-2">Tour Complete!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You've seen what FYSORA FASHN (Fashion Stitches Africa) has to offer. Ready to unlock the full experience?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="default" onClick={goSubscribe} className="gap-2">
              <Crown size={16} /> Subscribe — $10/year
            </Button>
            <Button variant="outline" onClick={exitTour}>
              <Eye size={14} className="mr-2" /> Browse Catalogue (Read-Only)
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
              <Eye size={10} /> Free Tour
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoice}
              className="h-8 w-8 p-0"
              title={voiceEnabled ? "Mute narration" : "Enable narration"}
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAutoPlay(!autoPlay); if (isSpeaking) stop(); }}
              className="h-8 w-8 p-0"
              title={autoPlay ? "Pause auto-narration" : "Resume auto-narration"}
            >
              {autoPlay ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <Button variant="ghost" size="sm" onClick={exitTour} className="h-8 px-2 text-xs gap-1">
              <X size={12} /> Exit
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-0.5 rounded-none" />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="max-w-3xl w-full"
          >
            <div className={`rounded-2xl border border-border bg-gradient-to-br ${VISUAL_GRADIENTS[step.visual] || VISUAL_GRADIENTS.welcome} overflow-hidden`}>
              {/* Visual Area */}
              <div className="p-8 sm:p-12 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring" }}
                  className="w-20 h-20 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center mx-auto mb-6"
                >
                  <StepIcon size={36} className="text-primary" />
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                    {step.subtitle}
                  </p>
                  <h2 className="font-heading font-bold text-2xl sm:text-3xl mb-4 text-foreground">
                    {step.title}
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>

                {/* Highlights */}
                {step.highlights && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap gap-2 justify-center mt-6"
                  >
                    {step.highlights.map((h, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs font-medium px-3 py-1"
                      >
                        {h}
                      </Badge>
                    ))}
                  </motion.div>
                )}

                {/* Speaking indicator */}
                {isSpeaking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 mt-6"
                  >
                    <div className="flex gap-0.5 items-end h-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-primary rounded-full"
                          animate={{
                            height: ["4px", "16px", "4px"],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-primary font-medium">Narrating...</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </Button>

              {/* Step dots */}
              <div className="flex gap-1.5">
                {platformTourSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { stop(); setCurrentStep(i); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-6 bg-primary"
                        : i < currentStep
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-border"
                    }`}
                  />
                ))}
              </div>

              <Button
                size="sm"
                onClick={goNext}
                className="gap-1"
              >
                {currentStep === totalSteps - 1 ? "Finish" : "Next"}
                {currentStep < totalSteps - 1 && <ChevronRight size={14} />}
              </Button>
            </div>

            {/* Replay narration button */}
            {voiceEnabled && !isSpeaking && (
              <div className="text-center mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speak(step.narration)}
                  className="text-xs text-muted-foreground gap-1"
                >
                  <Volume2 size={12} /> Replay Narration
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlatformTour;
