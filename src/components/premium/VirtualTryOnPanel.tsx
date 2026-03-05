import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, Sparkles, Loader2, ImageIcon, Download } from "lucide-react";
import { useVirtualTryonSessions } from "@/hooks/usePremiumFeatures";
import { useMeasurementProfiles } from "@/hooks/useMeasurementProfiles";
import { useGarmentCatalog } from "@/hooks/useGarmentCatalog";
import { useAiJobQueue } from "@/hooks/useAiJobQueue";
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
  const { garments } = useGarmentCatalog(orgId);
  const { submitJob } = useAiJobQueue(orgId);
  const { toast } = useToast();

  const [customerImage, setCustomerImage] = useState<string | null>(null);
  const [garmentDescription, setGarmentDescription] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedGarmentId, setSelectedGarmentId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tryonGarments = garments.filter(g => g.tryon_enabled && g.is_published);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCustomerImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSelectGarment = (garmentId: string) => {
    setSelectedGarmentId(garmentId);
    const g = garments.find(g => g.id === garmentId);
    if (g) setGarmentDescription(g.description || g.name);
  };

  const handleTryOn = async () => {
    if (!customerImage || !garmentDescription.trim() || !user) return;
    setProcessing(true);
    setResultImage(null);

    try {
      const { data: session, error: sessionError } = await createSession({
        org_id: orgId,
        customer_id: user.id,
        garment_description: garmentDescription,
        input_image_url: customerImage.substring(0, 100) + "...",
        measurement_profile_id: selectedProfileId || undefined,
      });

      if (sessionError) throw sessionError;

      const selectedProfile = profiles.find(p => p.id === selectedProfileId);
      const measurements = selectedProfile?.measurements || undefined;

      // Submit via job queue for background processing with retries
      const { data, error } = await submitJob({
        job_type: "virtual_tryon",
        input_data: {
          customerImage,
          garmentDescription,
          measurements,
          sessionId: session?.id,
        },
        credits_cost: 1.50,
      });

      if (error) throw error;

      const jobResult = data?.job?.result_data;
      if (jobResult?.resultImage) {
        setResultImage(jobResult.resultImage);
        toast({ title: "Virtual try-on complete!" });
      } else if (data?.job?.status === "failed") {
        toast({ title: "Try-on failed", description: data.job.error_message, variant: "destructive" });
      } else {
        toast({ title: "Try-on queued", description: "Processing in background..." });
      }

      await refetch();
    } catch (err: any) {
      console.error("Virtual try-on error:", err);
      toast({ title: "Try-on failed", description: err.message || "Please try again later", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (imageUrl: string, sessionId: string) => {
    try {
      // Track download
      await supabase.from("download_tracking").insert({
        org_id: orgId,
        user_id: user?.id!,
        resource_type: "tryon_result",
        resource_id: sessionId,
        file_url: imageUrl,
        credits_charged: 0,
      });

      // Trigger download
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `tryon-${sessionId}.png`;
      link.click();
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg">FASHN Virtual Try-On</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a photo and select a garment or describe one. FASHN AI generates a photorealistic visualization with automatic retry and credit billing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Photo</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[200px]" onClick={() => fileInputRef.current?.click()}>
                {customerImage ? (
                  <img src={customerImage} alt="Customer" className="max-h-48 rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload size={32} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload a full-body photo</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Select from catalog */}
            {tryonGarments.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select from Catalog</label>
                <Select value={selectedGarmentId} onValueChange={handleSelectGarment}>
                  <SelectTrigger><SelectValue placeholder="Choose a garment" /></SelectTrigger>
                  <SelectContent>
                    {tryonGarments.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name} {g.price ? `· ${g.currency} ${g.price}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Garment Description</label>
              <Textarea placeholder="e.g. A fitted navy blue three-piece suit..." value={garmentDescription} onChange={(e) => setGarmentDescription(e.target.value)} rows={3} />
            </div>

            {profiles.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Measurement Profile (Optional)</label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger><SelectValue placeholder="Select a measurement profile" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.profile_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="hero" onClick={handleTryOn} disabled={!customerImage || !garmentDescription.trim() || processing} className="w-full">
              {processing ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Processing (with auto-retry)...</>
              ) : (
                <><Camera size={16} className="mr-2" /> Generate Try-On · 1.50 credits</>
              )}
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Result</label>
            <div className="border border-border rounded-lg min-h-[300px] flex items-center justify-center bg-muted/30 relative">
              {processing ? (
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">FASHN AI is generating your try-on...</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Auto-retries with exponential backoff on failure</p>
                </div>
              ) : resultImage ? (
                <div className="relative">
                  <img src={resultImage} alt="Virtual try-on result" className="max-h-[400px] rounded-lg object-contain" />
                  <Button size="sm" className="absolute bottom-2 right-2" onClick={() => handleDownload(resultImage, "latest")}>
                    <Download size={14} className="mr-1" /> Download
                  </Button>
                </div>
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

      {/* Session History with Downloads */}
      {sessions.length > 0 && (
        <Card className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Try-On History</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => (
              <div key={session.id} className="rounded-lg border border-border p-3">
                {session.result_image_url ? (
                  <div className="relative">
                    <img src={session.result_image_url} alt="Try-on" className="w-full h-40 object-cover rounded-md mb-2" />
                    <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleDownload(session.result_image_url!, session.id)}>
                      <Download size={12} />
                    </Button>
                  </div>
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
