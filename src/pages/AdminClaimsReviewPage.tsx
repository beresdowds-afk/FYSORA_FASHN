import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminClaims, useTransitionClaim, useUpdateEvidenceScan, useClaimActions } from "@/hooks/useInsurance";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowLeft, ShieldCheck, ShieldAlert, FileText, Eye, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

const STATUS_FILTERS = [
  "all", "submitted", "reviewing", "evidence_requested",
  "approved", "partial_approved", "rejected", "paid",
] as const;

const TRANSITIONS = [
  "reviewing", "evidence_requested", "approved",
  "partial_approved", "rejected", "paid",
] as const;

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["rejected", "cancelled", "expired"].includes(status)) return "destructive";
  if (["paid", "approved"].includes(status)) return "default";
  return "secondary";
}

export default function AdminClaimsReviewPage() {
  const { user, loading } = useAuth();
  const { role } = useUserGlobalRole();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const { data: claims = [], isLoading } = useAdminClaims(status);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((c: any) =>
      c.claim_number?.toLowerCase().includes(q) ||
      c.claim_type?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q));
  }, [claims, search]);

  if (loading) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role && role !== "super_admin" && role !== "super_assistant") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/super-admin"><ArrowLeft size={14} /> Back to Super Admin</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="text-[hsl(43,65%,38%)]" size={20} />
            Insurance Claims Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search claim # or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
            <Badge variant="outline">{filtered.length} shown</Badge>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading claims…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No claims match.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                      <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                      <TableCell className="text-xs capitalize">{c.claim_type.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)} className="capitalize">{c.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          {c.evidence_status === "infected" || c.evidence_status === "failed"
                            ? <ShieldAlert size={12} className="text-destructive" />
                            : c.evidence_status === "scanning"
                            ? <Loader2 size={12} className="animate-spin text-blue-600" />
                            : <ShieldCheck size={12} className="text-muted-foreground" />}
                          {c.evidence_status} · {c.evidence_urls?.length ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(c.created_at), "PP")}</TableCell>
                      <TableCell className="text-right text-xs">
                        {c.amount_approved ?? c.amount_claimed ?? "—"}
                      </TableCell>
                      <TableCell><Eye size={14} className="text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClaimReviewDialog claim={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ClaimReviewDialog({ claim, onClose }: { claim: any | null; onClose: () => void }) {
  const { toast } = useToast();
  const transition = useTransitionClaim();
  const updateScan = useUpdateEvidenceScan();
  const { data: actions = [] } = useClaimActions(claim?.id);
  const [newStatus, setNewStatus] = useState<string>("reviewing");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState<string>("");

  if (!claim) return null;

  const signedUrl = async (path: string) => {
    const { data } = await (supabase.storage.from("insurance-evidence") as any)
      .createSignedUrl(path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  const apply = async () => {
    try {
      await transition.mutateAsync({
        claimId: claim.id,
        newStatus: newStatus as any,
        notes: notes.trim() || undefined,
        amountApproved: amount ? Number(amount) : undefined,
      });
      toast({ title: "Claim updated", description: `Status set to ${newStatus.replace("_", " ")}` });
      setNotes(""); setAmount("");
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const markScan = async (status: string) => {
    try {
      await updateScan.mutateAsync({ claimId: claim.id, status });
      toast({ title: "Evidence status updated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!claim} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claim {claim.claim_number}</DialogTitle>
          <DialogDescription className="capitalize">
            {claim.claim_type.replace("_", " ")} · current status:{" "}
            <Badge variant={statusVariant(claim.status)}>{claim.status.replace("_", " ")}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap text-sm">{claim.description}</p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Evidence ({claim.evidence_urls?.length ?? 0}) — status: {claim.evidence_status}
            </p>
            {(claim.evidence_urls ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No files attached.</p>
            ) : (
              <ul className="space-y-1">
                {(claim.evidence_urls ?? []).map((p: string) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => signedUrl(p)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <FileText size={11} /> {p.split("/").pop()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => markScan("clean")}>Mark clean</Button>
              <Button size="sm" variant="outline" onClick={() => markScan("infected")}>Mark infected</Button>
              <Button size="sm" variant="outline" onClick={() => markScan("failed")}>Mark scan failed</Button>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Update status</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">New status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSITIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount approved (optional)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes / reason (shown to claimant)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </div>
            <div className="flex justify-end">
              <Button onClick={apply} disabled={transition.isPending}>
                {transition.isPending ? "Updating…" : "Apply transition"}
              </Button>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Activity log</p>
            <ol className="space-y-2">
              {actions.map((a: any) => (
                <li key={a.id} className="rounded border border-border bg-muted/20 px-2 py-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{a.action_type.replace("_", " ")}</span>
                    <span className="text-muted-foreground">{format(new Date(a.created_at), "PPp")}</span>
                  </div>
                  {a.description && <p className="mt-0.5 text-muted-foreground">{a.description}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}