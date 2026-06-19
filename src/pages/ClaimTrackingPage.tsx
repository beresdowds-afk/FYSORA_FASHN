import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useClaim, useClaimActions, usePostClaimMessage, useRateClaim } from "@/hooks/useInsurance";
import { useInsuranceConfig } from "@/hooks/useInsuranceConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Star, ShieldCheck, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const FLOW = ["submitted", "reviewing", "approved", "paid"] as const;
const TERMINAL = new Set(["rejected", "expired", "cancelled"]);

function stageIndex(status: string) {
  if (status === "partial_approved") return 2;
  const i = (FLOW as readonly string[]).indexOf(status);
  return i < 0 ? 0 : i;
}

export default function ClaimTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: claim, isLoading } = useClaim(id);
  const { data: actions = [] } = useClaimActions(id);
  const { data: cfg } = useInsuranceConfig();
  const post = usePostClaimMessage();
  const rate = useRateClaim();

  const [draft, setDraft] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const timeline = useMemo(
    () => (actions ?? []).filter((a: any) => a.action_type !== "message"),
    [actions],
  );
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
  const eta = cfg?.claims_window_days
    ? new Date(new Date(claim.created_at).getTime() + cfg.claims_window_days * 24 * 3600 * 1000)
    : null;
  const resolved = ["paid", "rejected", "approved", "partial_approved"].includes(claim.status);

  const send = async () => {
    if (!draft.trim()) return;
    await post.mutateAsync({ claimId: claim.id, message: draft.trim() });
    setDraft("");
  };

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
          <div className="grid grid-cols-4 gap-2 text-[10px] sm:text-xs">
            {FLOW.map((s, i) => (
              <div key={s} className={cn(
                "rounded border px-2 py-1 text-center capitalize",
                i <= idx
                  ? "border-[hsl(43,65%,52%)]/40 bg-[hsl(43,65%,52%)]/10 text-[hsl(43,65%,38%)] font-medium"
                  : "border-border text-muted-foreground",
              )}>{s}</div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={12} /> Submitted {formatDistanceToNow(new Date(claim.created_at))} ago</span>
            {eta && !isTerminal && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> Est. resolution by {format(eta, "PP")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-border pl-4">
              <li className="relative">
                <span className="absolute -left-[21px] flex h-3 w-3 rounded-full bg-[hsl(43,65%,52%)]" />
                <p className="text-sm font-medium">Claim submitted</p>
                <p className="text-xs text-muted-foreground">{format(new Date(claim.created_at), "PPp")}</p>
              </li>
              {timeline.map((a: any) => (
                <li key={a.id} className="relative">
                  <span className={cn(
                    "absolute -left-[21px] flex h-3 w-3 rounded-full",
                    a.action_type === "rejected" ? "bg-destructive" : "bg-[hsl(152,100%,26%)]",
                  )} />
                  <p className="text-sm font-medium capitalize">{a.action_type.replace("_", " ")}</p>
                  {a.description && <p className="text-xs">{a.description}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</p>
                </li>
              ))}
              {isTerminal && (
                <li className="relative">
                  <span className="absolute -left-[21px] flex h-3 w-3 rounded-full bg-muted-foreground" />
                  <p className="text-sm font-medium flex items-center gap-1">
                    {claim.status === "paid" ? <CheckCircle2 size={14} className="text-[hsl(152,100%,26%)]" /> : <XCircle size={14} className="text-destructive" />}
                    Resolved
                  </p>
                </li>
              )}
            </ol>

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
            <div className="flex-1 space-y-2 overflow-y-auto rounded border border-border bg-muted/20 p-3 min-h-[200px] max-h-[320px]">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">No messages yet.</p>
              ) : messages.map((m: any) => {
                const mine = m.performed_by === user?.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] rounded-lg px-3 py-1.5 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-card border border-border",
                    )}>
                      <p>{m.description}</p>
                      <p className={cn("text-[10px] mt-0.5", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDistanceToNow(new Date(m.created_at))} ago
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                rows={2}
                className="resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              />
              <Button onClick={send} disabled={!draft.trim() || post.isPending} size="icon">
                <Send size={14} />
              </Button>
            </div>
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