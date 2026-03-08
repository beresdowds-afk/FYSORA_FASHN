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

  return { configs, isLoading, getConfig, updateConfig };
}

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

  const usJurisdictions = jurisdictions.filter(j => j.country_code === "US");
  const ngJurisdictions = jurisdictions.filter(j => j.country_code === "NG");
  const saasApplicable = usJurisdictions.filter(j => j.applies_to_saas && j.is_active);

  return { jurisdictions, usJurisdictions, ngJurisdictions, saasApplicable, isLoading, updateJurisdiction };
}

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

/**
 * Calculate tax for a transaction based on customer location.
 */
export function useCalculateTax() {
  const { saasApplicable } = useTaxJurisdictions();
  const { getConfig } = useTaxConfig();

  const calculateTax = (opts: {
    amount: number;
    customerCountry: string;
    customerState?: string;
    isSubscription?: boolean;
  }): { taxRate: number; taxAmount: number; taxName: string; isExempt: boolean; exemptionReason?: string; jurisdictionId?: string } => {
    const defaults = getConfig("tax_defaults");

    // Nigerian customers: apply 7.5% VAT
    if (opts.customerCountry === "NG") {
      return {
        taxRate: 0.075,
        taxAmount: Math.round(opts.amount * 0.075 * 100) / 100,
        taxName: "VAT",
        isExempt: false,
      };
    }

    // Export of services from Nigeria = VAT-exempt
    if (defaults?.export_vat_exempt !== false) {
      // Check if US state has SaaS nexus triggered
      if (opts.customerCountry === "US" && opts.customerState) {
        const stateCode = `US-${opts.customerState}`;
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

      // No applicable tax
      return {
        taxRate: 0,
        taxAmount: 0,
        taxName: "None",
        isExempt: true,
        exemptionReason: "Export of services – VAT exempt",
      };
    }

    return { taxRate: 0, taxAmount: 0, taxName: "None", isExempt: true };
  };

  return { calculateTax };
}
