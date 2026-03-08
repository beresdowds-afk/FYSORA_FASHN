import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaxJurisdiction {
  id: string;
  jurisdiction_code: string;
  jurisdiction_name: string;
  country_code: string;
  jurisdiction_type: string;
  tax_rate: number;
  tax_name: string;
  applies_to_saas: boolean;
  is_active: boolean;
  nexus_revenue_threshold: number;
  nexus_transaction_threshold: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NexusTracking {
  id: string;
  jurisdiction_id: string;
  tracking_period: string;
  total_revenue: number;
  total_transactions: number;
  nexus_triggered: boolean;
  nexus_triggered_at: string | null;
  threshold_revenue_pct: number;
  threshold_transaction_pct: number;
  jurisdiction?: TaxJurisdiction;
}

export interface TaxLedgerEntry {
  id: string;
  entity_type: string;
  entity_id: string | null;
  org_id: string | null;
  jurisdiction_id: string | null;
  tax_type: string;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  currency: string;
  reference_type: string | null;
  reference_id: string | null;
  customer_country: string | null;
  customer_state: string | null;
  is_exempt: boolean;
  exemption_reason: string | null;
  period: string;
  status: string;
  created_at: string;
}

export interface TaxConfig {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description: string | null;
  updated_at: string;
}

/** Country-level tax region metadata used in config */
export interface TaxRegion {
  country_code: string;
  country_name: string;
  flag: string;
  entity_type: string;
  entity_name: string;
  domestic_vat_rate: number;
  domestic_vat_name: string;
  has_subnational_tax: boolean;
  export_exempt: boolean;
  export_exempt_label: string;
  income_tax_rates?: { label: string; rate: string }[];
  notes?: string;
}

// ─── Config Hook ─────────────────────────────────────────────────
export function useTaxConfig() {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["tax-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_config" as any)
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as TaxConfig[];
    },
  });

  const getConfig = (key: string): Record<string, any> | undefined => {
    return configs.find(c => c.config_key === key)?.config_value;
  };

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, any> }) => {
      const { error } = await supabase
        .from("tax_config" as any)
        .update({ config_value: value, updated_at: new Date().toISOString() } as any)
        .eq("config_key", key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tax-config"] }),
  });

  /** Parse the `supported_regions` config into typed TaxRegion array */
  const regions: TaxRegion[] = (() => {
    const raw = configs.find(c => c.config_key === "supported_regions")?.config_value;
    if (!raw || !Array.isArray((raw as any).regions)) return [];
    return (raw as any).regions as TaxRegion[];
  })();

  return { configs, isLoading, getConfig, updateConfig, regions };
}

// ─── Jurisdictions Hook ──────────────────────────────────────────
export function useTaxJurisdictions() {
  const queryClient = useQueryClient();

  const { data: jurisdictions = [], isLoading } = useQuery({
    queryKey: ["tax-jurisdictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_jurisdictions" as any)
        .select("*")
        .order("country_code")
        .order("jurisdiction_name");
      if (error) throw error;
      return (data || []) as unknown as TaxJurisdiction[];
    },
  });

  const updateJurisdiction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaxJurisdiction> }) => {
      const { error } = await supabase
        .from("tax_jurisdictions" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tax-jurisdictions"] }),
  });

  /** Group jurisdictions by country_code */
  const byCountry = jurisdictions.reduce<Record<string, TaxJurisdiction[]>>((acc, j) => {
    (acc[j.country_code] ||= []).push(j);
    return acc;
  }, {});

  /** All unique country codes present */
  const countryCodes = Object.keys(byCountry).sort();

  /** Jurisdictions that apply SaaS tax and are active (any country) */
  const saasApplicable = jurisdictions.filter(j => j.applies_to_saas && j.is_active);

  return { jurisdictions, byCountry, countryCodes, saasApplicable, isLoading, updateJurisdiction };
}

// ─── Nexus Tracking Hook ─────────────────────────────────────────
export function useNexusTracking() {
  const { data: tracking = [], isLoading } = useQuery({
    queryKey: ["nexus-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nexus_tracking" as any)
        .select("*")
        .order("tracking_period", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as NexusTracking[];
    },
  });

  return { tracking, isLoading };
}

