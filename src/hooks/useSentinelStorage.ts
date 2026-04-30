import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SentinelStorageEntitlement {
  id: string;
  org_id: string | null;
  user_id: string | null;
  owner_type: "organization" | "designer";
  status: "pending" | "provisioning" | "active" | "suspended" | "revoked" | "failed";
  included_gb: number;
  overage_per_gb_usd: number;
  base_monthly_usd: number;
  current_usage_bytes: number;
  current_object_count: number;
  provider_buckets: Record<string, string>;
  current_period_start: string;
  current_period_end: string;
  provisioned_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
}

export interface SentinelStorageObject {
  id: string;
  entitlement_id: string;
  uploaded_by: string;
  storage_path: string;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  created_at: string;
}

export interface SentinelStorageUsage {
  total_bytes: number;
  total_gb: number;
  included_gb: number;
  overage_gb: number;
  base_usd: number;
  overage_usd: number;
  total_usd: number;
}

interface Options {
  orgId?: string | null;
  designerUserId?: string | null;
}

const BUCKET = "sentinel-cloud-storage";

export function useSentinelStorage({ orgId, designerUserId }: Options) {
  const [entitlement, setEntitlement] = useState<SentinelStorageEntitlement | null>(null);
  const [objects, setObjects] = useState<SentinelStorageObject[]>([]);
  const [usage, setUsage] = useState<SentinelStorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sentinel_storage_entitlements" as any)
        .select("*")
        .neq("status", "revoked")
        .limit(1);
      if (orgId) query = query.eq("org_id", orgId).eq("owner_type", "organization");
      else if (designerUserId)
        query = query.eq("user_id", designerUserId).eq("owner_type", "designer");

      const { data: ent } = await query.maybeSingle();
      const entRow = (ent as unknown as SentinelStorageEntitlement) ?? null;
      setEntitlement(entRow);

      if (entRow) {
        const { data: objs } = await supabase
          .from("sentinel_storage_objects" as any)
          .select("*")
          .eq("entitlement_id", entRow.id)
          .order("created_at", { ascending: false });
        setObjects((objs as unknown as SentinelStorageObject[]) ?? []);
      } else {
        setObjects([]);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, designerUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const provision = useCallback(async () => {
    if (!entitlement) {
      toast.error("No pending storage entitlement found. Subscribe to the add-on first.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: { action: "provision-storage", entitlement_id: entitlement.id },
      });
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === "active") toast.success("Multi-Cloud Storage provisioned across AWS, GCP & Cloudflare R2.");
      else if (status === "already_active") toast.info("Storage already active.");
      else toast.error(`Provisioning failed: ${(data as any)?.entitlement?.last_error ?? "unknown"}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to provision storage");
    } finally {
      setBusy(false);
    }
  }, [entitlement, refresh]);

  const revoke = useCallback(async () => {
    if (!entitlement) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: { action: "revoke-storage", entitlement_id: entitlement.id },
      });
      if (error) throw error;
      toast.success("Storage entitlement revoked.");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke storage");
    } finally {
      setBusy(false);
    }
  }, [entitlement, refresh]);

  const computeUsage = useCallback(async () => {
    if (!entitlement) return;
    try {
      const { data, error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: { action: "compute-storage-usage", entitlement_id: entitlement.id },
      });
      if (error) throw error;
      setUsage(data as SentinelStorageUsage);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to compute usage");
    }
  }, [entitlement]);

  useEffect(() => {
    if (entitlement?.status === "active") computeUsage();
  }, [entitlement?.id, entitlement?.status, computeUsage]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!entitlement || entitlement.status !== "active") {
        toast.error("Storage is not active. Provision it first.");
        return;
      }
      setBusy(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Not authenticated");
        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const path = `${entitlement.id}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase
          .from("sentinel_storage_objects" as any)
          .insert({
            entitlement_id: entitlement.id,
            uploaded_by: userData.user.id,
            storage_path: path,
            original_filename: file.name,
            content_type: file.type || null,
            size_bytes: file.size,
          });
        if (dbErr) throw dbErr;

        toast.success(`Uploaded ${file.name}`);
        await refresh();
        await computeUsage();
      } catch (e: any) {
        toast.error(e?.message ?? "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [entitlement, refresh, computeUsage],
  );

  const deleteFile = useCallback(
    async (object: SentinelStorageObject) => {
      setBusy(true);
      try {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([object.storage_path]);
        if (rmErr) throw rmErr;
        const { error: dbErr } = await supabase
          .from("sentinel_storage_objects" as any)
          .delete()
          .eq("id", object.id);
        if (dbErr) throw dbErr;
        toast.success(`Deleted ${object.original_filename}`);
        await refresh();
        await computeUsage();
      } catch (e: any) {
        toast.error(e?.message ?? "Delete failed");
      } finally {
        setBusy(false);
      }
    },
    [refresh, computeUsage],
  );

  const getDownloadUrl = useCallback(async (object: SentinelStorageObject) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(object.storage_path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  return {
    entitlement,
    objects,
    usage,
    loading,
    busy,
    refresh,
    provision,
    revoke,
    uploadFile,
    deleteFile,
    getDownloadUrl,
    computeUsage,
  };
}