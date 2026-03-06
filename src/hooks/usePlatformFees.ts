/**
 * Platform fee calculations — reads from platform_fee_config table,
 * falls back to defaults if unavailable.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PLATFORM_FEE_PERCENT = 5;
export const ADMIN_FEE_PERCENT = 5;

export interface FeeBreakdown {
  subtotal: number;
  platformFee: number;       // surcharge on customer
  customerTotal: number;     // subtotal + platformFee
  adminFee: number;          // charged to org
  orgNetRevenue: number;     // subtotal - adminFee
}

export const calculateFees = (subtotal: number, surchargePercent = PLATFORM_FEE_PERCENT, adminPercent = ADMIN_FEE_PERCENT): FeeBreakdown => {
  const platformFee = Math.round(subtotal * surchargePercent / 100);
  const customerTotal = subtotal + platformFee;
  const adminFee = Math.round(subtotal * adminPercent / 100);
  const orgNetRevenue = subtotal - adminFee;

  return { subtotal, platformFee, customerTotal, adminFee, orgNetRevenue };
};

/** Hook to fetch live fee percentages from platform_fee_config */
export const useDynamicPlatformFees = () => {
  const [surchargePercent, setSurchargePercent] = useState(PLATFORM_FEE_PERCENT);
  const [adminPercent, setAdminPercent] = useState(ADMIN_FEE_PERCENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("platform_fee_config")
        .select("fee_key, fee_value")
        .in("fee_key", ["customer_surcharge", "org_admin_fee"])
        .eq("is_active", true);

      if (data) {
        for (const row of data) {
          if (row.fee_key === "customer_surcharge") setSurchargePercent(row.fee_value);
          if (row.fee_key === "org_admin_fee") setAdminPercent(row.fee_value);
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const calculate = (subtotal: number) => calculateFees(subtotal, surchargePercent, adminPercent);

  return { surchargePercent, adminPercent, calculate, loading };
};
