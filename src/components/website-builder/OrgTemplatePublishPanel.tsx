import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Rocket, EyeOff, AlertTriangle, History } from "lucide-react";
import { getTemplateList, type WebsiteTemplate } from "@/config/websiteTemplates";
import { useCustomWebsiteTemplates, rowToTemplate } from "@/hooks/useCustomWebsiteTemplates";
import WebsiteTemplatePicker from "./WebsiteTemplatePicker";

interface Props {
  org: { id: string; name: string };
}

type Consequence = { label: string; severity: "info" | "warning" | "breaking" };

function diffTemplates(prev: WebsiteTemplate | null, next: WebsiteTemplate): Consequence[] {
  if (!prev) return [{ label: `Initial template "${next.name}" will be published`, severity: "info" }];
  if (prev.id === next.id) return [];
  const out: Consequence[] = [];
  if (prev.design.heroStyle !== next.design.heroStyle) out.push({ label: `Hero layout changes: ${prev.design.heroStyle} → ${next.design.heroStyle}`, severity: "warning" });
  if (prev.design.navStyle !== next.design.navStyle) out.push({ label: `Navigation style changes: ${prev.design.navStyle} → ${next.design.navStyle}`, severity: "info" });
  if (prev.design.gridColumns !== next.design.gridColumns) out.push({ label: `Catalogue grid: ${prev.design.gridColumns} → ${next.design.gridColumns} columns`, severity: "info" });
  if (prev.design.fontHeadingDefault !== next.design.fontHeadingDefault) out.push({ label: `Heading font: ${prev.design.fontHeadingDefault} → ${next.design.fontHeadingDefault}`, severity: "info" });
  if (prev.design.fontBodyDefault !== next.design.fontBodyDefault) out.push({ label: `Body font: ${prev.design.fontBodyDefault} → ${next.design.fontBodyDefault}`, severity: "info" });
  if (prev.design.bgBase !== next.design.bgBase) out.push({ label: `Background palette changes — re-check brand colors`, severity: "warning" });
  if (prev.design.showCulturalStory && !next.design.showCulturalStory) out.push({ label: `Cultural story section will be removed`, severity: "breaking" });
  if (prev.design.showSustainabilityBadge && !next.design.showSustainabilityBadge) out.push({ label: `Sustainability badge will be removed`, severity: "breaking" });
  if (prev.design.editorialDescriptions && !next.design.editorialDescriptions) out.push({ label: `Editorial product descriptions will be hidden`, severity: "breaking" });
  if (!prev.design.showCulturalStory && next.design.showCulturalStory) out.push({ label: `Cultural story section will appear (needs copy)`, severity: "warning" });
  out.push({ label: `Site must be re-published to reflect the new template on the live URL`, severity: "info" });
  return out;
}

