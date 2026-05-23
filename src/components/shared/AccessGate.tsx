import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, Mail, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Blocks designers and organization admins from using the dashboard until
 * their business-registration verification is approved by FYSORA FASHN.
 * Customers and tailors are never gated by this component.
 */
const AccessGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { currentOrg } = useCurrentOrg();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("profiles").select("access_status").eq("id", user.id).maybeSingle(),
      currentOrg?.id
        ? supabase.from("organizations").select("id, name, business_reg_verification_status, verification_submitted_at, verification_notes").eq("id", currentOrg.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setProfile(p);
    setOrg(o);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id, currentOrg?.id]);

  if (loading) return <>{children}</>;

  const orgStatus = (org as any)?.business_reg_verification_status as string | undefined;
  const profileStatus = (profile as any)?.access_status as string | undefined;
  const gatedStatuses = new Set(["pending", "rejected", "info_requested"]);
  const orgGated = !!orgStatus && gatedStatuses.has(orgStatus);
  const profileGated = !!profileStatus && gatedStatuses.has(profileStatus);
  const gated = (orgGated || profileGated) && !!currentOrg?.id;
  const status = orgGated ? orgStatus : profileStatus;
  const titleByStatus: Record<string, string> = {
    pending: "Verification pending",
    rejected: "Verification rejected",
    info_requested: "More information needed",
  };
  const descByStatus: Record<string, string> = {
    pending: "Dashboard access unlocks as soon as our team approves your business registration.",
    rejected: "Your verification was not approved. Please review the notes below and contact support to resubmit.",
    info_requested: "Our team needs additional information before approving your account. See the notes below.",
  };
  const badgeText: Record<string, string> = {
    pending: "Pending review",
    rejected: "Rejected",
    info_requested: "Info requested",
  };

  if (!gated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="max-w-xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="text-primary" size={28} />
          </div>
          <CardTitle className="text-2xl">{titleByStatus[status || "pending"]}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Your account for <b>{(org as any)?.name ?? currentOrg?.name ?? "your organization"}</b> has been created.{" "}
            {descByStatus[status || "pending"]}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Clock size={14} /> Status</span>
              <Badge variant={status === "rejected" ? "destructive" : "outline"}>{badgeText[status || "pending"]}</Badge>
            </div>
            {(org as any)?.verification_submitted_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{new Date((org as any).verification_submitted_at).toLocaleString()}</span>
              </div>
            )}
            {(org as any)?.verification_notes && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2">{(org as any).verification_notes}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw size={14} className="mr-1" /> Check status
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Back to homepage</Button>
            <a
              href="mailto:hello@fs-africa.org.ng?subject=Verification%20update"
              className="inline-flex items-center text-xs text-primary hover:underline ml-auto"
            >
              <Mail size={12} className="mr-1" /> Contact support
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessGate;