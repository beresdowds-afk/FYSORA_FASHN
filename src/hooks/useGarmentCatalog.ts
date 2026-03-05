import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GarmentItem {
  id: string;
  org_id: string;
  uploaded_by: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  tags: string[];
  is_published: boolean;
  sync_to_website: boolean;
  sync_to_catalogue: boolean;
  tryon_enabled: boolean;
  tryon_count: number;
  download_count: number;
  metadata: any;
  created_at: string;
}

export const useGarmentCatalog = (orgId: string | undefined) => {
  const [garments, setGarments] = useState<GarmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGarments = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("garment_catalog")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setGarments((data as GarmentItem[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchGarments(); }, [fetchGarments]);

  const addGarment = async (garment: Partial<GarmentItem>) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase.from("garment_catalog").insert({
      org_id: orgId!,
      uploaded_by: user?.id!,
      name: garment.name!,
      description: garment.description,
      category: garment.category,
      image_url: garment.image_url,
      price: garment.price,
      currency: garment.currency,
      tags: garment.tags || [],
      is_published: garment.is_published ?? false,
      sync_to_website: garment.sync_to_website ?? false,
      sync_to_catalogue: garment.sync_to_catalogue ?? false,
      tryon_enabled: garment.tryon_enabled ?? true,
    }).select().single();
    if (!error) await fetchGarments();
    return { data, error };
  };

  const updateGarment = async (id: string, updates: Partial<GarmentItem>) => {
    const { error } = await supabase.from("garment_catalog").update(updates).eq("id", id);
    if (!error) await fetchGarments();
    return { error };
  };

  const deleteGarment = async (id: string) => {
    const { error } = await supabase.from("garment_catalog").delete().eq("id", id);
    if (!error) await fetchGarments();
    return { error };
  };

  const uploadGarmentImage = async (file: File, garmentId: string) => {
    const path = `${orgId}/${garmentId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("garment-images")
      .upload(path, file, { upsert: true });
    if (uploadError) return { error: uploadError, url: null };
    const { data } = supabase.storage.from("garment-images").getPublicUrl(path);
    await updateGarment(garmentId, { image_url: data.publicUrl });
    return { error: null, url: data.publicUrl };
  };

  const syncToCatalog = async (garmentId: string) => {
    return supabase.functions.invoke("process-ai-job", {
      body: {
        action: "submit",
        org_id: orgId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        job_type: "garment_catalog_sync",
        input_data: { garment_id: garmentId },
        credits_cost: 0,
      },
    });
  };

  return { garments, loading, addGarment, updateGarment, deleteGarment, uploadGarmentImage, syncToCatalog, refetch: fetchGarments };
};