// ─── Tax Ledger Hook ─────────────────────────────────────────────
export function useTaxLedger(period?: string) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["tax-ledger", period],
    queryFn: async () => {
      let query = supabase
        .from("tax_ledger" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (period) query = query.eq("period", period);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TaxLedgerEntry[];
    },
  });

  const totalTaxCollected = entries
    .filter(e => e.status === "collected" || e.status === "calculated")
    .reduce((sum, e) => sum + Number(e.tax_amount), 0);

  const exemptTotal = entries
    .filter(e => e.is_exempt)
    .reduce((sum, e) => sum + Number(e.taxable_amount), 0);

  const byType = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.tax_type] = (acc[e.tax_type] || 0) + Number(e.tax_amount);
    return acc;
  }, {});

  return { entries, isLoading, totalTaxCollected, exemptTotal, byType };
}

// ─── Tax Calculator (region-agnostic) ────────────────────────────
export function useCalculateTax() {
  const { saasApplicable, byCountry } = useTaxJurisdictions();
  const { regions, getConfig } = useTaxConfig();

  const calculateTax = (opts: {
    amount: number;
    customerCountry: string;
    customerState?: string;
    isSubscription?: boolean;
  }): {
    taxRate: number;
    taxAmount: number;
    taxName: string;
    isExempt: boolean;
    exemptionReason?: string;
    jurisdictionId?: string;
  } => {
    const region = regions.find(r => r.country_code === opts.customerCountry);
    const defaults = getConfig("tax_defaults");

    // ── 1. Domestic sale in a registered region ──
    if (region && region.domestic_vat_rate > 0) {
      // Check if the company is also in this region (domestic sale)
      const entityConfig = getConfig("entity_structure") as any;
      const homeCountries: string[] = entityConfig?.home_countries || ["NG"];

      if (homeCountries.includes(opts.customerCountry)) {
        // Domestic sale → apply domestic VAT
        const rate = region.domestic_vat_rate;
        return {
          taxRate: rate,
          taxAmount: Math.round(opts.amount * rate * 100) / 100,
          taxName: region.domestic_vat_name || "VAT",
          isExempt: false,
        };
      }
    }

    // ── 2. Sub-national tax lookup (e.g. US states, CA provinces, EU member states) ──
    if (opts.customerState) {
      const stateCode = `${opts.customerCountry}-${opts.customerState}`;
      const jurisdiction = saasApplicable.find(j => j.jurisdiction_code === stateCode);

      if (jurisdiction) {
        const taxAmount = Math.round(opts.amount * Number(jurisdiction.tax_rate) * 100) / 100;
        return {
          taxRate: Number(jurisdiction.tax_rate),
          taxAmount,
          taxName: jurisdiction.tax_name,
          isExempt: false,
          jurisdictionId: jurisdiction.id,
        };
      }
    }

    // ── 3. Country-level tax (no sub-national match) ──
    const countryJurisdictions = byCountry[opts.customerCountry] || [];
    const countryLevel = countryJurisdictions.find(
      j => j.jurisdiction_type === "country" && j.is_active && j.applies_to_saas
    );
    if (countryLevel) {
      const taxAmount = Math.round(opts.amount * Number(countryLevel.tax_rate) * 100) / 100;
      return {
        taxRate: Number(countryLevel.tax_rate),
        taxAmount,
        taxName: countryLevel.tax_name,
        isExempt: false,
        jurisdictionId: countryLevel.id,
      };
    }

    // ── 4. Export of services – exempt ──
    if (defaults?.export_vat_exempt !== false) {
      return {
        taxRate: 0,
        taxAmount: 0,
        taxName: "None",
        isExempt: true,
        exemptionReason: "Export of services – VAT/GST exempt",
      };
    }

    return { taxRate: 0, taxAmount: 0, taxName: "None", isExempt: true };
  };

  return { calculateTax };
}
