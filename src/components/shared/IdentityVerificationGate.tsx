import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, AlertCircle, Loader2, Lock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const ID_TYPES = [
  { value: "nin", label: "National ID (NIN)", pattern: "11-digit number" },
  { value: "bvn", label: "BVN", pattern: "11-digit number" },
  { value: "passport", label: "International Passport", pattern: "Passport number" },
  { value: "drivers_license", label: "Driver's License", pattern: "License number" },
  { value: "voters_card", label: "Voter's Card", pattern: "VIN number" },
  { value: "ghana_card", label: "Ghana Card", pattern: "GHA-XXXXXXXXX-X" },
  { value: "kenyan_id", label: "Kenyan National ID", pattern: "8-digit number" },
  { value: "sa_id", label: "South African ID", pattern: "13-digit number" },
];

interface IdentityVerificationGateProps {
  children: React.ReactNode;
  featureLabel?: string;
}

export default function IdentityVerificationGate({ children, featureLabel = "this feature" }: IdentityVerificationGateProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
      supabase.from("customer_subscriptions" as any).select("id").eq("user_id", user.id).eq("status", "active").maybeSingle(),
    ]).then(([profileRes, subRes]) => {
      setVerified(!!(profileRes.data as any)?.identity_verified);
      setHasSubscription(!!subRes.data);
      setLoading(false);
    });
  }, [user]);

  const handleVerify = async () => {
    if (!identityNumber.trim() || !identityType || !user) return;
    setVerifying(true);
    setVerificationStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: { id_type: identityType, id_number: identityNumber.trim(), country: "auto" },
      });

      if (error || !data?.valid) {
        setVerificationStatus("invalid");
        toast({ title: "Verification failed", description: data?.message || "Could not verify identity.", variant: "destructive" });
      } else {
        setVerificationStatus("valid");
        await supabase.from("profiles").update({
          identity_type: identityType,
          identity_number: identityNumber.trim(),
          identity_verified: true,
          identity_verified_at: new Date().toISOString(),
        } as any).eq("id", user.id);
        setVerified(true);
        toast({ title: "Identity verified", description: "You now have full access to platform features." });
      }
    } catch {
      setVerificationStatus("invalid");
      toast({ title: "Verification error", description: "Please check your details and try again.", variant: "destructive" });
    }
    setVerifying(false);
  };

  if (loading) return null;

  // If no active subscription, prompt to subscribe first
  if (!hasSubscription) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-8 text-center max-w-md mx-auto mt-8">
        <Crown size={32} className="mx-auto text-primary mb-3" />
        <h3 className="font-heading font-bold text-lg mb-2">Premium Subscription Required</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Subscribe to the <span className="font-semibold text-foreground">$10/year Premium plan</span> to verify your identity and access {featureLabel}.
        </p>
        <Button variant="hero" onClick={() => {
          // Navigate to subscription tab in customer portal
          const tabsTrigger = document.querySelector('[value="subscription"]') as HTMLElement;
          if (tabsTrigger) tabsTrigger.click();
          else navigate("/portal");
        }}>
          <Crown size={14} className="mr-2" /> Go to Subscription
        </Button>
      </div>
    );
  }

  if (verified) return <>{children}</>;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-8 text-center max-w-md mx-auto mt-8">
      <Lock size={32} className="mx-auto text-muted-foreground mb-3" />
      <h3 className="font-heading font-bold text-lg mb-2">Identity Verification Required</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Verify your identity to access {featureLabel}. This is a one-time process.
      </p>

      <div className="space-y-4 text-left">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-primary" />
          <span className="text-sm font-medium">Verify Your Identity</span>
          {verificationStatus === "valid" && (
            <Badge className="bg-secondary/15 text-secondary text-[10px] ml-auto">
              <CheckCircle2 size={10} className="mr-1" /> Verified
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">ID Type</Label>
          <Select value={identityType} onValueChange={(v) => { setIdentityType(v); setVerificationStatus("idle"); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select ID type" />
            </SelectTrigger>
            <SelectContent>
              {ID_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">ID Number</Label>
          <div className="flex gap-2">
            <Input
              value={identityNumber}
              onChange={(e) => { setIdentityNumber(e.target.value); setVerificationStatus("idle"); }}
              placeholder={ID_TYPES.find((t) => t.value === identityType)?.pattern || "Enter ID number"}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVerify}
              disabled={verifying || !identityType || !identityNumber.trim()}
              className="shrink-0"
            >
              {verifying ? <Loader2 size={14} className="animate-spin" /> : "Verify"}
            </Button>
          </div>
          {verificationStatus === "invalid" && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={10} /> Verification failed. Please check and try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
