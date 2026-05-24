import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DollarSign, Layers, Users, Wrench } from "lucide-react";

interface SwitchRow {
  id: string;
  scope_type: "global" | "function" | "feature" | "user_type";
  scope_key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  updated_at: string;
}

const GROUP_META: Record<SwitchRow["scope_type"], { title: string; icon: any; tone: string }> = {
  global: { title: "Master", icon: DollarSign, tone: "text-primary" },
  function: { title: "By Function", icon: Wrench, tone: "text-blue-500" },
  feature: { title: "By Feature", icon: Layers, tone: "text-violet-500" },
  user_type: { title: "By User Type", icon: Users, tone: "text-emerald-500" },
};

export default function MonetizationSwitchesPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SwitchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monetization_switches" as any)
      .select("*")
      .order("scope_type", { ascending: true })
      .order("label", { ascending: true });
    if (error) {
      toast({ title: "Failed to load switches", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as unknown as SwitchRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (row: SwitchRow, next: boolean) => {
    setSaving(row.id);
    const { error } = await supabase
      .from("monetization_switches" as any)
      .update({ is_enabled: next, updated_at: new Date().toISOString() } as any)
      .eq("id", row.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_enabled: next } : r));
      toast({
        title: `${row.label} ${next ? "enabled" : "disabled"}`,
        description: row.scope_type === "global" && !next
          ? "All platform monetization is now suspended."
          : undefined,
      });
    }
    setSaving(null);
  };

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r => r.label.toLowerCase().includes(q) || r.scope_key.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q))
      : rows;
    return (["global","function","feature","user_type"] as const)
      .map(type => ({ type, items: filtered.filter(r => r.scope_type === type) }))
      .filter(g => g.items.length > 0);
  }, [rows, search]);

  const master = rows.find(r => r.scope_type === "global" && r.scope_key === "master");
  const totalEnabled = rows.filter(r => r.is_enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight">Monetization Master Switches</h2>
          <p className="text-sm text-muted-foreground">
            Globally activate or deactivate platform monetization, or scope it by function, feature or user type.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{totalEnabled}/{rows.length} active</Badge>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search switches…"
            className="w-56"
          />
        </div>
      </div>

      {master && !master.is_enabled && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">Master monetization is OFF</div>
            <div className="text-muted-foreground">
              All billing, fees and paid features are suspended platform-wide. Re-enable the Master switch to resume.
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {grouped.map(({ type, items }) => {
        const meta = GROUP_META[type];
        const Icon = meta.icon;
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className={`h-4 w-4 ${meta.tone}`} />
                {meta.title}
                <Badge variant="secondary" className="ml-2">{items.filter(i => i.is_enabled).length}/{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {items.map(row => (
                <div key={row.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.label}</span>
                      <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{row.scope_key}</code>
                      {!row.is_enabled && <Badge variant="destructive" className="text-[10px]">disabled</Badge>}
                    </div>
                    {row.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={row.is_enabled}
                    disabled={saving === row.id}
                    onCheckedChange={(v) => toggle(row, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}