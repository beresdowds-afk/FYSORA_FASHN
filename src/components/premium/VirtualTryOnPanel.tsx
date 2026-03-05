import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, Sparkles, Loader2, ImageIcon } from "lucide-react";
import { useVirtualTryonSessions } from "@/hooks/usePremiumFeatures";
import { useMeasurementProfiles } from "@/hooks/useMeasurementProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VirtualTryOnPanelProps {
  orgId: string;
}

const VirtualTryOnPanel = ({ orgId }: VirtualTryOnPanelProps) => {
  const { user } = useAuth();
  const { sessions, createSession, refetch } = useVirtualTryonSessions(orgId);
  const { profiles } = useMeasurementProfiles(orgId, user?.id);
  const { toast } = useToast();

  const [customerImage, setCustomerImage] = useState<string | null>(null);
  const [garmentDescription, setGarmentDescription] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCustomerImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleTryOn = async () => {
    if (!customerImage || !garmentDescription.trim() || !user) return;
    setProcessing(true);
    setResultImage(null);

    try {
      // Create session record
      const { data: session, error: sessionError } = await createSession({
        org_id: orgId,
        customer_id: user.id,
        garment_description: garmentDescription,
        input_image_url: customerImage.substring(0, 100) + "...",
        measurement_profile_id: selectedProfileId || undefined,
      });

      if (sessionError) throw sessionError;

      // Get measurements from selected profile
      const selectedProfile = profiles.find(p => p.id === selectedProfileId);
      const measurements = selectedProfile?.measurements || undefined;

      // Call virtual try-on edge function
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          customerImage,
          garmentDescription,
          measurements,
          sessionId: session?.id,
          orgId,
          customerId: user.id,
        },
      });

      if (error) throw error;

      if (data?.resultImage) {
        setResultImage(data.resultImage);
        toast({ title: "Virtual try-on complete!" });
      } else {
        toast({ title: "Try-on generated", description: data?.description || "Check your sessions below." });
      }

      await refetch();
    } catch (err: any) {
      console.error("Virtual try-on error:", err);
      toast({
        title: "Try-on failed",
        description: err.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Try-On Generator */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg">FASHN Virtual Try-On</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a photo and describe the garment. FASHN AI generates a photorealistic visualization of you wearing it.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Your Photo</label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[200px]"
                onClick={() => fileInputRef.current?.click()}
              >
                {customerImage ? (
                  <img src={customerImage} alt="Customer" className="max-h-48 rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload size={32} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload a full-body photo</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Garment Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">Garment Description</label>
              <Textarea
                placeholder="e.g. A fitted navy blue three-piece suit with slim lapels, white dress shirt, and burgundy tie"
                value={garmentDescription}
                onChange={(e) => setGarmentDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Measurement Profile */}
            {profiles.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Measurement Profile (Optional)</label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a measurement profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.profile_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="hero"
              onClick={handleTryOn}
              disabled={!customerImage || !garmentDescription.trim() || processing}
              className="w-full"
            >
              {processing ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Camera size={16} className="mr-2" /> Generate Try-On · $1.50</>
              )}
            </Button>
          </div>

          {/* Right: Result */}
          <div>
            <label className="text-sm font-medium mb-2 block">Result</label>
            <div className="border border-border rounded-lg min-h-[300px] flex items-center justify-center bg-muted/30">
              {processing ? (
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">AI is generating your try-on...</p>
                </div>
              ) : resultImage ? (
                <img src={resultImage} alt="Virtual try-on result" className="max-h-[400px] rounded-lg object-contain" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Your try-on result will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Session History */}
      {sessions.length > 0 && (
        <Card className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Try-On History</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => (
              <div key={session.id} className="rounded-lg border border-border p-3">
                {session.result_image_url ? (
                  <img src={session.result_image_url} alt="Try-on" className="w-full h-40 object-cover rounded-md mb-2" />
                ) : (
                  <div className="w-full h-40 bg-muted/50 rounded-md mb-2 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground capitalize">{session.status}</span>
                  </div>
                )}
                <p className="text-xs font-medium truncate">{session.garment_description}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(session.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default VirtualTryOnPanel;
