import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useGarmentAI = (orgId: string | undefined) => {
  const { toast } = useToast();
  const [tryonLoading, setTryonLoading] = useState<string | null>(null);
  const [enhanceLoading, setEnhanceLoading] = useState<string | null>(null);
  const [tryonResult, setTryonResult] = useState<{ garmentId: string; url: string } | null>(null);

  const startTryon = async (garmentId: string, garmentImageUrl: string, modelImageUrl: string) => {
    if (!orgId) return;
    setTryonLoading(garmentId);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.functions.invoke("fashn-tryon", {
        body: {
          action: "start",
          garment_image_url: garmentImageUrl,
          model_image_url: modelImageUrl,
          org_id: orgId,
          user_id: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Try-on started", description: "Processing... This may take 30-60 seconds." });

      // Poll for result
      const predictionId = data.prediction_id;
      const poll = async (attempts = 0): Promise<void> => {
        if (attempts > 30) {
          setTryonLoading(null);
          toast({ title: "Try-on timed out", variant: "destructive" });
          return;
        }

        await new Promise((r) => setTimeout(r, 3000));

        const { data: statusData } = await supabase.functions.invoke("fashn-tryon", {
          body: { action: "status", prediction_id: predictionId, org_id: orgId },
        });

        if (statusData?.status === "completed" && statusData?.output_url) {
          setTryonResult({ garmentId, url: statusData.output_url });
          setTryonLoading(null);
          toast({ title: "Try-on complete!" });

          // Increment tryon_count
          await supabase.rpc("increment_tryon_count" as any, { garment_id: garmentId }).catch(() => {
            // If RPC doesn't exist, update directly
            supabase
              .from("garment_catalog")
              .select("tryon_count")
              .eq("id", garmentId)
              .single()
              .then(({ data: g }) => {
                if (g) {
                  supabase
                    .from("garment_catalog")
                    .update({ tryon_count: (g.tryon_count || 0) + 1 })
                    .eq("id", garmentId)
                    .then(() => {});
                }
              });
          });
          return;
        }

        if (statusData?.status === "failed") {
          setTryonLoading(null);
          toast({ title: "Try-on failed", description: statusData.error, variant: "destructive" });
          return;
        }

        return poll(attempts + 1);
      };

      poll();
    } catch (err: any) {
      setTryonLoading(null);
      toast({ title: "Try-on error", description: err.message, variant: "destructive" });
    }
  };

  const enhancePhoto = async (
    garmentId: string,
    imageUrl: string,
    action: "remove_background" | "enhance" | "stage" = "stage"
  ) => {
    if (!orgId) return;
    setEnhanceLoading(garmentId);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.functions.invoke("photoroom-enhance", {
        body: {
          action,
          image_url: imageUrl,
          org_id: orgId,
          user_id: user?.id,
          garment_id: garmentId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Photo enhanced!", description: `${action} applied successfully.` });
      setEnhanceLoading(null);
      return data.enhanced_url;
    } catch (err: any) {
      setEnhanceLoading(null);
      toast({ title: "Enhancement failed", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const clearTryonResult = () => setTryonResult(null);

  return {
    tryonLoading,
    enhanceLoading,
    tryonResult,
    startTryon,
    enhancePhoto,
    clearTryonResult,
  };
};
