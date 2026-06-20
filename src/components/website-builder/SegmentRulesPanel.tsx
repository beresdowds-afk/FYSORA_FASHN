import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { getTemplateList, type WebsiteTemplate } from "@/config/websiteTemplates";
import { useCustomWebsiteTemplates, rowToTemplate } from "@/hooks/useCustomWebsiteTemplates";

interface Props {
  org: { id: string };
}

type SegmentType = "location" | "category" | "default";

interface Rule {
  id: string;
  template_key: string;
  segment_type: SegmentType;
  segment_value: string;
  priority: number;
  is_active: boolean;
}

export default function SegmentRulesPanel({ org }: Props) {
  const { user } = useAuth();
  const builtin = useMemo(() => getTemplateList(), []);
  const { rows } = useCustomWebsiteTemplates();
  const templates: WebsiteTemplate[] = useMemo(
    () => [...builtin, ...rows.filter((r) => r.is_active).map(rowToTemplate)],
    [builtin, rows]
  );

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [segmentType, setSegmentType] = useState<SegmentType>("location");
  const [segmentValue, setSegmentValue] = useState("");
  const [templateKey, setTemplateKey] = useState<string>(templates[0]?.id ?? "");
  const [priority, setPriority] = useState<number>(100);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_template_segment_rules")
      .select("*")
      .eq("org_id", org.id)
      .order("priority", { ascending: true });
    if (!error) setRules((data ?? []) as Rule[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [org.id]);

  const addRule = async () => {
    if (!templateKey) {
      toast({ title: "Pick a template", variant: "destructive" });
      return;
    }
    const value = segmentType === "default" ? "*" : segmentValue.trim();
    if (segmentType !== "default" && !value) {
      toast({ title: "Enter a segment value", description: segmentType === "location" ? "e.g. NG, US, GB" : "e.g. menswear", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("org_template_segment_rules").insert({
      org_id: org.id,
      template_key: templateKey,
      segment_type: segmentType,
      segment_value: value,
      priority,
      is_active: true,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not add rule", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Segment rule added", description: "Visitors matching this segment will see the chosen template." });
    setSegmentValue("");
    load();
  };

  const toggleActive = async (rule: Rule) => {
    await supabase.from("org_template_segment_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    load();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("org_template_segment_rules").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-primary" />
          <h4 className="text-sm font-semibold">Segment targeting</h4>
          <Badge variant="outline" className="text-[10px]">Optional</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Show different templates to different customer segments — for example a luxury template to UK visitors and a bold template to Nigerian visitors. Each segment change still requires your consent on the publishing panel.
        </p>

        <div className="grid sm:grid-cols-5 gap-2 items-end">
          <div className="sm:col-span-1">
            <label className="text-[11px] text-muted-foreground">Segment</label>
            <Select value={segmentType} onValueChange={(v) => setSegmentType(v as SegmentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="default">Default (fallback)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <label className="text-[11px] text-muted-foreground">
              {segmentType === "location" ? "Country code" : segmentType === "category" ? "Category slug" : "(auto)"}
            </label>
            <Input
              placeholder={segmentType === "location" ? "NG" : segmentType === "category" ? "menswear" : "*"}
              value={segmentType === "default" ? "*" : segmentValue}
              onChange={(e) => setSegmentValue(e.target.value)}
              disabled={segmentType === "default"}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] text-muted-foreground">Template</label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger><SelectValue placeholder="Pick template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <label className="text-[11px] text-muted-foreground">Priority</label>
            <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 100)} />
          </div>
        </div>
        <Button onClick={addRule} disabled={busy} size="sm">
          {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
          Add segment rule
        </Button>

        <div className="pt-2 border-t border-border/60">
          {loading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Loading rules…</div>
          ) : rules.length === 0 ? (
            <p className="text-xs text-muted-foreground">No segment rules yet. Visitors see your default published template.</p>
          ) : (
            <ul className="space-y-1.5">
              {rules.map((r) => {
                const tmpl = templates.find((t) => t.id === r.template_key);
                return (
                  <li key={r.id} className="flex items-center gap-2 text-xs border border-border/60 rounded px-2 py-1.5">
                    <Badge variant="outline" className="capitalize">{r.segment_type}</Badge>
                    <span className="font-mono">{r.segment_value}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{tmpl?.name ?? r.template_key}</span>
                    <span className="text-muted-foreground ml-auto">prio {r.priority}</span>
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                    <Button size="icon" variant="ghost" onClick={() => deleteRule(r.id)}><Trash2 size={12} /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}