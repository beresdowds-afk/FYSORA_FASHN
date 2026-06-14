import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Crown, Search, RefreshCw, Building2, User, Scissors, Sparkles } from "lucide-react";

const EXEMPTION_TYPES = [
  { key: "registration", label: "Registration" },
  { key: "website_builder", label: "Website Builder (Lite)" },
  { key: "website_builder_pro", label: "Website Builder Pro" },
  { key: "mobile_app", label: "Mobile App" },
  { key: "custom_domain_external", label: "External Custom Domain" },
] as const;

type Subject = {
  id: string;
  label: string;
  type: "organization" | "designer" | "tailor" | "customer";
  meta?: string;
};

export default function FeeExemptionsPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"organization" | "designer" | "tailor" | "customer">("organization");
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [orgExemptions, setOrgExemptions] = useState<Record<string, Set<string>>>({});
  const [userExemptions, setUserExemptions] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    if (tab === "organization") {
      const { data: orgs } = await supabase.from("organizations")
        .select("id,name,business_reg_verified").eq("business_reg_verified", true)
        .order("name").limit(500);
      setSubjects((orgs ?? []).map(o => ({
        id: o.id, label: o.name, type: "organization",
        meta: o.name.toUpperCase().includes("GABULK FASHION STUDI") ? "Permanent" : undefined,
      })));
      const { data: ex } = await supabase.from("org_fee_exemptions")
        .select("org_id,exemption_type").eq("is_active", true);
      const map: Record<string, Set<string>> = {};
      for (const e of ex ?? []) {
        if (!map[e.org_id]) map[e.org_id] = new Set();
        map[e.org_id].add(e.exemption_type);
      }
      setOrgExemptions(map);
    } else {
      const role = tab;
      const { data: roleRows } = await supabase.from("user_roles" as any)
        .select("user_id").eq("role", role).limit(2000);
      const userIds = (roleRows as any[] ?? []).map(r => r.user_id);
      if (userIds.length === 0) { setSubjects([]); setLoading(false); return; }
      const { data: profs } = await supabase.from("profiles")
        .select("id,display_name").in("id", userIds);
      setSubjects((profs ?? []).map(p => ({
        id: p.id, label: p.display_name || "Unnamed", type: role,
      })));
      const { data: ex } = await supabase.from("user_fee_exemptions" as any)
        .select("user_id,exemption_type").eq("is_active", true).in("user_id", userIds);
      const map: Record<string, Set<string>> = {};
      for (const e of (ex as any[]) ?? []) {
        if (!map[e.user_id]) map[e.user_id] = new Set();
        map[e.user_id].add(e.exemption_type);
      }
      setUserExemptions(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase.channel("fee-exemptions-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "org_fee_exemptions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_fee_exemptions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  const toggle = async (subject: Subject, exType: string, next: boolean) => {
    // Optimistic UI update so the switch responds instantly to touch.
    const applyLocal = (granting: boolean) => {
      if (subject.type === "organization") {
        setOrgExemptions((m) => {
          const cur = new Set(m[subject.id] ?? []);
          if (granting) cur.add(exType); else cur.delete(exType);
          return { ...m, [subject.id]: cur };
        });
      } else {
        setUserExemptions((m) => {
          const cur = new Set(m[subject.id] ?? []);
          if (granting) cur.add(exType); else cur.delete(exType);
          return { ...m, [subject.id]: cur };
        });
      }
    };
    applyLocal(next);
    try {
      if (subject.type === "organization") {
        if (subject.meta === "Permanent" && !next) {
          applyLocal(true); // revert
          toast({ title: "Locked", description: "GABULK exemptions are permanent.", variant: "destructive" });
          return;
        }
        if (next) {
          await supabase.from("org_fee_exemptions").upsert({
            org_id: subject.id, exemption_type: exType,
            reason: "Granted via Fee Exemptions Portal", granted_by: "super_admin",
            is_active: true,
          } as any, { onConflict: "org_id,exemption_type" });
        } else {
          await supabase.from("org_fee_exemptions").update({ is_active: false } as any)
            .eq("org_id", subject.id).eq("exemption_type", exType);
        }
      } else {
        if (next) {
          await supabase.from("user_fee_exemptions" as any).upsert({
            user_id: subject.id, exemption_type: exType,
            reason: "Granted via Fee Exemptions Portal", granted_by: "super_admin",
            is_active: true,
          } as any, { onConflict: "user_id,exemption_type" });
        } else {
          await supabase.from("user_fee_exemptions" as any).update({ is_active: false } as any)
            .eq("user_id", subject.id).eq("exemption_type", exType);
        }
      }
      toast({ title: next ? "Exemption granted" : "Exemption revoked" });
    } catch (e: any) {
      applyLocal(!next); // revert on error
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const runWorker = async (name: string) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke(name);
      if (error) throw error;
      toast({ title: `${name} done`, description: JSON.stringify(data) });
    } catch (e: any) {
      toast({ title: "Worker failed", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subjects.filter(s => s.label.toLowerCase().includes(q)) : subjects;
  }, [search, subjects]);

  const getEx = (s: Subject) =>
    s.type === "organization" ? (orgExemptions[s.id] ?? new Set()) : (userExemptions[s.id] ?? new Set());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">Website Builder Fee Exemptions</h2>
          <p className="text-sm text-muted-foreground">
            Grant complimentary access to verified accounts. GABULK FASHION STUDIO exemptions are permanent.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={running}
            onClick={() => runWorker("fee-exemption-enforcer")}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} /> Enforce now
          </Button>
          <Button size="sm" variant="outline" disabled={running}
            onClick={() => runWorker("exemption-invoice-generator")}>
            <Sparkles className="h-4 w-4 mr-2" /> Generate invoices
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="organization"><Building2 className="h-4 w-4 mr-1" />Organizations</TabsTrigger>
          <TabsTrigger value="designer"><Sparkles className="h-4 w-4 mr-1" />Designers</TabsTrigger>
          <TabsTrigger value="tailor"><Scissors className="h-4 w-4 mr-1" />Tailors</TabsTrigger>
          <TabsTrigger value="customer"><User className="h-4 w-4 mr-1" />Customers</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{filtered.length} {tab}s</span>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…" className="pl-7 h-8" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-4">Name</th>
                        {EXEMPTION_TYPES.map(t => (
                          <th key={t.key} className="py-2 px-2 text-center">{t.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map(s => {
                        const ex = getEx(s);
                        return (
                          <tr key={s.id}>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{s.label}</span>
                                {s.meta && <Badge variant="default" className="text-[10px]"><Crown className="h-3 w-3 mr-1" />{s.meta}</Badge>}
                              </div>
                            </td>
                            {EXEMPTION_TYPES.map(t => (
                              <td key={t.key} className="py-2 px-2 text-center">
                                <Switch
                                  checked={ex.has(t.key)}
                                  onCheckedChange={(v) => toggle(s, t.key, v)}
                                  disabled={s.meta === "Permanent"}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr><td colSpan={EXEMPTION_TYPES.length + 1} className="py-8 text-center text-muted-foreground">No verified {tab}s yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}