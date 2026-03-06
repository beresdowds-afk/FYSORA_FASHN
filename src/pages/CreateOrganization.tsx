import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations, useUserGlobalRole } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Building2, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DisclaimerBanner } from "@/components/shared/DisclaimerDialog";
import { supabase } from "@/integrations/supabase/client";

const currencies = [
  { code: "NGN", label: "Nigerian Naira (₦)", country: "NG" },
  { code: "GHS", label: "Ghanaian Cedi (₵)", country: "GH" },
  { code: "KES", label: "Kenyan Shilling (KSh)", country: "KE" },
  { code: "ZAR", label: "South African Rand (R)", country: "ZA" },
  { code: "USD", label: "US Dollar ($)", country: "US" },
  { code: "GBP", label: "British Pound (£)", country: "GB" },
  { code: "EUR", label: "Euro (€)", country: "EU" },
];

const bizRegTypes: Record<string, { types: { value: string; label: string; hint: string }[] }> = {
  NG: {
    types: [
      { value: "cac", label: "CAC Registration", hint: "e.g. RC12345 or BN1234567" },
      { value: "tin", label: "Tax ID (TIN)", hint: "8-15 digit number" },
    ],
  },
  GH: {
    types: [
      { value: "ghana_rg", label: "Registrar General", hint: "e.g. CS123456" },
      { value: "tin", label: "Tax ID (TIN)", hint: "8-15 digit number" },
    ],
  },
  KE: {
    types: [
      { value: "kenya_brn", label: "Business Reg Number", hint: "e.g. PVT-12345" },
      { value: "tin", label: "KRA PIN", hint: "e.g. P051234567A" },
    ],
  },
  ZA: {
    types: [
      { value: "cipc", label: "CIPC Registration", hint: "e.g. 2024/123456/07" },
      { value: "tin", label: "Tax Number", hint: "10-digit number" },
    ],
  },
};

const CreateOrganization = () => {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [submitting, setSubmitting] = useState(false);
  const [orgTermsAccepted, setOrgTermsAccepted] = useState(false);
  const { createOrg } = useOrganizations();
  const { user } = useAuth();
  const { isSuperAdmin, isSuperAssistant } = useUserGlobalRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Business registration verification
  const [bizRegType, setBizRegType] = useState("");
  const [bizRegNumber, setBizRegNumber] = useState("");
  const [bizVerifyStatus, setBizVerifyStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const selectedCurrency = currencies.find((c) => c.code === currency);
  const countryCode = selectedCurrency?.country || "NG";
  const availableBizTypes = bizRegTypes[countryCode] || bizRegTypes.NG;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    if (!orgTermsAccepted) { toast({ title: "Please accept the intermediary terms", variant: "destructive" }); return; }
    if (!bizRegNumber.trim() || bizVerifyStatus !== "verified") {
      toast({ title: "Business registration verification required", description: "Please verify your business registration number before proceeding.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await createOrg(name, slug, selectedCurrency?.country || "NG", currency);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization created!", description: `${name} is ready to go.` });
      navigate("/dashboard");
    }
  };

  const handleVerifyBizReg = async () => {
    if (!bizRegNumber.trim() || !bizRegType) return;
    setBizVerifyStatus("verifying");

    try {
      // We'll verify after creating — for now do format check via edge function
      // Since org doesn't exist yet, we pass a placeholder and handle it post-creation
      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: {
          type: bizRegType,
          number: bizRegNumber.trim(),
          entity_type: "organization",
          entity_id: "00000000-0000-0000-0000-000000000000", // placeholder for pre-creation check
        },
      });

      if (error) {
        setBizVerifyStatus("failed");
        toast({ title: "Verification failed", description: "Could not verify business registration.", variant: "destructive" });
        return;
      }

      if (data?.status === "verified") {
        setBizVerifyStatus("verified");
        toast({ title: "Business registration verified!" });
      } else {
        setBizVerifyStatus("failed");
        toast({ title: "Verification failed", description: data?.message || "Invalid registration number format.", variant: "destructive" });
      }
    } catch {
      setBizVerifyStatus("failed");
      toast({ title: "Verification error", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {(isSuperAdmin || isSuperAssistant) && (
        <div className="absolute top-4 left-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")}>
            <ArrowLeft size={16} className="mr-1" /> Super Admin Panel
          </Button>
        </div>
      )}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center mb-6">
            <Building2 className="text-primary-foreground" size={28} />
          </div>

          <h1 className="font-heading font-bold text-2xl mb-1">Create Your Organization</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Set up your fashion business on Fashion Stitches Africa
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adaeze Couture"
                required
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  Your URL: <span className="text-primary">{slug}.fashionstitches.africa</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Primary Currency</Label>
              <Select value={currency} onValueChange={(v) => { setCurrency(v); setBizRegType(""); setBizVerifyStatus("idle"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Registration Verification */}
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <Label className="text-sm font-semibold">Business Registration Verification</Label>
                <Badge variant="outline" className="text-[10px]">Required</Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Registration Type</Label>
                <Select value={bizRegType} onValueChange={(v) => { setBizRegType(v); setBizVerifyStatus("idle"); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select registration type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBizTypes.types.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="generic">Other Registration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Registration Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={bizRegNumber}
                    onChange={(e) => { setBizRegNumber(e.target.value); setBizVerifyStatus("idle"); }}
                    placeholder={availableBizTypes.types.find(t => t.value === bizRegType)?.hint || "Enter registration number"}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyBizReg}
                    disabled={!bizRegType || !bizRegNumber.trim() || bizVerifyStatus === "verifying"}
                  >
                    {bizVerifyStatus === "verifying" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : "Verify"}
                  </Button>
                </div>
                {bizVerifyStatus === "verified" && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Verified successfully
                  </p>
                )}
                {bizVerifyStatus === "failed" && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle size={12} /> Verification failed — check format and try again
                  </p>
                )}
              </div>
            </div>

            <DisclaimerBanner compact />
            <div className="flex items-start gap-2">
              <Checkbox
                id="org-terms"
                checked={orgTermsAccepted}
                onCheckedChange={(c) => setOrgTermsAccepted(!!c)}
              />
              <label htmlFor="org-terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I understand that Fashion Stitches Africa is a neutral intermediary and does not guarantee the quality, integrity, or performance of any Organization, Tailor, or Customer on the platform. All parties operate independently.
              </label>
            </div>

            <Button variant="hero" className="w-full" type="submit" disabled={submitting || !orgTermsAccepted || bizVerifyStatus !== "verified"}>
              {submitting ? "Creating..." : "Create Organization"}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateOrganization;
