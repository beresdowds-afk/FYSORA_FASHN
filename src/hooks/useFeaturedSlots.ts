import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedSlot {
  id: string;
  org_id: string | null;
  user_id: string;
  user_role: string;
  catalogue_item_id: string;
  week_start: string;
  week_end: string;
  slot_type: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  is_active: boolean;
  created_at: string;
  catalogue_item?: any;
}

export interface SlotConfig {
  id: string;
  role: string;
  free_slots_per_period: number;
  period_weeks: number;
  paid_slot_price: number;
  paid_slot_currency: string;
  is_active: boolean;
}

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

export const useFeaturedSlots = (orgId: string | undefined, userId: string | undefined, userRole: string) => {
  const [slots, setSlots] = useState<FeaturedSlot[]>([]);
  const [config, setConfig] = useState<SlotConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = getCurrentWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  const fetchSlots = useCallback(async () => {
    if (!orgId && !userId) { setLoading(false); return; }
    setLoading(true);

    // Fetch config for role
    const configRole = userRole === "designer" ? "designer" : "org_admin";
    const { data: configData } = await supabase
      .from("featured_slot_config" as any)
      .select("*")
      .eq("role", configRole)
      .eq("is_active", true)
      .maybeSingle();
    setConfig(configData as any);

    // Fetch current slots
    let query = supabase
      .from("featured_product_slots" as any)
      .select("*")
      .eq("is_active", true)
      .gte("week_end", weekStart)
      .order("created_at", { ascending: false });

    if (orgId) query = query.eq("org_id", orgId);
    else if (userId) query = query.eq("user_id", userId);

    const { data } = await query;
    setSlots((data || []) as any);
    setLoading(false);
  }, [orgId, userId, userRole, weekStart]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Count free slots used in current 4-week period
  const periodStart = new Date(weekStart);
  periodStart.setDate(periodStart.getDate() - (config?.period_weeks || 4) * 7);
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const freeSlotsUsed = slots.filter(
    s => s.slot_type === "free" && s.week_start >= periodStartStr
  ).length;

  const freeSlotsRemaining = Math.max(0, (config?.free_slots_per_period || 0) - freeSlotsUsed);

  const addSlot = async (catalogueItemId: string, isPaid: boolean) => {
    if (!userId) return { error: new Error("No user") };

    const slotData: any = {
      org_id: orgId || null,
      user_id: userId,
      user_role: userRole,
      catalogue_item_id: catalogueItemId,
      week_start: weekStart,
      week_end: weekEnd,
      slot_type: isPaid ? "paid" : "free",
      amount_paid: isPaid ? (config?.paid_slot_price || 8) : 0,
      currency: config?.paid_slot_currency || "USD",
      payment_status: "paid",
      is_active: true,
    };

    const { error } = await supabase
      .from("featured_product_slots" as any)
      .insert(slotData);

    if (!error) await fetchSlots();
    return { error };
  };

  const removeSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("featured_product_slots" as any)
      .update({ is_active: false } as any)
      .eq("id", slotId);
    if (!error) await fetchSlots();
    return { error };
  };

  return {
    slots,
    config,
    loading,
    freeSlotsRemaining,
    freeSlotsUsed,
    weekStart,
    weekEnd,
    addSlot,
    removeSlot,
    refetch: fetchSlots,
  };
};
