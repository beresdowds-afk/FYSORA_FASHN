import { useState } from "react";
import { useImageCapacity } from "@/hooks/useImageCapacity";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Loader2 } from "lucide-react";

interface Props { orgId: string; websiteId?: string | null; }

/**
 * Live image-capacity meter + "Request more capacity" CTA shown inside the
 * org catalogue management area. Requests flow to Super Admin for approval.
 */
const ImageCapacityPanel = ({ orgId, websiteId }: Props) => {
  const { used, limit, requests, requestPacks, loading } = useImageCapacity(orgId, websiteId || null);
  const { toast } = useToast();
  const [packs, setPacks] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const pending = requests.find(r => r.status === "pending" || r.status === "approved" || r.status === "awaiting_payment");

  const submit = async () => {
    setSubmitting(true);
    const { error } = await requestPacks(packs, `Requesting ${packs * 50} additional image slots.`);
    setSubmitting(false);
    if (error) {
      toast({ title: "Request failed", description: (error as Error).message, variant: "destructive" });
      return;
    }
    toast({ title: "Request submitted", description: "Super Admin will review and issue an invoice." });
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Image capacity</p>
          <p className="text-xs text-muted-foreground">{loading ? "Loading…" : `${used} / ${limit} images used`}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant={pct > 80 ? "default" : "outline"}>
              <ImagePlus size={14} className="mr-1" /> Request more
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request more image capacity</DialogTitle>
              <DialogDescription>
                Each pack adds 50 image slots to your website's catalogue. Super Admin
                approves the request and issues an invoice. Capacity activates once
                payment is verified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm">Packs (×50 images)</label>
              <input type="number" min={1} max={20} value={packs}
                onChange={e => setPacks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <p className="text-xs text-muted-foreground">
                You'll receive an invoice after Super Admin approval. Final price is shown then.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin mr-1" />}
                Submit request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Progress value={pct} />
      {pending && (
        <Badge variant="secondary" className="text-xs">
          Request pending: {pending.packs_requested} × 50 ({pending.status})
        </Badge>
      )}
    </div>
  );
};

export default ImageCapacityPanel;
