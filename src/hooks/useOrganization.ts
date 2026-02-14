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

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug, country, currency })
      .select()
      .single();

    if (orgError) return { error: orgError };

    // Add creator as org_admin
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({ org_id: org.id, user_id: user.id, role: "org_admin" as AppRole });

    if (memberError) return { error: memberError };

    // Set as current org
    await supabase
      .from("profiles")
      .update({ current_org_id: org.id })
      .eq("id", user.id);

    await fetchOrgs();
    return { data: org, error: null };
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

      // Get profile's current org
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.current_org_id) { setLoading(false); return; }

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.current_org_id)
        .single();

      setCurrentOrg(org);

      // Get role
      const { data: member } = await supabase
        .from("org_members")
        .select("role")
        .eq("org_id", profile.current_org_id)
        .eq("user_id", user.id)
        .single();

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
      .select("*, profiles:user_id(display_name, avatar_url)")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });

    setMembers(
      (data || []).map((m: any) => ({
        ...m,
        profile: m.profiles,
      }))
    );
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin");
      setIsSuperAdmin((data?.length ?? 0) > 0);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { isSuperAdmin, loading };
};
