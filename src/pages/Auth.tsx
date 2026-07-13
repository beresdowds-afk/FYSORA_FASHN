import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, Shield, Users, Scissors, Building2, Loader2, CheckCircle2, AlertCircle, Palette, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DisclaimerDialog, { DisclaimerBanner } from "@/components/shared/DisclaimerDialog";
import { prefetchPostLoginData, readPrefetchedData } from "@/lib/postLoginPrefetch";
import { verifyPasskeyForCurrentSession } from "@/lib/passkeyChallenge";
import { KeyRound } from "lucide-react";

type AuthMode = "signin" | "signup" | "forgot";
type UserRole = "customer" | "designer" | "tailor" | "organization";

/** Map UserRole to the database `app_role` enum value used in user_roles. */
const ROLE_TO_DB_ROLE: Record<UserRole, "customer" | "designer" | "tailor" | "org_admin"> = {
  customer: "customer",
  designer: "designer",
  tailor: "tailor",
  organization: "org_admin",
};

const ROLE_CONFIG: Record<UserRole, { label: string; icon: any; heading: string; sub: string; color: string }> = {
  customer: {
    label: "Customer",
    icon: Users,
    heading: "Join as a Customer",
    sub: "Browse catalogues, place orders & discover fashion houses — free!",
    color: "bg-secondary/15 text-secondary",
  },
  designer: {
    label: "Designer",
    icon: Palette,
    heading: "Register as a Designer",
    sub: "All tailor tools + your own website — $15/mo",
    color: "bg-primary/15 text-primary",
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
  const [passkeyStep, setPasskeyStep] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>(roleParam && ROLE_CONFIG[roleParam] ? roleParam : "customer");
  const [showPassword, setShowPassword] = useState(false);

  // Identity verification fields (for customer & tailor)
  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  // Optional referral code (customer / tailor / designer / organization)
  const [referralCode, setReferralCode] = useState("");

  // Manager org selection
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [managerOrgs, setManagerOrgs] = useState<{ org_id: string; org_name: string; role: string }[]>([]);
  const [selectingOrg, setSelectingOrg] = useState(false);

  // Post-OAuth role picker (Google sign-ins that have no user_roles row yet)
  const [showOAuthRolePicker, setShowOAuthRolePicker] = useState(false);
  const [oauthRolePicking, setOauthRolePicking] = useState(false);
  const [oauthSelectedRole, setOauthSelectedRole] = useState<UserRole>("customer");

  // After Google OAuth returns, ensure the user has a user_roles row.
  // If not, show the role-picker dialog.
  useEffect(() => {
    let cancelled = false;
    const checkPostOAuth = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user;
      if (!u || cancelled) return;
      // Only Google identities benefit from this — email/password signup runs assign_role inline.
      const isOAuth = (u.identities || []).some(i => i.provider !== "email");
      if (!isOAuth) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .limit(10);
      if (cancelled) return;
      const roleNames = (roles || []).map((r: any) => r.role as string);
      // Super admins / super assistants / platform management never need to
      // register or join an organization — route them straight to the admin panel.
      if (roleNames.some((r) => r === "super_admin" || r === "super_assistant" || r === "platform_management")) {
        toast({
          title: "Welcome, Super Admin",
          description: "Routing you to the Super Admin panel — no organization or registration required.",
        });
        navigate("/super-admin");
        return;
      }
      if (!roles || roles.length === 0) {
        setShowOAuthRolePicker(true);
      }
    };
    checkPostOAuth();
    return () => { cancelled = true; };
  }, [navigate]);

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

  const requiresIdentity = selectedRole === "tailor" || selectedRole === "designer";

  const checkLeakedPassword = async (pw: string): Promise<boolean> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pw);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const prefix = hashHex.slice(0, 5);
      const suffix = hashHex.slice(5);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) return false; // fail open
      const text = await res.text();
      return text.split("\n").some(line => line.startsWith(suffix));
    } catch {
      return false; // fail open on network errors
    }
  };

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

    if (mode === "signup") {
      const isLeaked = await checkLeakedPassword(password);
      if (isLeaked) {
        toast({ title: "Unsafe password", description: "This password has appeared in a data breach. Please choose a different password.", variant: "destructive" });
        setLoading(false);
        return;
      }
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
      // Persist the selected role into user_roles via the secure RPC.
      // (After email signup, the session is already established so auth.uid() works.)
      try {
        await supabase.rpc("assign_role", { _role: ROLE_TO_DB_ROLE[selectedRole] });
      } catch (e) {
        console.error("assign_role failed:", e);
      }

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

          // Persist optional referral code (best-effort; column is optional)
          if (referralCode.trim()) {
            await supabase.from("profiles")
              .update({ referral_code: referralCode.trim().toUpperCase() } as any)
              .eq("id", userData.user.id);
          }
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
      // Sign in — fast path: query memberships in parallel and route quickly.
      // Use the session we already have rather than another network call to /auth/v1/user.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || "";

      if (!userId) {
        navigate(isPortal ? "/portal" : "/dashboard");
        return;
      }

      // Enforce passkey second-factor if the profile opts in.
      const { data: prof } = await (supabase
        .from("profiles") as any)
        .select("passkey_second_factor_required")
        .eq("id", userId)
        .maybeSingle();
      if ((prof as any)?.passkey_second_factor_required) {
        setPasskeyStep(true);
        const result = await verifyPasskeyForCurrentSession();
        setPasskeyStep(false);
        if (result.ok === false) {
          // Give the user a recovery path with a backup code before signing them out.
          const useBackup = window.confirm(
            `${result.message}\n\nDo you want to use a one-time backup code to sign in instead? (Cancel = sign out)`
          );
          if (!useBackup) {
            await supabase.auth.signOut();
            toast({
              title: "Passkey required",
              description: result.message + " You've been signed out — please try again.",
              variant: "destructive",
            });
            return;
          }
          const code = window.prompt("Enter one of your backup codes (format XXXXX-XXXXX):") ?? "";
          if (!code.trim()) {
            await supabase.auth.signOut();
            toast({ title: "Sign-in cancelled", variant: "destructive" });
            return;
          }
          const { data: rec, error: recErr } = await supabase.functions.invoke("passkey-recovery", {
            body: { action: "redeem", code: code.trim() },
          });
          if (recErr || (rec as any)?.error) {
            await supabase.auth.signOut();
            toast({
              title: "Backup code rejected",
              description: (rec as any)?.error ?? recErr?.message ?? "Please try again.",
              variant: "destructive",
            });
            return;
          }
          toast({
            title: "Recovered with backup code",
            description: "Passkey 2FA has been disabled so you can get back in. Please enroll a new passkey in Account & Security.",
          });
        }
        else {
          toast({ title: "Passkey verified", description: "Second-factor confirmed." });
        }
      }

      // Use prefetched cache if available; otherwise fetch fresh.
      let prefetched = readPrefetchedData(userId);
      if (!prefetched) {
        prefetched = await prefetchPostLoginData(userId);
      }
      const activeMemberships = prefetched?.memberships ?? [];
      const platformRoles = prefetched?.platformRoles ?? [];

      // Privileged platform roles go straight to the Super Admin panel.
      if (platformRoles.length > 0) {
        toast({
          title: "Welcome, Super Admin",
          description: "Routing you to the Super Admin panel — no organization or registration required.",
        });
        navigate("/super-admin");
        return;
      }

      // Only tailor/designer memberships
      const onlyTailorOrDesigner = activeMemberships.length > 0 && activeMemberships.every((m: any) => m.role === "tailor" || m.role === "designer");
      if (onlyTailorOrDesigner) {
        const hasDesigner = activeMemberships.some((m: any) => m.role === "designer");
        navigate(hasDesigner ? "/designer-portal" : "/tailor-dashboard");
        return;
      }

      // Multiple admin/manager orgs → picker
      const adminOrManagerOrgs = activeMemberships.filter(
        (m: any) => m.role === "org_admin" || m.role === "manager"
      );
      if (adminOrManagerOrgs.length > 1) {
        setManagerOrgs(adminOrManagerOrgs);
        setShowOrgPicker(true);
        return;
      }

      // Navigate immediately; persist current_org_id in background (don't block UX).
      if (activeMemberships.length > 0) {
        void supabase.from("profiles").update({ current_org_id: activeMemberships[0].org_id }).eq("id", userId);
        navigate(isPortal ? "/portal" : "/dashboard");
        return;
      }

      // No memberships: route by the user's chosen global role so customers /
      // designers / tailors don't land on a blank /dashboard.
      switch (prefetched?.role) {
        case "customer":
          navigate("/portal");
          return;
        case "designer":
          navigate("/designer-portal");
          return;
        case "tailor":
          navigate("/tailor-dashboard");
          return;
        case "org_admin":
          navigate("/create-organization");
          return;
        case "manager":
          // Managers join orgs via invitation — they should never be creating one.
          toast({
            title: "No organization yet",
            description: "Ask your organization admin to invite you before signing in as a manager.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        default:
          navigate(isPortal ? "/portal" : "/dashboard");
          return;
      }
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
            <span className="font-heading font-bold text-lg">FYSORA FASHN (Fashion Stitches Africa)</span>
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
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
                <div className="space-y-2">
                  <Label htmlFor="referral" className="text-xs flex items-center gap-2">
                    Referral code <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="referral"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="e.g. FYS-ADAEZE"
                    maxLength={32}
                    autoComplete="off"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(c) => setTermsAccepted(!!c)}
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                    I acknowledge that FYSORA FASHN (Fashion Stitches Africa) is a neutral platform and does not guarantee the quality of services provided by Organizations or Tailors.{" "}
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

            {mode !== "forgot" && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            )}

            {mode !== "forgot" && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) {
                    toast({ title: "Google sign-in failed", description: String(error.message || error), variant: "destructive" });
                    setLoading(false);
                  }
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            )}

            {mode === "signin" && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 mt-2"
                disabled={loading || !email || !password}
                data-testid="signin-with-passkey"
                onClick={async () => {
                  setLoading(true);
                  const { error } = await signIn(email, password);
                  if (error) {
                    toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
                    setLoading(false);
                    return;
                  }
                  setPasskeyStep(true);
                  const result = await verifyPasskeyForCurrentSession();
                  setPasskeyStep(false);
                  setLoading(false);
                  if (result.ok === false) {
                    await supabase.auth.signOut();
                    toast({ title: "Passkey verification failed", description: result.message, variant: "destructive" });
                    return;
                  }
                  toast({ title: "Signed in with passkey" });
                  navigate(isPortal ? "/portal" : "/dashboard");
                }}
              >
                <KeyRound className="w-4 h-4" />
                {passkeyStep ? "Verifying passkey…" : "Sign in with passkey"}
              </Button>
            )}
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

      {/* Organization Picker for managers/admins with multiple orgs */}
      <Dialog open={showOrgPicker} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 size={20} className="text-primary" />
              Select Your Organization
            </DialogTitle>
            <DialogDescription>
              You manage multiple organizations. Choose which one to sign into.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {managerOrgs.map((org) => (
              <button
                key={org.org_id}
                onClick={() => handleOrgSelect(org.org_id)}
                disabled={selectingOrg}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{org.org_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{org.role === "org_admin" ? "Admin" : org.role}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {org.role === "org_admin" ? "Admin" : "Manager"}
                </Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-OAuth role picker (shown when a Google sign-in has no user_roles row yet) */}
      <Dialog open={showOAuthRolePicker} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Choose your account type</DialogTitle>
            <DialogDescription>
              Pick the role that best describes how you'll use FYSORA FASHN (Fashion Stitches Africa). You can adjust this later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => {
              const config = ROLE_CONFIG[r];
              const Icon = config.icon;
              const isSelected = oauthSelectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setOauthSelectedRole(r)}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-muted/30 hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon size={18} className={`mx-auto mb-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`block text-xs font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            variant="hero"
            disabled={oauthRolePicking}
            onClick={async () => {
              setOauthRolePicking(true);
              try {
                const dbRole = ROLE_TO_DB_ROLE[oauthSelectedRole];
                const { error } = await supabase.rpc("assign_role", { _role: dbRole });
                if (error) {
                  toast({ title: "Couldn't save role", description: error.message, variant: "destructive" });
                  setOauthRolePicking(false);
                  return;
                }
                setShowOAuthRolePicker(false);
                if (oauthSelectedRole === "designer") navigate("/designer-portal");
                else if (oauthSelectedRole === "tailor") navigate("/tailor-dashboard");
                else if (oauthSelectedRole === "organization") navigate("/create-organization");
                else navigate("/portal");
              } finally {
                setOauthRolePicking(false);
              }
            }}
          >
            {oauthRolePicking ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
