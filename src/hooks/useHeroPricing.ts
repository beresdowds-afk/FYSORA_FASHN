import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RolePricing {
  label: string;
  cycle: string;
}

interface PlanData {
  price: number;
  cycle: string;
  planName: string;
  description: string | null;
  features: string[];
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
  const [plans, setPlans] = useState<Record<string, PlanData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("subscription_rates" as any)
        .select("role_type, plan_name, price_amount, price_currency, billing_cycle, description, features, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (data && (data as any[]).length > 0) {
        const map: Record<string, RolePricing> = { ...FALLBACKS };
        const planMap: Record<string, PlanData> = {};

        for (const row of data as any[]) {
          // Pick the first active plan per role for hero badges
          if (!map[row.role_type] || map[row.role_type] === FALLBACKS[row.role_type]) {
            map[row.role_type] = {
              label: formatPrice(row.price_amount, row.price_currency, row.billing_cycle),
              cycle: row.billing_cycle,
            };
          }
          // Store full plan data for pricing section (first per role)
          if (!planMap[row.role_type]) {
            planMap[row.role_type] = {
              price: row.price_amount,
              cycle: row.billing_cycle,
              planName: row.plan_name,
              description: row.description,
              features: row.features || [],
            };
          }
        }
        setPricing(map);
        setPlans(planMap);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { pricing, plans, loading };
};
