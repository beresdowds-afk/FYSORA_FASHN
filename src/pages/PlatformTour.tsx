import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { roleTourTracks, tourRoleList, isTourRole, type TourRole } from "@/config/roleTourTracks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, ShoppingBag, Building2, Ruler, Package, Scissors,
  MessageSquare, Crown, ChevronRight, ChevronLeft,
  Volume2, VolumeX, X, Play, Pause, Eye,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, ShoppingBag, Building2, Ruler, Package, MessageSquare, Crown, Scissors,
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
  const [params, setParams] = useSearchParams();
  const { speak, stop, isSpeaking, voiceEnabled, toggleVoice } = useVoiceNarration();

  const roleParam = params.get("role");
  const role: TourRole | null = isTourRole(roleParam) ? roleParam : null;
  const track = role ? roleTourTracks[role] : null;

  const [currentStep, setCurrentStep] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const advanceTimer = useRef<number | null>(null);

  const steps = useMemo(() => track?.steps ?? [], [track]);
  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progress = totalSteps ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const StepIcon = step ? (ICON_MAP[step.icon] || Sparkles) : Sparkles;

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  // Reset on role change
  useEffect(() => {
    setCurrentStep(0);
    setTourComplete(false);
  }, [role]);

  // Narrate current step + auto-advance when narration ends
  useEffect(() => {
    if (!track || !step || !autoPlay) return;
    clearAdvanceTimer();
    const handleEnd = () => {
      if (!autoPlay) return;
      advanceTimer.current = window.setTimeout(() => {
        setCurrentStep((s) => {
          if (s < totalSteps - 1) return s + 1;
          setTourComplete(true);
          return s;
        });
      }, 1200);
    };
    if (voiceEnabled) {
      const t = window.setTimeout(() => speak(step.narration, handleEnd), 400);
      return () => {
        window.clearTimeout(t);
        clearAdvanceTimer();
      };
    } else {
      // muted auto-play: time-based advance from description length
      const dwellMs = Math.min(12000, Math.max(5000, step.description.length * 55));
      advanceTimer.current = window.setTimeout(handleEnd, dwellMs);
      return clearAdvanceTimer;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, autoPlay, voiceEnabled, role]);

  const goNext = useCallback(() => {
    stop();
    clearAdvanceTimer();
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setTourComplete(true);
    }
  }, [currentStep, totalSteps, stop, clearAdvanceTimer]);

  const goPrev = useCallback(() => {
    stop();
    clearAdvanceTimer();
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep, stop, clearAdvanceTimer]);

  const exitTour = useCallback(() => {
    stop();
    clearAdvanceTimer();
    navigate("/platform-catalogue");
  }, [stop, navigate, clearAdvanceTimer]);

  const goCta = useCallback(() => {
    stop();
    clearAdvanceTimer();
    navigate(track?.ctaPath ?? "/portal");
  }, [stop, navigate, track, clearAdvanceTimer]);

  // ===== Role picker (shown when no ?role=) =====
  if (!track) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="text-center mb-8">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1 mb-3">
              <Volume2 size={10} /> Auto-Play Voiced Tour
            </Badge>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-2">
              Pick your tour
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Each tour shows the full feature list — both free and premium — for your role.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {tourRoleList.map((r) => {
              const t = roleTourTracks[r];
              const Icon = ICON_MAP[t.icon] || Sparkles;
              return (
                <motion.button
                  key={r}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setParams({ role: r })}
                  className={`text-left rounded-2xl border border-border bg-gradient-to-br ${t.accent} p-5 hover:border-primary/40 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-lg">{t.label}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{t.tagline}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">{t.steps.length} steps</Badge>
                        <span>·</span>
                        <span>Auto-play with voice</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/platform-catalogue")} className="text-xs gap-1">
              <Eye size={12} /> Skip — browse catalogue
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <h2 className="font-heading font-bold text-2xl mb-2">{track.label} Tour Complete!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You've seen the full {track.label.toLowerCase()} feature set on FYSORA FASHN (Fashion Stitches Africa). Ready to get started?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="default" onClick={goCta} className="gap-2">
              <Crown size={16} /> {track.ctaLabel}
            </Button>
            <Button variant="outline" onClick={() => { setParams({}); setTourComplete(false); setCurrentStep(0); }}>
              <ChevronLeft size={14} className="mr-2" /> Pick another role
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
              <Eye size={10} /> {track.label} Tour
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
              onClick={() => { setAutoPlay(!autoPlay); if (isSpeaking) stop(); clearAdvanceTimer(); }}
              className="h-8 w-8 p-0"
              title={autoPlay ? "Pause auto-narration" : "Resume auto-narration"}
            >
              {autoPlay ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { stop(); clearAdvanceTimer(); setParams({}); }} className="h-8 px-2 text-xs gap-1">
              <ChevronLeft size={12} /> Roles
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
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { stop(); clearAdvanceTimer(); setCurrentStep(i); }}
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
                  onClick={() => { clearAdvanceTimer(); speak(step.narration); }}
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
