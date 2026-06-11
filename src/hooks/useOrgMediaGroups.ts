import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NodeType = "image" | "design_set" | "collection" | "album";

export interface MediaAsset {
  id: string; org_id: string; name: string; media_url: string;
  media_type: string; alt_text: string | null; tags: string[]; created_at: string;
}
export interface GroupNode {
  id: string; org_id: string; name: string; description: string | null;
  cover_url: string | null; created_at: string;
}
export interface GroupingItem {
  id: string; org_id: string;
  parent_type: NodeType; parent_id: string;
  child_type: NodeType; child_id: string;
  sort_order: number;
}

const tableFor = (t: Exclude<NodeType, "image">) =>
  t === "design_set" ? "org_design_sets" : t === "collection" ? "org_collections" : "org_albums";

export const useOrgMediaGroups = (orgId: string | undefined) => {
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [sets, setSets] = useState<GroupNode[]>([]);
  const [collections, setCollections] = useState<GroupNode[]>([]);
  const [albums, setAlbums] = useState<GroupNode[]>([]);
  const [groupings, setGroupings] = useState<GroupingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const sb: any = supabase;
    const [im, ds, co, al, gi] = await Promise.all([
      sb.from("org_media_assets").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      sb.from("org_design_sets").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      sb.from("org_collections").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      sb.from("org_albums").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      sb.from("org_grouping_items").select("*").eq("org_id", orgId).order("sort_order"),
    ]);
    setImages(im.data || []); setSets(ds.data || []);
    setCollections(co.data || []); setAlbums(al.data || []);
    setGroupings(gi.data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const uploadImage = async (file: File, name?: string) => {
    if (!orgId) return { error: new Error("no org") };
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const path = `${orgId}/library/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("org-assets").upload(path, file, { upsert: true });
    if (up.error) return { error: up.error };
    const { data } = supabase.storage.from("org-assets").getPublicUrl(path);
    const ins = await (supabase as any).from("org_media_assets").insert({
      org_id: orgId, uploaded_by: uid, name: name || file.name,
      media_url: data.publicUrl, media_type: file.type.startsWith("video") ? "video" : "image",
    });
    await load();
    return { error: ins.error };
  };

  const createGroup = async (kind: Exclude<NodeType, "image">, name: string, description?: string) => {
    if (!orgId) return { error: new Error("no org") };
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await (supabase as any).from(tableFor(kind)).insert({
      org_id: orgId, created_by: uid, name, description: description || null,
    });
    await load();
    return { error };
  };

  const deleteNode = async (type: NodeType, id: string) => {
    const tbl = type === "image" ? "org_media_assets" : tableFor(type);
    await (supabase as any).from(tbl).delete().eq("id", id);
    await (supabase as any).from("org_grouping_items").delete()
      .or(`and(parent_type.eq.${type},parent_id.eq.${id}),and(child_type.eq.${type},child_id.eq.${id})`);
    await load();
  };

  const addChild = async (parent_type: Exclude<NodeType, "image">, parent_id: string, child_type: NodeType, child_id: string) => {
    if (!orgId) return { error: new Error("no org") };
    const sort_order = groupings.filter(g => g.parent_type === parent_type && g.parent_id === parent_id).length;
    const { error } = await (supabase as any).from("org_grouping_items").insert({
      org_id: orgId, parent_type, parent_id, child_type, child_id, sort_order,
    });
    await load();
    return { error };
  };

  const removeChild = async (groupingId: string) => {
    await (supabase as any).from("org_grouping_items").delete().eq("id", groupingId);
    await load();
  };

  // Expand any node into the flat ordered list of leaf images (deduped, respect sort_order)
  const expandToImages = useCallback((type: NodeType, id: string, seen = new Set<string>()): MediaAsset[] => {
    if (type === "image") {
      if (seen.has(id)) return [];
      seen.add(id);
      const img = images.find(i => i.id === id);
      return img ? [img] : [];
    }
    const children = groupings
      .filter(g => g.parent_type === type && g.parent_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const out: MediaAsset[] = [];
    for (const c of children) out.push(...expandToImages(c.child_type, c.child_id, seen));
    return out;
  }, [images, groupings]);

  const publishToCatalogue = async (
    selections: Array<{ type: NodeType; id: string }>,
    options: { category_id?: string | null; price?: number | null; currency?: string | null } = {}
  ) => {
    if (!orgId) return { error: new Error("no org"), count: 0 };
    const seen = new Set<string>();
    const leafs: Array<{ asset: MediaAsset; source_type: NodeType; source_id: string }> = [];
    for (const sel of selections) {
      const imgs = expandToImages(sel.type, sel.id, seen);
      for (const a of imgs) leafs.push({ asset: a, source_type: sel.type, source_id: sel.id });
    }
    if (leafs.length === 0) return { error: null, count: 0 };
    const now = new Date();
    const rows = leafs.map((l, i) => ({
      org_id: orgId,
      name: l.asset.name || "Untitled",
      description: l.asset.alt_text || null,
      image_url: l.asset.media_url,
      media_url: l.asset.media_url,
      category_id: options.category_id || null,
      price: options.price ?? null,
      currency: options.currency || null,
      is_available: true,
      tags: l.asset.tags || [],
      source_type: l.source_type,
      source_id: l.source_id,
      sort_order: i,
      // Stagger published_at by 1ms per item to preserve arrangement order under "date" sort.
      published_at: new Date(now.getTime() + i).toISOString(),
    }));
    const { error } = await (supabase as any).from("org_catalogue_items").insert(rows);
    return { error, count: rows.length };
  };

  return {
    loading, images, sets, collections, albums, groupings,
    uploadImage, createGroup, deleteNode, addChild, removeChild,
    expandToImages, publishToCatalogue, refetch: load,
  };
};