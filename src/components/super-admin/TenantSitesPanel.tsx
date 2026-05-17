import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Globe,
  Github,
  ExternalLink,
  RefreshCw,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TenantSite {
  org_id: string;
  org_name: string;
  org_slug: string;
  public_website_url: string;
  mode: string;
  hasGithubToken: boolean;
  repoOwner?: string;
  lastPublishedAt?: string;
}

const TenantSitesPanel = () => {
  const { toast } = useToast();
  const [sites, setSites] = useState<TenantSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingOrgId, setPublishingOrgId] = useState<string | null>(null);

  // Token-edit dialog state
  const [tokenOrg, setTokenOrg] = useState<TenantSite | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [ownerValue, setOwnerValue] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  const fetchSites = async () => {
    setLoading(true);
    const { data: sitesData } = await supabase
      .from("org_websites")
      .select("org_id, public_website_url, mode, organizations(id, name, slug)")
      .not("public_website_url", "is", null);

    const orgIds = (sitesData || [])
      .map((s: any) => s.org_id)
      .filter(Boolean);

    const { data: keysData } = orgIds.length
      ? await supabase
          .from("org_api_keys")
          .select("org_id, key_name, is_active")
          .in("org_id", orgIds)
          .eq("provider", "github")
      : { data: [] as any[] };

    const keyMap = new Map<string, { token: boolean; owner?: string }>();
    (keysData || []).forEach((k: any) => {
      const entry = keyMap.get(k.org_id) || { token: false };
      if (k.is_active && k.key_name === "fine_grained_token") entry.token = true;
      if (k.is_active && k.key_name === "repo_owner") entry.owner = "✓";
      keyMap.set(k.org_id, entry);
    });

    const mapped: TenantSite[] = (sitesData || [])
      .filter((s: any) => s.public_website_url && s.public_website_url.trim())
      .map((s: any) => ({
        org_id: s.org_id,
        org_name: s.organizations?.name || "Unknown",
        org_slug: s.organizations?.slug || "",
        public_website_url: s.public_website_url,
        mode: s.mode,
        hasGithubToken: keyMap.get(s.org_id)?.token || false,
        repoOwner: keyMap.get(s.org_id)?.owner,
      }))
      .sort((a, b) => a.org_name.localeCompare(b.org_name));

    setSites(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const openTokenDialog = async (site: TenantSite) => {
    setTokenOrg(site);
    setTokenValue("");
    setOwnerValue("");
    // Pre-fill owner if present
    const { data } = await supabase
      .from("org_api_keys")
      .select("key_name, key_value")
      .eq("org_id", site.org_id)
      .eq("provider", "github");
    const ownerRow = (data || []).find((r: any) => r.key_name === "repo_owner");
    if (ownerRow) setOwnerValue(ownerRow.key_value);
  };

  const saveToken = async () => {
    if (!tokenOrg) return;
    if (!tokenValue.trim() && !ownerValue.trim()) {
      toast({ title: "Nothing to save", variant: "destructive" });
      return;
    }
    setSavingToken(true);
    const rows: any[] = [];
    if (tokenValue.trim()) {
      rows.push({
        org_id: tokenOrg.org_id,
        provider: "github",
        key_name: "fine_grained_token",
        key_value: tokenValue.trim(),
        is_active: true,
      });
    }
    if (ownerValue.trim()) {
      rows.push({
        org_id: tokenOrg.org_id,
        provider: "github",
        key_name: "repo_owner",
        key_value: ownerValue.trim(),
        is_active: true,
      });
    }
    const { error } = await supabase
      .from("org_api_keys")
      .upsert(rows, { onConflict: "org_id,provider,key_name" });
    setSavingToken(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "GitHub credentials saved", description: `${tokenOrg.org_name} can now auto-push directly to GitHub.` });
      setTokenOrg(null);
      fetchSites();
    }
  };

  const triggerPublish = async (site: TenantSite) => {
    setPublishingOrgId(site.org_id);
    try {
      // Broadcast a settings_updated event on this org's sync channel; the
      // org dashboard's WebsiteBuilderTab debouncer will pick it up and push,
      // OR call the edge function directly here as a forced re-publish.
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      // Minimal direct trigger via realtime broadcast — the org admin's
      // dashboard auto-publishes; also try a direct edge function ping with
      // a stub README touch so the site refreshes if no admin is online.
      const channel = supabase.channel(`org-sync-${site.org_id}`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "fsa-sync",
        payload: {
          type: "FSA_UPDATE",
          action: "settings_updated",
          orgId: site.org_id,
          timestamp: Date.now(),
          payload: { source: "super_admin_manual" },
        },
      });
      supabase.removeChannel(channel);

      toast({
        title: "Re-sync triggered",
        description: `${site.org_name}'s public site will refresh shortly.`,
      });
    } catch (e: any) {
      toast({ title: "Trigger failed", description: e.message, variant: "destructive" });
    } finally {
      setPublishingOrgId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Globe size={24} className="text-primary" /> Tenant Non-Native Sites
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage every organization's custom-domain / externally-hosted public website. Saves on the
            organization admin dashboard auto-push to GitHub without super admin approval.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSites}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Github size={16} /> GitHub Auto-Push Status
          </CardTitle>
          <CardDescription className="text-xs">
            {sites.length} non-native site{sites.length !== 1 ? "s" : ""} •{" "}
            {sites.filter((s) => s.hasGithubToken).length} with tenant-scoped fine-grained token •{" "}
            {sites.filter((s) => !s.hasGithubToken).length} using platform fallback
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : sites.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Globe size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No organizations have configured a non-native public website yet.
          </p>
          <p className="text-muted-foreground text-xs mt-2">
            Org admins can set their custom domain under Website Builder → Public-Facing Website.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sites.map((site) => (
            <Card key={site.org_id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 size={16} className="text-primary shrink-0" />
                      <span className="truncate">{site.org_name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 truncate">
                      {site.org_slug}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {site.mode.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs">
                  <Label className="text-muted-foreground">Public URL</Label>
                  <a
                    href={site.public_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline truncate"
                  >
                    {site.public_website_url}
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  {site.hasGithubToken ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border gap-1">
                      <CheckCircle2 size={12} /> Tenant Token
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1">
                      <AlertTriangle size={12} /> Platform Fallback
                    </Badge>
                  )}
                  {site.repoOwner && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Github size={10} /> Custom Owner
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Dialog open={tokenOrg?.org_id === site.org_id} onOpenChange={(o) => !o && setTokenOrg(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openTokenDialog(site)}>
                        <Key size={12} /> {site.hasGithubToken ? "Rotate Token" : "Add Token"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>GitHub Fine-Grained Token — {tokenOrg?.org_name}</DialogTitle>
                        <DialogDescription>
                          Stored encrypted in <code>org_api_keys</code>. Used by{" "}
                          <code>github-repo-push</code> for direct, unattended pushes from this
                          organization's admin dashboard.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Fine-Grained Personal Access Token</Label>
                          <Input
                            type="password"
                            placeholder="github_pat_…"
                            value={tokenValue}
                            onChange={(e) => setTokenValue(e.target.value)}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Requires <em>Contents: Read &amp; write</em>, <em>Metadata: Read</em>, and{" "}
                            <em>Pages: Read &amp; write</em> on the target repo.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Repo Owner (optional)</Label>
                          <Input
                            placeholder="github-username-or-org"
                            value={ownerValue}
                            onChange={(e) => setOwnerValue(e.target.value)}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Leave blank to use FYSORA FASHN's default GitHub account.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setTokenOrg(null)}>Cancel</Button>
                        <Button onClick={saveToken} disabled={savingToken}>
                          {savingToken ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="hero"
                    className="gap-1"
                    onClick={() => triggerPublish(site)}
                    disabled={publishingOrgId === site.org_id}
                  >
                    {publishingOrgId === site.org_id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Rocket size={12} />
                    )}
                    Re-sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TenantSitesPanel;