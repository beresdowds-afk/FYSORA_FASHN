import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInsuranceConfig } from "./useInsuranceConfig";
import { calculatePremium, isEligible } from "@/lib/insurance/premium";
import { defaultRiskScore, scoreFromMetrics, type TailorMetrics } from "@/lib/insurance/risk";
import type { InsuranceClaimType, PremiumQuote, RiskScore, InsuranceRiskTier } from "@/lib/insurance/types";

export function useOrderPolicy(orderId: string | undefined) {
  return useQuery({
    queryKey: ["insurance-policy", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("insurance_policies")
        .select("*")
        .eq("order_id", orderId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOrderPoliciesMap(orderIds: string[]) {
  return useQuery({
    queryKey: ["insurance-policies-map", orderIds.sort().join(",")],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("insurance_policies")
        .select("id, order_id, status, premium_amount, coverage_limit, currency")
        .in("order_id", orderIds)
        .eq("status", "active");
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { if (p.order_id) map[p.order_id] = p; });
      return map;
    },
  });
}

export function useClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: ["insurance-claim", claimId],
    enabled: !!claimId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("insurance_claims")
        .select("*, policy:insurance_policies(*)")
        .eq("id", claimId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClaimActions(claimId: string | undefined) {
  return useQuery({
    queryKey: ["insurance-claim-actions", claimId],
    enabled: !!claimId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("insurance_claim_actions")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      policyId: string;
      orderId: string;
      orgId?: string | null;
      tailorId?: string | null;
      claimType: InsuranceClaimType;
      description: string;
      amountClaimed?: number;
      evidenceUrls?: string[];
    }) => {
      const claim_number = `CLM-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await (supabase as any)
        .from("insurance_claims")
        .insert({
          claim_number,
          policy_id: args.policyId,
          claim_type: args.claimType,
          description: args.description,
          amount_claimed: args.amountClaimed ?? null,
          evidence_urls: args.evidenceUrls ?? [],
          customer_id: user?.id ?? null,
          submitted_by: user?.id ?? null,
          organization_id: args.orgId ?? null,
          tailor_id: args.tailorId ?? null,
          status: "submitted",
        })
        .select()
        .single();
      if (error) throw error;
      await (supabase as any).from("insurance_claim_actions").insert({
        claim_id: data.id,
        action_type: "submitted",
        description: "Claim submitted by customer",
        performed_by: user?.id ?? null,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurance-claim"] }),
  });
}

export function usePostClaimMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { claimId: string; message: string }) => {
      const { error } = await (supabase as any).from("insurance_claim_actions").insert({
        claim_id: args.claimId,
        action_type: "message",
        description: args.message,
        performed_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["insurance-claim-actions", vars.claimId] }),
  });
}

export function useRateClaim() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { claimId: string; rating: number; feedback?: string }) => {
      const { error } = await (supabase as any).from("insurance_claim_actions").insert({
        claim_id: args.claimId,
        action_type: "rating",
        description: args.feedback ?? null,
        metadata: { rating: args.rating },
        performed_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["insurance-claim-actions", vars.claimId] }),
  });
}

/** Quote for an order at checkout. */
export function usePremiumQuote(args: {
  orderValue: number;
  currency?: string;
  risk?: RiskScore;
}): { quote: PremiumQuote | null; eligible: boolean; loading: boolean } {
  const { data: cfg, isLoading } = useInsuranceConfig();
  if (!cfg) return { quote: null, eligible: false, loading: isLoading };
  const risk = args.risk ?? defaultRiskScore(cfg);
  const eligible = isEligible(args.orderValue, cfg);
  const quote = eligible
    ? calculatePremium({ orderValue: args.orderValue, risk, config: cfg, currency: args.currency })
    : null;
  return { quote, eligible, loading: false };
}

/** Compute & cache risk for an org from order/dispute history. */
export function useOrgRiskScore(orgId: string | undefined) {
  const { data: cfg } = useInsuranceConfig();
  return useQuery({
    queryKey: ["org-risk-score", orgId],
    enabled: !!orgId && !!cfg,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RiskScore> => {
      if (!cfg || !orgId) return defaultRiskScore(cfg as any);
      const [{ data: orders }, { data: disputes }] = await Promise.all([
        (supabase as any).from("orders").select("id, status, due_date, updated_at, created_at").eq("org_id", orgId),
        (supabase as any).from("disputes").select("id").eq("org_id", orgId),
      ]);
      const total = orders?.length ?? 0;
      const completed = (orders ?? []).filter((o: any) =>
        ["completed", "delivered"].includes(o.status)).length;
      const onTime = (orders ?? []).filter((o: any) =>
        o.due_date && o.updated_at && new Date(o.updated_at) <= new Date(o.due_date) &&
        ["completed", "delivered"].includes(o.status)).length;
      const reviews = await (supabase as any)
        .from("customer_reviews").select("rating").eq("org_id", orgId);
      const ratings: number[] = (reviews.data ?? []).map((r: any) => Number(r.rating)).filter(Boolean);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 4;
      const oldest = (orders ?? []).reduce((min: number, o: any) => {
        const t = new Date(o.created_at).getTime();
        return t < min ? t : min;
      }, Date.now());
      const yrs = Math.max(0, (Date.now() - oldest) / (365 * 24 * 3600 * 1000));
      const metrics: TailorMetrics = {
        completionRate: total ? completed / total : 0.85,
        rating: avgRating,
        disputeCount: disputes?.length ?? 0,
        totalOrders: total,
        experienceYears: yrs,
        onTimeRate: completed ? onTime / completed : 0.85,
      };
      const score = scoreFromMetrics(metrics, cfg as any);
      // best-effort cache
      try {
        await (supabase as any).from("insurance_risk_scores").insert({
          subject_type: "organization",
          organization_id: orgId,
          score: score.score,
          tier: score.tier,
          factors: score.factors,
        });
      } catch { /* ignore */ }
      return score;
    },
  });
}

export const tierLabels: Record<InsuranceRiskTier, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  very_high: "Very High Risk",
};

export const tierColors: Record<InsuranceRiskTier, string> = {
  low: "bg-green-500/15 text-green-600 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  very_high: "bg-destructive/15 text-destructive border-destructive/30",
};