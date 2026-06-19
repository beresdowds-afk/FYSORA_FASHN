import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreateClaim } from "@/hooks/useInsurance";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Upload, X, ShieldAlert, ArrowRight, ArrowLeft } from "lucide-react";
import type { InsuranceClaimType } from "@/lib/insurance/types";
import { useNavigate } from "react-router-dom";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const claimTypeOptions: { value: InsuranceClaimType; label: string; help: string }[] = [
  { value: "non_delivery", label: "Item never arrived", help: "Order shipped but never received" },
  { value: "delivery_failure", label: "Delivery failed", help: "Carrier returned or lost the parcel" },
  { value: "wrong_item", label: "Wrong item received", help: "Different design, fabric or size" },
  { value: "quality_issue", label: "Quality issue", help: "Damaged, defective or sub-standard" },
  { value: "measurement_error", label: "Measurement error", help: "Garment does not fit per spec" },
  { value: "fraud", label: "Suspected fraud", help: "Order or seller looks fraudulent" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  policy: {
    id: string;
    order_id: string | null;
    organization_id: string | null;
    tailor_id: string | null;
    coverage_limit: number;
    currency: string;
  };
  orderTitle?: string;
}

export default function ReportIssueDialog({ open, onOpenChange, policy, orderTitle }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const create = useCreateClaim();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [claimType, setClaimType] = useState<InsuranceClaimType | "">("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => { setStep(1); setClaimType(""); setDescription(""); setFiles([]); };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [];
    for (const f of Array.from(incoming)) {
      if (files.length + accepted.length >= MAX_FILES) break;
      if (f.size > MAX_BYTES) {
        toast({ title: "File too large", description: `${f.name} exceeds 10MB`, variant: "destructive" });
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
  };

  const submit = async () => {
    if (!claimType || !description.trim() || !user) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("insurance-evidence").upload(path, f, {
          contentType: f.type, upsert: false,
        });
        if (error) throw error;
        urls.push(path);
      }
      const claim = await create.mutateAsync({
        policyId: policy.id,
        orderId: policy.order_id ?? "",
        orgId: policy.organization_id,
        tailorId: policy.tailor_id,
        claimType,
        description: description.trim(),
        evidenceUrls: urls,
      });
      toast({ title: "Claim submitted", description: `Claim ${claim.claim_number} is under review.` });
      onOpenChange(false);
      reset();
      navigate(`/claims/${claim.id}`);
    } catch (e: any) {
      toast({ title: "Could not submit claim", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const selectedOption = claimTypeOptions.find((o) => o.value === claimType);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="text-[hsl(43,65%,38%)]" size={20} />
            Report an issue {orderTitle ? `· ${orderTitle}` : ""}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 — {step === 1 ? "Issue type" : step === 2 ? "Details & evidence" : "Review & submit"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <Label>What happened?</Label>
            <Select value={claimType} onValueChange={(v) => setClaimType(v as InsuranceClaimType)}>
              <SelectTrigger><SelectValue placeholder="Choose an issue type" /></SelectTrigger>
              <SelectContent>
                {claimTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.help}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="desc">Describe the issue</Label>
              <Textarea id="desc" rows={4} maxLength={2000}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide as much detail as possible…" />
            </div>
            <div>
              <Label>Photos / Videos ({files.length}/{MAX_FILES})</Label>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 hover:bg-muted/50">
                <Upload size={20} className="text-muted-foreground" />
                <span className="mt-1 text-xs text-muted-foreground">
                  Up to {MAX_FILES} files · 10MB each
                </span>
                <input
                  type="file" multiple className="hidden"
                  accept="image/*,video/*"
                  disabled={files.length >= MAX_FILES}
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between rounded border border-border bg-muted/30 px-2 py-1 text-xs">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <p className="flex items-center gap-2 font-medium text-amber-700">
                <AlertTriangle size={14} /> Please confirm
              </p>
              <p className="mt-1 text-muted-foreground">
                False claims may void your protection and trigger account review.
              </p>
            </div>
            <dl className="space-y-2">
              <div><dt className="text-xs text-muted-foreground">Issue type</dt>
                <dd className="font-medium">{selectedOption?.label}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="whitespace-pre-wrap">{description}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Evidence files</dt>
                <dd>{files.length} file(s) attached</dd></div>
            </dl>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={uploading}>
              <ArrowLeft size={14} /> Back
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={(step === 1 && !claimType) || (step === 2 && description.trim().length < 10)}
            >
              Next <ArrowRight size={14} />
            </Button>
          )}
          {step === 3 && (
            <Button variant="hero" onClick={submit} disabled={uploading}>
              {uploading ? "Submitting…" : "Submit claim"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}