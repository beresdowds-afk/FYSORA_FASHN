import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Shield, Crown, Users } from "lucide-react";

const ROLES = [
  "super_admin", "super_assistant", "org_admin", "manager",
  "designer", "tailor", "customer",
] as const;

type RoleRow = { id?: string; feature_key: string; role: string; is_allowed: boolean; quota: number | null };
type PlanRow = { id?: string; feature_key: string; plan_key: string; is_allowed: boolean; quota: number | null };

export default function FeatureAccessMatrix() {
  const { toast } = useToast();
  const { flags, isLoading } = useFeatureFlags();
  const [roleRows, setRoleRows] = useState<RoleRow[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [plans, setPlans] = useState<{ plan_key: string; name: string }[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [r, p, sp] = await Promise.all([
      (supabase as any).from("feature_role_access").select("*"),
      (supabase as any).from("feature_plan_access").select("*"),
      (supabase as any).from("subscription_plans").select("plan_key, name").order("name"),
    ]);
    setRoleRows((r.data as RoleRow[]) || []);
    setPlanRows((p.data as PlanRow[]) || []);
    setPlans((sp.data as any[]) || []);
  };
  useEffect(() => { load(); }, []);

  const getRole = (fk: string, role: string) =>
    roleRows.find((r) => r.feature_key === fk && r.role === role);
  const getPlan = (fk: string, pk: string) =>
    planRows.find((r) => r.feature_key === fk && r.plan_key === pk);

  const toggleRole = async (fk: string, role: string, next: boolean) => {
    const { error } = await (supabase as any).from("feature_role_access").upsert(
      { feature_key: fk, role, is_allowed: next } as any,
      { onConflict: "feature_key,role" }
    );
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await load();
  };
  const setRoleQuota = async (fk: string, role: string, q: string) => {
    const quota = q.trim() === "" ? null : Number(q);
    const { error } = await (supabase as any).from("feature_role_access").upsert(
      { feature_key: fk, role, is_allowed: true, quota } as any,
      { onConflict: "feature_key,role" }
    );
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await load();
  };
  const togglePlan = async (fk: string, pk: string, next: boolean) => {
    const { error } = await (supabase as any).from("feature_plan_access").upsert(
      { feature_key: fk, plan_key: pk, is_allowed: next } as any,
      { onConflict: "feature_key,plan_key" }
    );
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await load();
  };
  const setPlanQuota = async (fk: string, pk: string, q: string) => {
    const quota = q.trim() === "" ? null : Number(q);
    const { error } = await (supabase as any).from("feature_plan_access").upsert(
      { feature_key: fk, plan_key: pk, is_allowed: true, quota } as any,
      { onConflict: "feature_key,plan_key" }
    );
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await load();
  };

  const filtered = flags.filter((f) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      f.feature_key.toLowerCase().includes(q) ||
      f.feature_name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    );
  });

  const QUOTA_FEATURES = new Set(["image_upload_quota"]);

  if (isLoading) return null;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" /> Role & Plan Access Matrix
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define which roles and subscription plans can use each platform feature.
          For quota-style features (e.g. <span className="font-mono">image_upload_quota</span>) you can set a numeric limit.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search features…"
          className="h-8 text-sm max-w-sm"
        />

        <Tabs defaultValue="roles">
          <TabsList>
            <TabsTrigger value="roles"><Users className="h-3 w-3 mr-1" /> By Role</TabsTrigger>
            <TabsTrigger value="plans"><Crown className="h-3 w-3 mr-1" /> By Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3 sticky left-0 bg-card">Feature</th>
                    {ROLES.map((r) => (
                      <th key={r} className="py-2 px-2 text-center capitalize">{r.replace("_", " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((f) => (
                    <tr key={f.id}>
                      <td className="py-2 pr-3 sticky left-0 bg-card">
                        <div className="font-medium">{f.feature_name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{f.feature_key}</div>
                      </td>
                      {ROLES.map((role) => {
                        const row = getRole(f.feature_key, role);
                        return (
                          <td key={role} className="py-2 px-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Switch
                                checked={row?.is_allowed ?? false}
                                onCheckedChange={(v) => toggleRole(f.feature_key, role, v)}
                              />
                              {QUOTA_FEATURES.has(f.feature_key) && row?.is_allowed && (
                                <Input
                                  type="number"
                                  defaultValue={row?.quota ?? ""}
                                  onBlur={(e) => setRoleQuota(f.feature_key, role, e.target.value)}
                                  className="h-6 w-16 text-[11px] text-center"
                                  placeholder="qty"
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="plans" className="mt-3">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscription plans defined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3 sticky left-0 bg-card">Feature</th>
                      {plans.map((p) => (
                        <th key={p.plan_key} className="py-2 px-2 text-center">
                          {p.name}
                          <Badge variant="outline" className="ml-1 text-[9px] font-mono">{p.plan_key}</Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2 pr-3 sticky left-0 bg-card">
                          <div className="font-medium">{f.feature_name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{f.feature_key}</div>
                        </td>
                        {plans.map((p) => {
                          const row = getPlan(f.feature_key, p.plan_key);
                          return (
                            <td key={p.plan_key} className="py-2 px-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Switch
                                  checked={row?.is_allowed ?? false}
                                  onCheckedChange={(v) => togglePlan(f.feature_key, p.plan_key, v)}
                                />
                                {QUOTA_FEATURES.has(f.feature_key) && row?.is_allowed && (
                                  <Input
                                    type="number"
                                    defaultValue={row?.quota ?? ""}
                                    onBlur={(e) => setPlanQuota(f.feature_key, p.plan_key, e.target.value)}
                                    className="h-6 w-16 text-[11px] text-center"
                                    placeholder="qty"
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}