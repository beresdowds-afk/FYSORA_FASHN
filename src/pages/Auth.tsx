import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, Shield, Users, Scissors, Building2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DisclaimerDialog, { DisclaimerBanner } from "@/components/shared/DisclaimerDialog";

type AuthMode = "signin" | "signup" | "forgot";
type UserRole = "customer" | "tailor" | "organization";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: any; heading: string; sub: string; color: string }> = {
  customer: {
    label: "Customer",
    icon: Users,
    heading: "Join as a Customer",
    sub: "Browse fashion houses, place orders & access AI tools",
    color: "bg-secondary/15 text-secondary",
  },
  tailor: {
    label: "Tailor",
    icon: Scissors,
    heading: "Register as a Tailor",
    sub: "Manage orders, use AI measurements & grow your craft",
    color: "bg-primary/15 text-primary",
  },
  organization: {
    label: "Organization",
    icon: Building2,
    heading: "Create an Organization",
    sub: "Full dashboard, team management & business analytics",
    color: "bg-accent/15 text-accent-foreground",
  },
};

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

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPortal = searchParams.get("portal") === "1";
  const roleParam = searchParams.get("role") as UserRole | null;
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>(roleParam && ROLE_CONFIG[roleParam] ? roleParam : "customer");

  // Identity verification fields (for customer & tailor)
  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  // Manager org selection
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [managerOrgs, setManagerOrgs] = useState<{ org_id: string; org_name: string; role: string }[]>([]);
  const [selectingOrg, setSelectingOrg] = useState(false);

  useEffect(() => {
    if (roleParam && ROLE_CONFIG[roleParam as UserRole]) {
      setSelectedRole(roleParam as UserRole);
      if (mode === "signin") setMode("signup");
    }
  }, [roleParam]);

  const handleVerifyIdentity = async () => {
    if (!identityNumber.trim() || !identityType) return;
    setVerifying(true);
    setVerificationStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: { id_type: identityType, id_number: identityNumber.trim(), country: "auto" },
      });

      if (error || !data?.valid) {
        setVerificationStatus("invalid");
        toast({ title: "Verification failed", description: data?.message || "Could not verify identity number.", variant: "destructive" });
      } else {
        setVerificationStatus("valid");
        toast({ title: "Identity verified", description: "Your identity number has been validated." });
      }
    } catch {
      setVerificationStatus("invalid");
      toast({ title: "Verification error", description: "Please check your details and try again.", variant: "destructive" });
    }
    setVerifying(false);
  };

  const requiresIdentity = selectedRole === "customer" || selectedRole === "tailor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup" && !termsAccepted) {
      toast({ title: "Please accept the platform terms", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (mode === "signup" && requiresIdentity && verificationStatus !== "valid") {
      toast({ title: "Identity verification required", description: "Please verify your identity number before registering.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reset link sent", description: "Check your email for a password reset link." });
        setMode("signin");
      }
      return;
    }

    const { error } = mode === "signup"
      ? await signUp(email, password, displayName)
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (mode === "signup") {
      // Save identity info to profile after signup
      if (requiresIdentity && identityType && identityNumber) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from("profiles").update({
            identity_type: identityType,
            identity_number: identityNumber.trim(),
            identity_verified: true,
            identity_verified_at: new Date().toISOString(),
          } as any).eq("id", userData.user.id);
        }
      }

      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to verify your account.",
      });

      // Redirect organization role to create org page
      if (selectedRole === "organization") {
        toast({ description: "After verifying your email, sign in and create your organization." });
      }
    } else {
      // Sign in — check memberships for managers/admins with multiple orgs
      const userId = (await supabase.auth.getUser()).data.user?.id || "";

      const { data: memberships } = await supabase
        .from("org_members")
        .select("org_id, role, organizations(name)")
        .eq("user_id", userId)
        .eq("is_active", true);

      const activeMemberships = (memberships || []).map((m: any) => ({
        org_id: m.org_id,
        org_name: m.organizations?.name || "Unknown",
        role: m.role,
      }));

      // If user is a tailor with only tailor roles, go to tailor dashboard
      const onlyTailor = activeMemberships.length > 0 && activeMemberships.every((m: any) => m.role === "tailor");
      if (onlyTailor) {
        navigate("/tailor-dashboard");
        return;
      }

      // If manager/admin belongs to multiple orgs, show picker
      const adminOrManagerOrgs = activeMemberships.filter(
        (m: any) => m.role === "org_admin" || m.role === "manager"
      );

      if (adminOrManagerOrgs.length > 1) {
        setManagerOrgs(adminOrManagerOrgs);
        setShowOrgPicker(true);
        return;
      }

      // Single org or no org — set current and navigate
      if (activeMemberships.length > 0) {
        await supabase.from("profiles").update({ current_org_id: activeMemberships[0].org_id }).eq("id", userId);
      }

      navigate(isPortal ? "/portal" : "/dashboard");
    }
  };

  const handleOrgSelect = async (orgId: string) => {
    setSelectingOrg(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from("profiles").update({ current_org_id: orgId }).eq("id", userData.user.id);
    }
    setShowOrgPicker(false);
    setSelectingOrg(false);
    navigate(isPortal ? "/portal" : "/dashboard");
  };

  const roleConfig = ROLE_CONFIG[selectedRole];
  const RoleIcon = roleConfig.icon;

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    signin: { heading: "Welcome back", sub: "Sign in to manage your fashion business" },
    signup: { heading: roleConfig.heading, sub: roleConfig.sub },
    forgot: { heading: "Reset password", sub: "We'll send a reset link to your email" },
  };

  return (
    <div className="min-h-screen bg-ebony flex items-center justify-center px-4 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <a
          href="/"
          className="inline-flex items-center gap-2 text-ivory/50 hover:text-primary text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to home
        </a>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <span className="font-heading font-bold text-lg">Fashion Stitches Africa</span>
          </div>

          <h1 className="font-heading font-bold text-2xl mt-4 mb-1">
            {titles[mode].heading}
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            {titles[mode].sub}
          </p>

          {/* Role selector for signup */}
          {mode === "signup" && (
            <div className="flex gap-2 mb-6">
              {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => { setSelectedRole(role); setVerificationStatus("idle"); }}
                    className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-muted/30 hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon size={18} className={`mx-auto mb-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">
                  {selectedRole === "organization" ? "Organization Admin Name" : "Full Name"}
                </Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={selectedRole === "organization" ? "Admin's full name" : "Your full name"}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Identity Verification for Customer & Tailor signup */}
            {mode === "signup" && requiresIdentity && (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-primary" />
                  <span className="text-sm font-medium">Identity Verification</span>
                  {verificationStatus === "valid" && (
                    <Badge className="bg-secondary/15 text-secondary text-[10px] ml-auto">
                      <CheckCircle2 size={10} className="mr-1" /> Verified
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id-type" className="text-xs">ID Type</Label>
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
                  <Label htmlFor="id-number" className="text-xs">ID Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="id-number"
                      value={identityNumber}
                      onChange={(e) => { setIdentityNumber(e.target.value); setVerificationStatus("idle"); }}
                      placeholder={ID_TYPES.find((t) => t.value === identityType)?.pattern || "Enter ID number"}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyIdentity}
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
            )}

            {mode === "signup" && (
              <div className="space-y-3">
                <DisclaimerBanner compact />
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(c) => setTermsAccepted(!!c)}
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                    I acknowledge that Fashion Stitches Africa is a neutral platform and does not guarantee the quality of services provided by Organizations or Tailors.{" "}
                    <button type="button" onClick={() => setShowDisclaimer(true)} className="text-primary hover:underline">
                      Read full terms
                    </button>
                  </label>
                </div>
              </div>
            )}

            <Button
              variant="hero"
              className="w-full"
              type="submit"
              disabled={loading || (mode === "signup" && !termsAccepted) || (mode === "signup" && requiresIdentity && verificationStatus !== "valid")}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  {mode === "forgot" ? "Sending..." : mode === "signup" ? "Creating..." : "Signing in..."}
                </span>
              ) : mode === "forgot" ? "Send Reset Link" : mode === "signup" ? (
                selectedRole === "organization" ? "Create Account & Set Up Org" : "Create Account"
              ) : "Sign In"}
            </Button>
          </form>

          <DisclaimerDialog
            open={showDisclaimer}
            onOpenChange={setShowDisclaimer}
            disclaimerType="intermediary_caveat"
            context="registration"
            onAcknowledged={() => setTermsAccepted(true)}
          />

          <div className="mt-6 text-center space-y-2">
            {mode === "forgot" ? (
              <button
                onClick={() => setMode("signin")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
