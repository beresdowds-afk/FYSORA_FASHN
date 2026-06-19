import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck } from "lucide-react";
import { useOrgRiskScore, tierLabels, tierColors } from "@/hooks/useInsurance";
import { useInsuranceFlag } from "@/hooks/useInsuranceFlags";
import { cn } from "@/lib/utils";

export default function RiskScoreCard({ orgId }: { orgId: string }) {
  const { enabled } = useInsuranceFlag("risk_engine");
  const { data: risk, isLoading } = useOrgRiskScore(orgId);

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck size={16} className="text-[hsl(43,65%,38%)]" />
          Insurance Risk Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !risk ? (
          <p className="text-sm text-muted-foreground">Computing…</p>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-heading font-bold">{risk.score}<span className="text-base text-muted-foreground">/100</span></p>
                <p className="text-xs text-muted-foreground">Lower is better</p>
              </div>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", tierColors[risk.tier])}>
                {tierLabels[risk.tier]}
              </span>
            </div>
            <Progress value={Math.max(5, 100 - risk.score)} className="h-2" />
            <ul className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {risk.factors.completionRate !== undefined && (
                <li>Completion: <span className="text-foreground font-medium">{Math.round(risk.factors.completionRate * 100)}%</span></li>
              )}
              {risk.factors.rating !== undefined && (
                <li>Rating: <span className="text-foreground font-medium">{risk.factors.rating.toFixed(1)}/5</span></li>
              )}
              {risk.factors.disputeCount !== undefined && (
                <li>Disputes: <span className="text-foreground font-medium">{risk.factors.disputeCount}</span></li>
              )}
              {risk.factors.onTimeRate !== undefined && (
                <li>On-time: <span className="text-foreground font-medium">{Math.round(risk.factors.onTimeRate * 100)}%</span></li>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}