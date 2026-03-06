import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import type { AppRole } from "@/hooks/useOrganization";

const identityTypes = [
  { value: "nin", label: "NIN (Nigeria)", hint: "11-digit number" },
  { value: "bvn", label: "BVN (Nigeria)", hint: "11-digit number" },
  { value: "ghana_card", label: "Ghana Card", hint: "GHA-XXXXXXXXX-X" },
  { value: "kenyan_id", label: "Kenyan National ID", hint: "7-8 digit number" },
  { value: "sa_id", label: "SA ID Number", hint: "13-digit number" },
  { value: "passport", label: "Passport", hint: "6-12 characters" },
  { value: "national_id", label: "Other National ID", hint: "6-20 characters" },
];

interface InviteMemberDialogProps {
  orgId: string;
  onInvited: () => void;
  children: React.ReactNode;
}

const InviteMemberDialog = ({ orgId, onInvited, children }: InviteMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("tailor");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Identity verification for tailors
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idVerifyStatus, setIdVerifyStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");

  const isTailor = role === "tailor";

  const handleVerifyIdentity = async (profileId: string) => {
    if (!idNumber.trim() || !idType) return false;
    setIdVerifyStatus("verifying");

    try {
      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: {
          type: idType,
          number: idNumber.trim(),
          entity_type: "profile",
          entity_id: profileId,
        },
      });

      if (error || data?.status !== "verified") {
        setIdVerifyStatus("failed");
        toast({
          title: "Identity verification failed",
          description: data?.message || "Invalid identity number format.",
          variant: "destructive",
        });
        return false;
      }

      setIdVerifyStatus("verified");
      return true;
    } catch {
      setIdVerifyStatus("failed");
      return false;
    }
  };

  const handlePreVerify = async () => {
    if (!idNumber.trim() || !idType) return;
    setIdVerifyStatus("verifying");

    // Pre-verify format without a real profile ID
    try {
      const { data } = await supabase.functions.invoke("verify-identity", {
        body: {
          type: idType,
          number: idNumber.trim(),
          entity_type: "profile",
          entity_id: "00000000-0000-0000-0000-000000000000",
        },
      });

      if (data?.status === "verified") {
        setIdVerifyStatus("verified");
        toast({ title: "Identity format verified!" });
      } else {
        setIdVerifyStatus("failed");
        toast({ title: "Invalid format", description: data?.message, variant: "destructive" });
      }
    } catch {
      setIdVerifyStatus("failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    // Require identity verification for tailors
    if (isTailor && idVerifyStatus !== "verified") {
      toast({ title: "Identity verification required", description: "Tailors must have a verified identity number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const { data: allMembers } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name");

    const matchedProfile = profiles?.find(
      (p) => p.display_name?.toLowerCase().trim() === trimmedEmail
    );

    if (!matchedProfile) {
      toast({
        title: "User not found",
        description: "This email is not registered. They need to sign up first.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const existingMember = allMembers?.find((m) => m.user_id === matchedProfile.id);
    if (existingMember) {
      toast({ title: "Already a member", description: "This user is already in your organization.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // If tailor, verify identity against the real profile
    if (isTailor) {
      const verified = await handleVerifyIdentity(matchedProfile.id);
      if (!verified) {
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from("org_members").insert({
      org_id: orgId,
      user_id: matchedProfile.id,
      role,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error inviting member", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member added successfully!" });
      setOpen(false);
      setEmail("");
      setRole("tailor");
      setIdType("");
      setIdNumber("");
      setIdVerifyStatus("idle");
      onInvited();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Invite Team Member</DialogTitle>
          <DialogDescription>Add a registered user to your organization by their email.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(val) => { setRole(val as AppRole); setIdVerifyStatus("idle"); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="tailor">Tailor</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Identity Verification for Tailors */}
          {isTailor && (
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                <Label className="text-xs font-semibold">Identity Verification</Label>
                <Badge variant="outline" className="text-[9px]">Required for Tailors</Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">ID Type</Label>
                <Select value={idType} onValueChange={(v) => { setIdType(v); setIdVerifyStatus("idle"); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    {identityTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">ID Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={idNumber}
                    onChange={(e) => { setIdNumber(e.target.value); setIdVerifyStatus("idle"); }}
                    placeholder={identityTypes.find(t => t.value === idType)?.hint || "Enter ID number"}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreVerify}
                    disabled={!idType || !idNumber.trim() || idVerifyStatus === "verifying"}
                  >
                    {idVerifyStatus === "verifying" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : "Verify"}
                  </Button>
                </div>
                {idVerifyStatus === "verified" && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Identity format verified
                  </p>
                )}
                {idVerifyStatus === "failed" && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle size={12} /> Invalid — check format and try again
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" type="submit" disabled={submitting || (isTailor && idVerifyStatus !== "verified")}>
              {submitting ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
