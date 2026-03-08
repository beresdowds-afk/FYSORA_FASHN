import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RolePricing {
  label: string;
  cycle: string;
}

const FALLBACKS: Record<string, RolePricing> = {
  customer: { label: "$10/yr", cycle: "yearly" },
  designer: { label: "$15/mo", cycle: "monthly" },
  tailor: { label: "$29/mo", cycle: "monthly" },
  org_native_basic: { label: "$79/mo", cycle: "monthly" },
  org_native_custom: { label: "$149/mo", cycle: "monthly" },
  org_external: { label: "$249/mo", cycle: "monthly" },
};

const formatPrice = (amount: number, currency: string, cycle: string): string => {
  if (amount === 0) return "Free";
  const symbol = currency === "USD" ? "$" : currency;
  const suffix = cycle === "monthly" ? "/mo" : cycle === "yearly" ? "/yr" : "";
  return `${symbol}${amount}${suffix}`;
};

export const useHeroPricing = () => {
  const [pricing, setPricing] = useState<Record<string, RolePricing>>(FALLBACKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("subscription_rates" as any)
        .select("role_type, price_amount, price_currency, billing_cycle, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (data && (data as any[]).length > 0) {
        const map: Record<string, RolePricing> = { ...FALLBACKS };
        // Pick the first active plan per role
        for (const row of data as any[]) {
          if (!map[row.role_type] || map[row.role_type] === FALLBACKS[row.role_type]) {
            map[row.role_type] = {
              label: formatPrice(row.price_amount, row.price_currency, row.billing_cycle),
              cycle: row.billing_cycle,
            };
          }
        }
        setPricing(map);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { pricing, loading };
};
