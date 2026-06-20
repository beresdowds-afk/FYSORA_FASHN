import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useClaim, useClaimActions, useRateClaim, useRealtimeClaim } from "@/hooks/useInsurance";
import { useInsuranceConfig } from "@/hooks/useInsuranceConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Star, ShieldCheck, Clock, FileText, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ClaimChatPanel from "@/components/insurance/ClaimChatPanel";
import ClaimAuditTimeline from "@/components/insurance/ClaimAuditTimeline";

const FLOW = ["submitted", "reviewing", "evidence_requested", "approved", "paid"] as const;
const FLOW_LABELS: Record<(typeof FLOW)[number], string> = {
  submitted: "Submitted",
  reviewing: "Under Review",
  evidence_requested: "Evidence Requested",
  approved: "Approved",
  paid: "Resolved",
};
const TERMINAL = new Set(["rejected", "expired", "cancelled"]);

function stageIndex(status: string) {
  if (status === "partial_approved") return 2;
  if (status === "evidence_requested") return 2;
  if (status === "approved") return 3;
  if (status === "paid") return 4;
  const i = (FLOW as readonly string[]).indexOf(status);
  return i < 0 ? 0 : i;
}

const EVIDENCE_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  pending:  { label: "Evidence: pending scan",  cls: "bg-muted text-muted-foreground border-border", icon: Clock },
  scanning: { label: "Evidence: scanning",      cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Loader2 },
  clean:    { label: "Evidence: verified safe", cls: "bg-green-500/10 text-green-600 border-green-500/30", icon: ShieldCheck },
  infected: { label: "Evidence: blocked",       cls: "bg-destructive/10 text-destructive border-destructive/30", icon: ShieldAlert },
  failed:   { label: "Evidence: scan failed",   cls: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: ShieldAlert },
  skipped:  { label: "No evidence",             cls: "bg-muted text-muted-foreground border-border", icon: FileText },
};

export default function ClaimTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const { data: claim, isLoading } = useClaim(id);
  const { data: actions = [] } = useClaimActions(id);
  useRealtimeClaim(id);
  const { data: cfg } = useInsuranceConfig();
  const rate = useRateClaim();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const messages = useMemo(
    () => (actions ?? []).filter((a: any) => a.action_type === "message"),
    [actions],
  );
  const hasRating = (actions ?? []).some((a: any) => a.action_type === "rating");

  if (isLoading) {
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading claim…</div>;
  }
  if (!claim) {
    return <div className="container mx-auto px-4 py-16 text-center">Claim not found.</div>;
  }

  const isTerminal = TERMINAL.has(claim.status);
  const idx = stageIndex(claim.status);
  const progress = isTerminal ? 100 : ((idx + 1) / FLOW.length) * 100;

  // Map each pipeline stage to its first matching action timestamp.
  const stageTimestamps: Record<string, string | undefined> = {};
  stageTimestamps.submitted = claim.created_at;
  for (const a of actions ?? []) {
    if (FLOW.includes(a.action_type) && !stageTimestamps[a.action_type]) {
      stageTimestamps[a.action_type] = a.created_at;
    }
  }

  const eta = cfg?.claims_window_days
    ? new Date(new Date(claim.created_at).getTime() + cfg.claims_window_days * 24 * 3600 * 1000)
    : null;
  const resolved = ["paid", "rejected", "approved", "partial_approved"].includes(claim.status);
  const evStatus = (claim.evidence_status ?? (claim.evidence_urls?.length ? "pending" : "skipped")) as keyof typeof EVIDENCE_BADGE;
  const evMeta = EVIDENCE_BADGE[evStatus] ?? EVIDENCE_BADGE.pending;
  const EvIcon = evMeta.icon;

  const submitRating = async () => {
    if (!rating) return;
    try {
      await rate.mutateAsync({ claimId: claim.id, rating, feedback });
      toast({ title: "Thanks for your feedback!" });
      setFeedback(""); setRating(0);
    } catch (e: any) {
      toast({ title: "Could not save rating", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal"><ArrowLeft size={14} /> Back to portal</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-[hsl(43,65%,38%)]" size={20} />
              Claim {claim.claim_number}
            </CardTitle>
            <Badge variant={isTerminal && claim.status !== "paid" ? "destructive" : "secondary"}>
              {claim.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-5 gap-1.5 text-[10px] sm:text-xs">
            {FLOW.map((s, i) => (
              <div key={s} className={cn(
                "rounded border px-1.5 py-1 text-center",
                i <= idx
                  ? "border-[hsl(43,65%,52%)]/40 bg-[hsl(43,65%,52%)]/10 text-[hsl(43,65%,38%)] font-medium"
                  : "border-border text-muted-foreground",
              )}>
                <div>{FLOW_LABELS[s]}</div>
                {stageTimestamps[s] && (
                  <div className="mt-0.5 text-[9px] opacity-75">
                    {format(new Date(stageTimestamps[s]!), "MMM d, p")}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={12} /> Submitted {formatDistanceToNow(new Date(claim.created_at))} ago</span>
            {eta && !isTerminal && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> Est. resolution by {format(eta, "PP")}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", evMeta.cls)}>
              <EvIcon size={12} className={evStatus === "scanning" ? "animate-spin" : ""} />
              {evMeta.label}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Audit timeline</CardTitle></CardHeader>
          <CardContent>
            <ClaimAuditTimeline claimId={claim.id} variant="customer" />

            {claim.evidence_urls?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Evidence ({claim.evidence_urls.length})</p>
                <ul className="space-y-1 text-xs">
                  {claim.evidence_urls.map((u: string) => (
                    <li key={u} className="flex items-center gap-1 truncate">
                      <FileText size={10} /> {u.split("/").pop()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-base">Chat with claims team</CardTitle></CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <ClaimChatPanel claimId={claim.id} messages={messages as any} />
          </CardContent>
        </Card>
      </div>

      {resolved && !hasRating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rate your claim experience</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star
                    size={28}
                    className={cn("transition-colors", n <= rating ? "fill-[hsl(43,65%,52%)] text-[hsl(43,65%,52%)]" : "text-muted-foreground")}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Optional feedback…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <Button variant="hero" onClick={submitRating} disabled={!rating || rate.isPending}>
              Submit feedback
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}