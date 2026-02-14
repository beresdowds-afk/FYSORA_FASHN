import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Video, Clock, DollarSign, Loader2, Calendar } from "lucide-react";

interface BookMeasurementDialogProps {
  orgId: string;
  children: React.ReactNode;
}

const BookMeasurementDialog = ({ orgId, children }: BookMeasurementDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("1");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  const hoursNum = parseInt(hours) || 1;
  const totalUSD = 10 + Math.max(0, hoursNum - 1) * 5;
  const orgShare = Math.round(totalUSD * 0.6 * 100) / 100;
  const platformShare = Math.round(totalUSD * 0.4 * 100) / 100;

  const handleBook = async () => {
    setLoading(true);
    try {
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const { data, error } = await supabase.functions.invoke("initialize-measurement-payment", {
        body: {
          org_id: orgId,
          hours_booked: hoursNum,
          scheduled_at: scheduledAt,
          callback_url: `${window.location.origin}/portal?meas_status=success`,
        },
      });

      if (error || !data?.checkout_url) {
        toast({
          title: "Payment gateway not configured",
          description: "Contact the organization to set up online payments.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      window.location.href = data.checkout_url;
    } catch {
      toast({ title: "Error", description: "Failed to initialize payment", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video size={20} className="text-primary" />
            Book AI Measurement Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* How it works */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">How it works:</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Join a video call with AI-guided measurement capture</li>
              <li>• Organization can override with human assistance</li>
              <li>• Measurements saved to your profile automatically</li>
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-2">
            <Label>Session Duration</Label>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour — $10</SelectItem>
                <SelectItem value="2">2 Hours — $15</SelectItem>
                <SelectItem value="3">3 Hours — $20</SelectItem>
                <SelectItem value="4">4 Hours — $25</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Calendar size={12} /> Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock size={12} /> Time</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">First hour</span>
              <span className="font-medium">$10.00</span>
            </div>
            {hoursNum > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{hoursNum - 1} additional hour(s) × $5</span>
                <span className="font-medium">${(hoursNum - 1) * 5}.00</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-heading font-bold text-lg text-primary">${totalUSD}.00</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Revenue split: 60% organization (${orgShare}) · 40% platform (${platformShare})
            </p>
          </div>

          <Button variant="hero" className="w-full" onClick={handleBook} disabled={loading}>
            {loading ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Redirecting to Paystack...</>
            ) : (
              <><DollarSign size={16} className="mr-2" /> Pay ${totalUSD}.00 & Book</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookMeasurementDialog;
