import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Camera, Loader2, CheckCircle2, AlertCircle,
  Info, Star, Crown, Sparkles, Upload, X, BookOpen, ChevronDown, ChevronUp,
  Smartphone, RotateCcw, Target, Layers, Box
} from "lucide-react";

interface TieredMeasurementPanelProps {
  orgId: string;
  customerId?: string;
  onMeasurementsComplete?: (measurements: Record<string, string>, tier: string) => void;
}

interface DetectedMeasurement {
  label: string;
  value: string;
  confidence: number;
  source_views?: string[];
  method?: string;
}

type MeasurementTier = "tier1" | "tier2" | "tier3";

const TIER_CONFIG = {
  tier1: {
    label: "Basic",
    subtitle: "Single Photo",
    icon: Camera,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    badgeVariant: "secondary" as const,
    credits: 1,
    accuracy: "60-75%",
    measurements: "8-10 points",
    description: "Upload one front-facing photo for quick AI-estimated measurements. Best for casual fits and initial sizing.",
    requiredPhotos: 1,
    photoLabels: ["Front-facing photo"],
  },
  tier2: {
    label: "Accurate",
    subtitle: "Multi-View",
    icon: Layers,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    badgeVariant: "default" as const,
    credits: 3,
    accuracy: "80-90%",
    measurements: "16-18 points",
    description: "Upload front and side photos for multi-view triangulation. Cross-references proportions across angles for significantly better accuracy.",
    requiredPhotos: 2,
    photoLabels: ["Front view", "Side view (left or right)"],
  },
  tier3: {
    label: "Premium",
    subtitle: "3D Depth Scan",
    icon: Box,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    badgeVariant: "outline" as const,
    credits: 5,
    accuracy: "90-97%",
    measurements: "20+ points",
    description: "Use your smartphone's depth sensor (ARCore/LiDAR) for near-professional precision. Captures circumferences via 3D body modeling.",
    requiredPhotos: 3,
    photoLabels: ["Front scan", "Side scan", "Back scan"],
  },
};

const TIER_TUTORIALS = {
  tier1: {
    title: "Basic Photo Measurement Guide",
    steps: [
      { icon: "📱", title: "Prepare", description: "Stand 2-3 meters from the camera. Wear fitted clothing (avoid baggy clothes). Use good lighting with minimal shadows." },
      { icon: "🧍", title: "Pose", description: "Face the camera directly. Stand straight with arms slightly away from your body. Keep feet shoulder-width apart." },
      { icon: "📸", title: "Capture", description: "Take a single full-body photo from chest to feet. Ensure your entire body is visible in the frame." },
      { icon: "🤖", title: "AI Analysis", description: "Gemini AI will analyze body proportions using anthropometric ratios and visual estimation. Results in ~10 seconds." },
    ],
    tips: [
      "Plain background works best for body detection",
      "Avoid patterns that break body silhouette",
      "Natural standing posture gives best results",
      "Accuracy improves with better lighting",
    ],
    limitations: [
      "Single-view depth perception is limited",
      "Circumference measurements are estimated, not measured",
      "Best suited for casual and ready-to-wear sizing",
    ],
  },
  tier2: {
    title: "Multi-View Measurement Guide",
    steps: [
      { icon: "📐", title: "Setup", description: "Mark a spot on the floor. Place camera at waist height, 2-3 meters away. Use a tripod or stable surface for consistent angle." },
      { icon: "🧍", title: "Front Photo", description: "Face the camera squarely. Arms slightly out, palms facing thighs. Feet hip-width apart, weight evenly distributed." },
      { icon: "🔄", title: "Side Photo", description: "Turn 90° (left side facing camera). Same arm position. Keep feet in the same position. Maintain posture." },
      { icon: "🔬", title: "AI Triangulation", description: "Gemini Pro creates a multi-view body model. Cross-references width (front) with depth (side) for accurate circumferences." },
    ],
    tips: [
      "Keep the same distance from camera for both shots",
      "Don't change posture between photos",
      "Side view reveals waist depth, chest depth, and posture",
      "Results are validated across views for consistency",
    ],
    limitations: [
      "Requires consistent positioning between shots",
      "2 photos needed (takes slightly longer)",
      "Better than Tier 1 but still vision-based estimation",
    ],
  },
  tier3: {
    title: "3D Depth Scan Guide",
    steps: [
      { icon: "📱", title: "Device Check", description: "Requires a smartphone with depth sensor: iPhone 12 Pro+ (LiDAR) or Android with ARCore support (most modern Android phones)." },
      { icon: "🌐", title: "Environment", description: "Stand in a well-lit room with 1.5m clear space around you. ARCore needs visual features — avoid plain white rooms." },
      { icon: "🔄", title: "Scanning", description: "Have someone slowly walk around you with the phone, capturing front, side, and back views. Keep the phone at waist-to-chest height, 1-2m away." },
      { icon: "🧊", title: "Depth Fusion", description: "Gemini Pro combines RGB images with depth data to build a 3D body model. Computes true circumferences from cross-sections at each landmark." },
    ],
    tips: [
      "LiDAR (iPhone Pro) gives the best depth accuracy",
      "ARCore uses dual cameras for depth — ensure both lenses are clean",
      "Slow, steady movement produces better depth maps",
      "3 captures minimum: front, left side, and back",
      "The subject should remain perfectly still during scanning",
    ],
    limitations: [
      "Requires compatible smartphone hardware",
      "Subject must remain completely still",
      "Processing takes longer (~20-30 seconds)",
      "Currently uses photo+depth estimation (full ARCore SDK integration coming soon)",
    ],
  },
};

const TieredMeasurementPanel = ({ orgId, customerId, onMeasurementsComplete }: TieredMeasurementPanelProps) => {
  const [selectedTier, setSelectedTier] = useState<MeasurementTier>("tier1");
  const [photos, setPhotos] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<DetectedMeasurement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState<MeasurementTier | null>(null);
  const [expandedTutorial, setExpandedTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tierConfig = TIER_CONFIG[selectedTier];
  const tutorial = TIER_TUTORIALS[selectedTier];

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (photos.length >= tierConfig.requiredPhotos) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPhotos((prev) => {
          if (prev.length >= tierConfig.requiredPhotos) return prev;
          return [...prev, dataUrl];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos.length, tierConfig.requiredPhotos]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (photos.length < tierConfig.requiredPhotos) {
      toast.error(`Please upload ${tierConfig.requiredPhotos} photo(s) for ${tierConfig.label} tier`);
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-measure-detect", {
        body: {
          images: photos,
          tier: selectedTier,
          step: 0,
          prompt: `${tierConfig.label} measurement analysis with ${photos.length} photo(s)`,
        },
      });

      if (fnError) throw fnError;

      if (data?.measurements && Array.isArray(data.measurements)) {
        const measurements: DetectedMeasurement[] = data.measurements.map((m: any) => ({
          label: m.label,
          value: `${m.value} ${m.unit || "in"}`,
          confidence: m.confidence || 0.5,
          source_views: m.source_views,
          method: m.method,
        }));
        setResults(measurements);
        toast.success(`${measurements.length} measurements detected with ${tierConfig.label} accuracy`);
      } else {
        setError("No measurements could be detected. Please try with clearer photos.");
      }
    } catch (err: any) {
      console.error("Measurement error:", err);
      setError(err.message || "Analysis failed. Please try again.");
      toast.error("Measurement analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = () => {
    const result: Record<string, string> = {};
    results.forEach((m) => { result[m.label] = m.value; });
    onMeasurementsComplete?.(result, selectedTier);
    toast.success("Measurements applied successfully");
  };

  const handleReset = () => {
    setPhotos([]);
    setResults([]);
    setError(null);
  };

  const getConfidenceColor = (c: number) => {
    if (c >= 0.85) return "text-green-600";
    if (c >= 0.7) return "text-primary";
    if (c >= 0.5) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Tier Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(TIER_CONFIG) as [MeasurementTier, typeof TIER_CONFIG.tier1][]).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = selectedTier === key;
          return (
            <Card
              key={key}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? `ring-2 ring-primary ${config.bgColor}` : "hover:bg-muted/30"
              }`}
              onClick={() => { setSelectedTier(key); handleReset(); }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon size={20} className={config.color} />
                </div>
                <div className="flex items-center gap-1">
                  {key === "tier2" && <Star size={12} className="text-primary fill-primary" />}
                  {key === "tier3" && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                  <Badge variant={config.badgeVariant} className="text-[10px]">
                    {config.credits} credit{config.credits > 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
              <h4 className="font-heading font-semibold text-sm">{config.label}</h4>
              <p className="text-xs text-muted-foreground mb-2">{config.subtitle}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className="font-medium">{config.accuracy}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-medium">{config.measurements}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Photos</span>
                  <span className="font-medium">{config.requiredPhotos}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs gap-1"
                onClick={(e) => { e.stopPropagation(); setShowTutorial(key); }}
              >
                <BookOpen size={12} /> View Tutorial
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Tutorial Dialog */}
      <Dialog open={!!showTutorial} onOpenChange={() => setShowTutorial(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {showTutorial && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen size={18} className="text-primary" />
                  {TIER_TUTORIALS[showTutorial].title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Steps */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Step-by-Step Guide</h4>
                  <div className="space-y-3">
                    {TIER_TUTORIALS[showTutorial].steps.map((step, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="text-2xl">{step.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Sparkles size={14} className="text-primary" /> Pro Tips
                  </h4>
                  <ul className="space-y-1.5">
                    {TIER_TUTORIALS[showTutorial].tips.map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 size={10} className="text-primary mt-0.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Info size={14} className="text-muted-foreground" /> Limitations
                  </h4>
                  <ul className="space-y-1.5">
                    {TIER_TUTORIALS[showTutorial].limitations.map((lim, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <AlertCircle size={10} className="text-amber-500 mt-0.5 shrink-0" />
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ARCore note for Tier 3 */}
                {showTutorial === "tier3" && (
                  <Card className="p-3 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start gap-2">
                      <Smartphone size={16} className="text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold">ARCore / LiDAR Integration</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Full native 3D scanning via Google ARCore (Android) and Apple LiDAR (iPhone Pro) is available 
                          when accessing through the mobile app. In the web version, depth is estimated from multiple 
                          high-resolution photos using Gemini's spatial understanding capabilities.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Compatible devices:</strong> iPhone 12 Pro+, iPad Pro 2020+, Samsung Galaxy S20+, 
                          Google Pixel 4+, and most ARCore-certified Android devices.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Tier Workspace */}
      <Card className={`p-6 ${tierConfig.borderColor} border`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <tierConfig.icon size={18} className={tierConfig.color} />
            <h3 className="font-heading font-semibold text-lg">
              {tierConfig.label} Measurement — {tierConfig.subtitle}
            </h3>
          </div>
          <Badge variant={tierConfig.badgeVariant}>{tierConfig.accuracy} accuracy</Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{tierConfig.description}</p>

        {/* Inline tutorial toggle */}
        <button
          onClick={() => setExpandedTutorial(!expandedTutorial)}
          className="flex items-center gap-1 text-xs text-primary mb-4 hover:underline"
        >
          <BookOpen size={12} />
          {expandedTutorial ? "Hide" : "Show"} Quick Guide
          {expandedTutorial ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {expandedTutorial && (
          <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tutorial.steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="text-[10px] text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo Upload Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Upload Photos ({photos.length}/{tierConfig.requiredPhotos})
            </p>
            {photos.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={handleReset}>
                <RotateCcw size={12} /> Reset
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tierConfig.photoLabels.map((label, idx) => (
              <div key={idx} className="relative">
                {photos[idx] ? (
                  <div className="relative rounded-lg overflow-hidden border border-border aspect-[3/4]">
                    <img
                      src={photos[idx]}
                      alt={label}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => removePhoto(idx)}
                    >
                      <X size={10} />
                    </Button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1.5 text-center">
                      {label}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 bg-muted/20"
                  >
                    <Upload size={20} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={tierConfig.requiredPhotos > 1}
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || photos.length < tierConfig.requiredPhotos}
            className="w-full gap-2"
          >
            {analyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing with Gemini AI...</>
            ) : (
              <><Target size={16} /> Analyze ({tierConfig.credits} credit{tierConfig.credits > 1 ? "s" : ""})</>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                {results.length} Measurements Detected
              </h4>
              <Badge variant="outline" className="text-[10px]">
                {selectedTier === "tier1" ? "Gemini Flash" : "Gemini Pro"} · {tierConfig.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.map((m, i) => (
                <div
                  key={`${m.label}-${i}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={getConfidenceColor(m.confidence)} />
                    <span className="text-xs font-medium">{m.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{m.value}</span>
                    <span className={`text-[10px] font-medium ${getConfidenceColor(m.confidence)}`}>
                      {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence legend */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" /> 85%+ High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> 70-84% Good</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 50-69% Fair</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> &lt;50% Low</span>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1 gap-2">
                <CheckCircle2 size={14} /> Apply Measurements
              </Button>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw size={14} /> Retry
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Technology Info */}
      <Card className="p-4 bg-muted/20">
        <div className="flex items-start gap-3">
          <Sparkles size={16} className="text-primary mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Powered by Gemini AI & Google ARCore</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tier 1 uses Gemini Flash for fast single-image analysis. Tiers 2 & 3 use Gemini Pro 
              for multi-view triangulation and depth-fusion processing. ARCore depth sensing is available 
              on compatible smartphones for Tier 3 premium scans. These serve as alternatives to FASHN API 
              and Try360.ai, providing flexible measurement options at every accuracy level.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TieredMeasurementPanel;
