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
import { CheckCircle2, Loader2, Rocket, EyeOff, AlertTriangle, History, Eye, Undo2, Copy } from "lucide-react";
import { getTemplateList, type WebsiteTemplate } from "@/config/websiteTemplates";
import { useCustomWebsiteTemplates, rowToTemplate } from "@/hooks/useCustomWebsiteTemplates";
import WebsiteTemplatePicker from "./WebsiteTemplatePicker";
import SegmentRulesPanel from "./SegmentRulesPanel";
import { checkTemplateCompatibility, type CompatIssue, type WebsiteState } from "@/lib/templateCompatibility";

interface Props {
  org: { id: string; name: string };
}

type Consequence = { label: string; severity: "info" | "warning" | "breaking" };

export function diffTemplates(prev: WebsiteTemplate | null, next: WebsiteTemplate): Consequence[] {
  if (!prev) return [{ label: `Initial template "${next.name}" will be published.`, severity: "info" }];
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
  if (prev.design.cardStyle !== next.design.cardStyle) out.push({ label: `Catalogue card style: ${prev.design.cardStyle} → ${next.design.cardStyle}`, severity: "info" });
  if (prev.design.hoverEffect !== next.design.hoverEffect) out.push({ label: `Hover effect: ${prev.design.hoverEffect} → ${next.design.hoverEffect}`, severity: "info" });
  if (prev.design.animationStyle !== next.design.animationStyle) out.push({ label: `Animation style: ${prev.design.animationStyle} → ${next.design.animationStyle}`, severity: "info" });
  if (prev.design.imageAspect !== next.design.imageAspect) out.push({ label: `Product image aspect: ${prev.design.imageAspect} → ${next.design.imageAspect} (existing photos may need re-cropping)`, severity: "warning" });
  if (prev.category !== next.category) out.push({ label: `Template category changes: ${prev.category} → ${next.category} — overall mood and brand feel will shift`, severity: "warning" });
  out.push({ label: `Site must be re-published to reflect the new template on the live URL.`, severity: "info" });
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
  const [history, setHistory] = useState<any[]>([]);
  const [stagingRow, setStagingRow] = useState<any>(null);
  const [stagingBusy, setStagingBusy] = useState(false);
  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: site }, { data: ev }, { data: hist }, { data: stage }] = await Promise.all([
      supabase.from("org_websites").select("*").eq("org_id", org.id).maybeSingle(),
      supabase.from("org_website_template_events").select("*").eq("org_id", org.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("org_template_publish_history").select("*").eq("org_id", org.id).order("published_at", { ascending: false }).limit(10),
      supabase.from("org_template_staging").select("*").eq("org_id", org.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSiteRow(site);
    setEvents(ev || []);
    setHistory(hist || []);
    setStagingRow(stage || null);
    setCandidateId((site as any)?.selected_template_id ?? (site as any)?.published_template_id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [org.id]);

  const findById = (id: string | null) => all.find(t => t.id === id) || null;
  const published = findById((siteRow as any)?.published_template_id ?? null);
  const candidate = findById(candidateId);

  // Build website state hints from siteRow for the compatibility checker
  const websiteState: WebsiteState = useMemo(() => ({
    hero_image_url: (siteRow as any)?.hero_image_url ?? null,
    logo_url: (siteRow as any)?.logo_url ?? null,
    gallery_count: (siteRow as any)?.gallery_count ?? 0,
    category_count: (siteRow as any)?.category_count ?? 0,
    cultural_story_text: (siteRow as any)?.cultural_story_text ?? null,
    has_officers: !!(siteRow as any)?.has_officers,
    has_featured_products: !!(siteRow as any)?.has_featured_products,
  }), [siteRow]);

  const report = useMemo(
    () => candidate ? checkTemplateCompatibility(published, candidate, websiteState) : null,
    [published, candidate, websiteState]
  );
  const consequences: Consequence[] = useMemo(() => {
    if (!report) return [];
    return report.issues.map((i: CompatIssue) => ({ label: i.message, severity: i.severity }));
  }, [report]);

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
      await supabase.from("org_template_publish_history").insert({
        org_id: org.id,
        template_key: candidate.id,
        published_by: user?.id ?? null,
        snapshot: { previous_template: published?.id ?? null, version: newVersion, compatibility_report: report?.issues ?? [] },
        note: "Published from template panel",
      });
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
    setAck(false);
    setConfirmOpen(true);
  };

  const saveStagingPreview = async () => {
    if (!candidate) return;
    try {
      setStagingBusy(true);
      const { data, error } = await supabase
        .from("org_template_staging")
        .insert({
          org_id: org.id,
          template_key: candidate.id,
          created_by: user?.id ?? null,
          compatibility_report: report ? (report.issues as any) : [],
        })
        .select("*")
        .single();
      if (error) throw error;
      setStagingRow(data);
      toast({
        title: "Preview staged for 72 hours",
        description: "Share the preview link with your team before promoting to live.",
      });
    } catch (e: any) {
      toast({ title: "Could not stage preview", description: e.message, variant: "destructive" });
    } finally {
      setStagingBusy(false);
    }
  };

  const promoteStaging = async () => {
    if (!stagingRow) return;
    try {
      setStagingBusy(true);
      const { error } = await supabase.rpc("promote_staging_template", { _staging_id: stagingRow.id });
      if (error) throw error;
      toast({ title: "Promoted to live", description: "The staged template is now your published website." });
      await load();
    } catch (e: any) {
      toast({ title: "Promote failed", description: e.message, variant: "destructive" });
    } finally {
      setStagingBusy(false);
    }
  };

  const discardStaging = async () => {
    if (!stagingRow) return;
    await supabase.from("org_template_staging").update({ status: "discarded" }).eq("id", stagingRow.id);
    setStagingRow(null);
    toast({ title: "Preview discarded" });
  };

  const runRollback = async () => {
    try {
      setRollbackBusy(true);
      const { data, error } = await supabase.rpc("rollback_org_template", { _org_id: org.id });
      if (error) throw error;
      const res = data as any;
      toast({ title: "Rolled back", description: `Restored "${res?.to ?? "previous template"}". Logged to audit trail.` });
      setRollbackConfirmOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "Rollback failed", description: e.message, variant: "destructive" });
    } finally {
      setRollbackBusy(false);
    }
  };

  const previewUrl = stagingRow ? `${window.location.origin}/preview/template/${stagingRow.preview_token}` : null;
  const copyPreview = async () => {
    if (!previewUrl) return;
    try { await navigator.clipboard.writeText(previewUrl); toast({ title: "Preview link copied" }); }
    catch { toast({ title: previewUrl }); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading template state…</div>;
  }

  const isPublished = !!(siteRow as any)?.is_published;
  const canRollback = history.length >= 2 || (history.length === 1 && history[0].template_key !== published?.id);

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
            <Button onClick={saveStagingPreview} disabled={!candidate || stagingBusy} variant="secondary">
              {stagingBusy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Eye size={14} className="mr-1" />}
              Save as preview (72h)
            </Button>
            <Button onClick={() => setRollbackConfirmOpen(true)} disabled={!canRollback || rollbackBusy} variant="outline">
              {rollbackBusy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Undo2 size={14} className="mr-1" />}
              Rollback to previous
            </Button>
            <Button onClick={runUnpublish} disabled={!isPublished || busy !== null} variant="ghost" className="sm:col-span-2">
              {busy === "unpublish" ? <Loader2 size={14} className="mr-1 animate-spin" /> : <EyeOff size={14} className="mr-1" />}
              Unpublish live site
            </Button>
          </div>
        </CardContent>
      </Card>

      {stagingRow && previewUrl && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-amber-500" />
              <h4 className="text-sm font-semibold">Active staging preview</h4>
              <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                expires {new Date(stagingRow.expires_at).toLocaleString()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              This preview is private and not visible to customers. You can promote it to live or discard it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-[11px] bg-muted px-2 py-1 rounded truncate max-w-full">{previewUrl}</code>
              <Button size="sm" variant="outline" onClick={copyPreview}><Copy size={12} className="mr-1" /> Copy</Button>
              <Button size="sm" variant="outline" onClick={() => window.open(previewUrl, "_blank")}>Open</Button>
              <Button size="sm" variant="hero" onClick={promoteStaging} disabled={stagingBusy}>
                {stagingBusy ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Rocket size={12} className="mr-1" />}
                Promote to live
              </Button>
              <Button size="sm" variant="ghost" onClick={discardStaging}>Discard</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <WebsiteTemplatePicker
        selectedTemplateId={candidateId ?? undefined}
        onSelect={(id) => {
          setCandidateId(id);
          const next = all.find((t) => t.id === id);
          if (next && published && next.id !== published.id) {
            const cons = diffTemplates(published, next);
            const breaking = cons.filter((c) => c.severity === "breaking").length;
            const warnings = cons.filter((c) => c.severity === "warning").length;
            toast({
              title: `“${next.name}” selected (draft)`,
              description:
                breaking || warnings
                  ? `${breaking} breaking · ${warnings} warning${warnings === 1 ? "" : "s"}. Review and confirm before applying or publishing.`
                  : "No breaking differences detected. Click Apply or Publish to confirm.",
            });
          }
        }}
      />

      <SegmentRulesPanel org={{ id: org.id }} />

      {candidate && candidate.id !== published?.id && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <h4 className="text-sm font-semibold">
                Compatibility report — {published?.name ?? "no template"} → {candidate.name}
              </h4>
              {report && (
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {report.breakingCount} breaking · {report.warningCount} warnings · {report.infoCount} info
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Automatic check ran before consent. These changes take effect only after you confirm.
            </p>
            <ul className="space-y-1.5 text-sm pt-1">
              {consequences.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-full ${
                      c.severity === "breaking"
                        ? "bg-destructive"
                        : c.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                  />
                  <span>
                    <span className="capitalize text-[10px] mr-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {c.severity}
                    </span>
                    {c.label}
                  </span>
                </li>
              ))}
              {consequences.length === 0 && (
                <li className="text-xs text-muted-foreground">No compatibility issues detected.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2"><History size={14} className="text-primary" /><h4 className="text-sm font-semibold">Publish history</h4></div>
            <ul className="text-xs space-y-1">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 border-b border-border/60 py-1">
                  <span className="font-medium">{findById(h.template_key)?.name ?? h.template_key}</span>
                  {h.was_rollback && <Badge variant="outline" className="text-[10px]">rollback</Badge>}
                  <span className="text-muted-foreground ml-auto">{new Date(h.published_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              {pendingAction === "publish" ? "Confirm publish" : "Confirm template change"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "publish"
                ? <>You are about to <strong>publish</strong> <strong>{candidate?.name}</strong> to your live site
                    {published ? <> (replacing <strong>{published.name}</strong>)</> : null}. Review the differences below before confirming.</>
                : <>Saving <strong>{candidate?.name}</strong> as the selected template
                    {published ? <> (currently published: <strong>{published.name}</strong>)</> : null}. The live site will not change until you publish.</>}
            </DialogDescription>
          </DialogHeader>
          {consequences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feature differences detected.</p>
          ) : (
          <ul className="space-y-1.5 text-sm max-h-64 overflow-auto pr-2">
            {consequences.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-full ${
                  c.severity === "breaking" ? "bg-destructive" : c.severity === "warning" ? "bg-amber-500" : "bg-primary"
                }`} />
                <span>
                  <span className="capitalize text-[10px] mr-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c.severity}</span>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
          )}
          <label className="flex items-center gap-2 text-xs pt-2">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} />
            I have reviewed the differences and want to {pendingAction === "publish" ? "publish this template now" : "save this selection"}.
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirmOpen(false); setAck(false); }}>Cancel</Button>
            <Button disabled={!ack || busy !== null} onClick={() => pendingAction === "publish" ? runPublish() : runApply()}>
              {pendingAction === "publish" ? "Publish now" : "Apply selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rollbackConfirmOpen} onOpenChange={setRollbackConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Undo2 size={16} /> Rollback to previous template</DialogTitle>
            <DialogDescription>
              This restores the most recently published template before the current one. The action is logged to the audit trail and can itself be undone by rolling back again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRollbackConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={runRollback} disabled={rollbackBusy}>
              {rollbackBusy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Undo2 size={14} className="mr-1" />}
              Confirm rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}