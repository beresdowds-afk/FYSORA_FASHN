import { useState } from "react";
import { useDisclaimerAcknowledgments, DISCLAIMER_TYPES, DISCLAIMER_TEXTS } from "@/hooks/useDisclaimerAcknowledgments";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface DisclaimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disclaimerType: keyof typeof DISCLAIMER_TEXTS;
  context?: string;
  onAcknowledged?: () => void;
}

const DisclaimerDialog = ({ open, onOpenChange, disclaimerType, context = "registration", onAcknowledged }: DisclaimerDialogProps) => {
  const { acknowledge } = useDisclaimerAcknowledgments();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const disclaimer = DISCLAIMER_TEXTS[disclaimerType];
  if (!disclaimer) return null;

  const handleAcknowledge = async () => {
    setSubmitting(true);
    const { error } = await acknowledge(disclaimerType, context);
    setSubmitting(false);
    if (!error) {
      onOpenChange(false);
      onAcknowledged?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            {disclaimer.title}
          </DialogTitle>
          <DialogDescription>{disclaimer.short}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {disclaimer.full}
          </div>
        </ScrollArea>
        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="disclaimer-agree"
              checked={checked}
              onCheckedChange={(c) => setChecked(!!c)}
            />
            <label htmlFor="disclaimer-agree" className="text-sm cursor-pointer">
              I have read, understood, and agree to the terms outlined above. I acknowledge that FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) operates as a neutral technology intermediary.
            </label>
          </div>
          <Button
            onClick={handleAcknowledge}
            disabled={!checked || submitting}
            className="w-full"
          >
            {submitting ? "Processing..." : "I Acknowledge & Agree"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisclaimerDialog;

// Inline disclaimer banner for key pages
export const DisclaimerBanner = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={`rounded-lg border border-border bg-muted/50 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={compact ? 14 : 16} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className={`font-medium ${compact ? "text-xs" : "text-sm"}`}>Platform Disclaimer</p>
          <p className={`text-muted-foreground ${compact ? "text-[10px]" : "text-xs"} mt-0.5`}>
            FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) is a neutral technology platform. All services are provided by independent Organizations and Tailors.
            FSA does not guarantee quality, timeliness, or outcomes of any work performed.{" "}
            {!compact && "Users engage with service providers at their own risk. See full terms for details."}
          </p>
        </div>
      </div>
    </div>
  );
};

// Status indicator for acknowledgment
export const AcknowledgmentStatus = ({ type }: { type: string }) => {
  const { hasAcknowledged, loading } = useDisclaimerAcknowledgments();
  if (loading) return null;
  return hasAcknowledged(type) ? (
    <Badge variant="secondary" className="text-[10px]">
      <CheckCircle size={10} className="mr-1" /> Acknowledged
    </Badge>
  ) : (
    <Badge variant="destructive" className="text-[10px]">
      <AlertTriangle size={10} className="mr-1" /> Pending
    </Badge>
  );
};
