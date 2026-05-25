import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type Organization = Tables<"organizations">;
export type OrgMember = Tables<"org_members">;
export type AppRole = Enums<"app_role">;

export const useOrganizations = () => {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    setOrgs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrgs();
  }, [user]);

  const createOrg = async (name: string, slug: string, country = "NG", currency = "NGN") => {
    if (!user) return { error: new Error("Not authenticated") };

    // Use SECURITY DEFINER RPC so the row insert + read-back + membership creation
    // happen atomically and don't trip the SELECT RLS gap on the newly created row.
    const { data, error } = await supabase.rpc("create_organization_with_admin", {
      _name: name, _slug: slug, _country: country, _currency: currency,
    });
    if (error) return { error };
    await fetchOrgs();
    return { data: { id: (data as any)?.id, name, slug }, error: null };
  };

  return { orgs, loading, createOrg, refetch: fetchOrgs };
};

export const useCurrentOrg = () => {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setLoading(false); return; }

      // Use maybeSingle() so a brand-new user (no profile row yet, or no
      // current_org_id) doesn't leave loading stuck forever.
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_org_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.current_org_id) { setLoading(false); return; }

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.current_org_id)
        .maybeSingle();

      setCurrentOrg(org);

      const { data: member } = await supabase
        .from("org_members")
        .select("role")
        .eq("org_id", profile.current_org_id)
        .eq("user_id", user.id)
        .maybeSingle();

      setRole(member?.role ?? null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const switchOrg = async (orgId: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ current_org_id: orgId }).eq("id", user.id);
    window.location.reload();
  };

  return { currentOrg, role, loading, switchOrg };
};

export const useOrgMembers = (orgId: string | undefined) => {
  const [members, setMembers] = useState<(OrgMember & { profile?: { display_name: string | null; avatar_url: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!orgId) return;
    setLoading(true);

    const { data } = await supabase
      .from("org_members")
      .select("*")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setMembers(
        data.map((m) => ({
          ...m,
          profile: profileMap.get(m.user_id) || undefined,
        }))
      );
    } else {
      setMembers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [orgId]);

  const updateMemberRole = async (memberId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from("org_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (!error) await fetchMembers();
    return { error };
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("id", memberId);
    if (!error) await fetchMembers();
    return { error };
  };

  return { members, loading, updateMemberRole, removeMember, refetch: fetchMembers };
};

export const useUserGlobalRole = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSuperAssistant, setIsSuperAssistant] = useState(false);
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const rows = data || [];
      // platform_management inherits Super Admin access.
      setIsSuperAdmin(rows.some(r => r.role === "super_admin" || r.role === "platform_management"));
      setIsSuperAssistant(rows.some(r => r.role === "super_assistant"));
      // Pick the first non-privileged role as a routing hint for org-less users.
      const priv = new Set(["super_admin", "super_assistant", "platform_management"]);
      const primary = rows.find(r => !priv.has(r.role as string))?.role
        ?? rows[0]?.role
        ?? null;
      setPrimaryRole((primary as string | null) ?? null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { isSuperAdmin, isSuperAssistant, primaryRole, loading };
};
