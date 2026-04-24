import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, Mail, Bell, Lock, Crown, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FreeTourConsentDialogProps {
  toursUsed: number;
  maxTours: number;
  onConsentGiven: () => void;
  onSubscribe: () => void;
}

export default function FreeTourConsentDialog({
  toursUsed,
  maxTours,
  onConsentGiven,
  onSubscribe,
}: FreeTourConsentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toursRemaining = maxTours - toursUsed;
  const hasToursLeft = toursRemaining > 0;

  const handleStartTour = async () => {
    if (!user || !agreed) return;
    setSubmitting(true);

    // Record consent and increment tour count
    await supabase
      .from("profiles")
      .update({
        promo_consent: true,
        promo_consent_at: new Date().toISOString(),
        free_tours_used: toursUsed + 1,
      } as any)
      .eq("id", user.id);

    toast({
      title: "Tour starting",
      description: `You have ${toursRemaining - 1} free tour${toursRemaining - 1 === 1 ? "" : "s"} remaining.`,
    });
    setSubmitting(false);
    onConsentGiven();
    // Navigate to the voiced platform tour
    navigate("/platform-tour");
  };

  if (!hasToursLeft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md mx-auto">
          <Lock size={36} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-heading font-bold text-lg mb-2">Free Tours Exhausted</h3>
          <p className="text-sm text-muted-foreground mb-2">
            You've used all <span className="font-semibold text-foreground">{maxTours}</span> free platform tours.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Subscribe to the <span className="font-semibold text-primary">$10/year Premium plan</span> and verify your identity for full unrestricted access to the Platform Catalogue.
          </p>
          <Button variant="default" onClick={onSubscribe} className="w-full">
            <Crown size={14} className="mr-2" /> Subscribe Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="rounded-xl border border-border bg-card p-8 max-w-md mx-auto">
        <div className="text-center mb-6">
          <Eye size={36} className="mx-auto text-primary mb-3" />
          <h3 className="font-heading font-bold text-lg mb-1">Free Platform Tour</h3>
          <Badge variant="outline" className="text-xs">
            {toursRemaining} of {maxTours} tours remaining
          </Badge>
        </div>

        <div className="rounded-lg bg-muted/50 border border-border p-4 mb-6 space-y-3">
          <p className="text-sm font-medium">What you'll get:</p>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Volume2 size={14} className="mt-0.5 text-primary shrink-0" />
            <span>A <span className="font-medium text-foreground">voice-guided tour</span> of the entire platform and its features</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Eye size={14} className="mt-0.5 text-primary shrink-0" />
            <span>Browse and preview all catalogue products in <span className="font-medium text-foreground">read-only mode</span></span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock size={14} className="mt-0.5 text-destructive shrink-0" />
            <span>Feature interactions (ordering, wishlists, try-on) are <span className="font-medium text-foreground">disabled</span> during free tours</span>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-6 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <Checkbox
            id="promo-consent"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(!!v)}
            className="mt-0.5"
          />
          <label htmlFor="promo-consent" className="text-xs leading-relaxed cursor-pointer">
            <span className="font-medium">I agree</span> to receive promotional emails
            <Mail size={10} className="inline mx-1" />
            and notifications
            <Bell size={10} className="inline mx-1" />
            from <span className="font-semibold">FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)</span> about new products, features, and offers.
          </label>
        </div>

        <Button
          className="w-full"
          disabled={!agreed || submitting}
          onClick={handleStartTour}
        >
          {submitting ? "Starting..." : `Start Free Tour (${toursRemaining} left)`}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          After {maxTours} free tours, a $10/year Premium subscription + identity verification is required for full access.
        </p>
      </div>
    </div>
  );
}