export default function OrgTemplatePublishPanel({ org }: Props) {
  const { user } = useAuth();
  const builtin = useMemo(() => getTemplateList(), []);
  const { rows } = useCustomWebsiteTemplates();
  const all: WebsiteTemplate[] = useMemo(
    () => [...builtin, ...rows.filter(r => r.is_active).map(rowToTemplate)],
    [builtin, rows]
  );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "apply" | "publish" | "unpublish">(null);
  const [siteRow, setSiteRow] = useState<any>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [pendingAction, setPendingAction] = useState<"apply" | "publish">("apply");
  const [events, setEvents] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: site }, { data: ev }] = await Promise.all([
      supabase.from("org_websites").select("*").eq("org_id", org.id).maybeSingle(),
      supabase.from("org_website_template_events").select("*").eq("org_id", org.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setSiteRow(site);
    setEvents(ev || []);
    setCandidateId((site as any)?.selected_template_id ?? (site as any)?.published_template_id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [org.id]);

  const findById = (id: string | null) => all.find(t => t.id === id) || null;
  const published = findById((siteRow as any)?.published_template_id ?? null);
  const candidate = findById(candidateId);
  const consequences = useMemo(() => candidate ? diffTemplates(published, candidate) : [], [published, candidate]);
  const needsConsent = consequences.some(c => c.severity !== "info");

  const writeEvent = async (action: "select" | "apply" | "publish" | "unpublish" | "change", fromId: string | null, toId: string | null, cons: Consequence[]) => {
    await supabase.from("org_website_template_events").insert({
      org_id: org.id,
      actor_user_id: user?.id ?? null,
      action,
      from_template_id: fromId,
      to_template_id: toId,
      consequences: { items: cons },
      metadata: { user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null },
    });
  };

  const ensureSiteRow = async () => {
    if (siteRow) return siteRow;
    const { data, error } = await supabase.from("org_websites").insert({ org_id: org.id }).select("*").single();
    if (error) throw error;
    return data;
  };

  const runApply = async () => {
    if (!candidate) return;
    try {
      setBusy("apply");
      const row = await ensureSiteRow();
      const { error } = await supabase.from("org_websites").update({
        selected_template_id: candidate.id,
        last_template_change_by: user?.id ?? null,
      }).eq("id", row.id);
      if (error) throw error;
      await writeEvent("apply", published?.id ?? null, candidate.id, consequences);
      toast({ title: "Template applied", description: "Selection saved. Click Publish to push to your live site." });
      await load();
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); setConfirmOpen(false); setAck(false); }
  };

  const runPublish = async () => {
    if (!candidate) return;
    try {
      setBusy("publish");
      const row = await ensureSiteRow();
      const now = new Date().toISOString();
      const newVersion = ((siteRow as any)?.published_template_version ?? 0) + 1;
      const { error } = await supabase.from("org_websites").update({
        selected_template_id: candidate.id,
        published_template_id: candidate.id,
        published_template_version: newVersion,
        is_published: true,
        last_published_at: now,
        last_template_change_by: user?.id ?? null,
      }).eq("id", row.id);
      if (error) throw error;
      await writeEvent("publish", published?.id ?? null, candidate.id, consequences);
      toast({ title: "Template published", description: `Version ${newVersion} of "${candidate.name}" is now live.` });
      await load();
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); setConfirmOpen(false); setAck(false); }
  };

  const runUnpublish = async () => {
    if (!siteRow) return;
    try {
      setBusy("unpublish");
      const { error } = await supabase.from("org_websites").update({
        is_published: false,
        last_unpublished_at: new Date().toISOString(),
        last_template_change_by: user?.id ?? null,
      }).eq("id", siteRow.id);
      if (error) throw error;
      await writeEvent("unpublish", published?.id ?? null, published?.id ?? null, []);
      toast({ title: "Template unpublished", description: "Your live site is now hidden until you publish again." });
      await load();
    } catch (e: any) {
      toast({ title: "Unpublish failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const askConfirm = (action: "apply" | "publish") => {
    if (!candidate) return;
    setPendingAction(action);
    if (needsConsent) { setAck(false); setConfirmOpen(true); }
    else { action === "publish" ? runPublish() : runApply(); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading template state…</div>;
  }

  const isPublished = !!(siteRow as any)?.is_published;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-heading font-semibold text-base">Template Publishing</h3>
              <p className="text-xs text-muted-foreground">Org admins can change, publish or unpublish the website template without super-admin approval.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isPublished ? "default" : "outline"} className="gap-1">
                {isPublished ? <CheckCircle2 size={12} /> : <EyeOff size={12} />}
                {isPublished ? "Live" : "Unpublished"}
              </Badge>
              {published && <Badge variant="outline">Published: {published.name} v{(siteRow as any)?.published_template_version ?? 1}</Badge>}
              {(siteRow as any)?.selected_template_id && (siteRow as any)?.selected_template_id !== (siteRow as any)?.published_template_id && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/40">Pending: {findById((siteRow as any).selected_template_id)?.name ?? "Unknown"}</Badge>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-2">
            <Button onClick={() => askConfirm("apply")} disabled={!candidate || busy !== null || candidateId === (siteRow as any)?.selected_template_id} variant="outline">
              {busy === "apply" ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              Apply selection
            </Button>
            <Button onClick={() => askConfirm("publish")} disabled={!candidate || busy !== null} variant="hero">
              {busy === "publish" ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Rocket size={14} className="mr-1" />}
              Publish template
            </Button>
            <Button onClick={runUnpublish} disabled={!isPublished || busy !== null} variant="ghost" className="sm:col-span-2">
              {busy === "unpublish" ? <Loader2 size={14} className="mr-1 animate-spin" /> : <EyeOff size={14} className="mr-1" />}
              Unpublish live site
            </Button>
          </div>
        </CardContent>
      </Card>

      <WebsiteTemplatePicker
        selectedTemplateId={candidateId ?? undefined}
        onSelect={(id) => setCandidateId(id)}
      />

      {events.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2"><History size={14} className="text-primary" /><h4 className="text-sm font-semibold">Recent template activity</h4></div>
            <ul className="text-xs space-y-1">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 border-b border-border/60 py-1">
                  <span className="capitalize font-medium">{e.action}</span>
                  <span className="text-muted-foreground">{e.from_template_id ?? "—"} → {e.to_template_id ?? "—"}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!o) { setConfirmOpen(false); setAck(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Review consequences</DialogTitle>
            <DialogDescription>
              Switching from <strong>{published?.name ?? "no template"}</strong> to <strong>{candidate?.name}</strong> will cause the following:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 text-sm max-h-64 overflow-auto">
            {consequences.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-full ${
                  c.severity === "breaking" ? "bg-destructive" : c.severity === "warning" ? "bg-amber-500" : "bg-primary"
                }`} />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-xs pt-2">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} />
            I understand these changes and want to proceed.
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirmOpen(false); setAck(false); }}>Cancel</Button>
            <Button disabled={!ack || busy !== null} onClick={() => pendingAction === "publish" ? runPublish() : runApply()}>
              {pendingAction === "publish" ? "Publish now" : "Apply selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}