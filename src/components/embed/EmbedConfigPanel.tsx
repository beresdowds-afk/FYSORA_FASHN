import { useState } from "react";
import { useEmbedConfig } from "@/hooks/useEmbedConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Globe, Code, ExternalLink, Palette } from "lucide-react";

const AVAILABLE_FEATURES = [
  { key: "measurements", label: "AI Body Measurements" },
  { key: "tryon", label: "Virtual Try-On" },
  { key: "appointments", label: "Appointments & Booking" },
  { key: "catalogue", label: "Catalogue Browsing" },
];

const EmbedConfigPanel = ({ orgId }: { orgId: string }) => {
  const { config, loading, upsertConfig } = useEmbedConfig(orgId);
  const { toast } = useToast();
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const [embedMode, setEmbedMode] = useState<"widget" | "inline" | "iframe">("widget");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/embed-widget`;

  const embedSnippets: Record<string, string> = config ? {
    widget: `<script src="${baseUrl}?key=${config.widget_key}" defer></script>`,
    inline: `<!-- Place this div where you want FSA to appear -->\n<div id="fsa-embed" data-page="catalogue" data-height="700"></div>\n<script src="${baseUrl}?key=${config.widget_key}" defer></script>`,
    iframe: `<iframe src="${baseUrl}?key=${config.widget_key}&format=iframe" style="width:100%;min-height:700px;border:none;border-radius:12px;" allow="camera;microphone;geolocation" loading="lazy"></iframe>`,
  } : { widget: "", inline: "", iframe: "" };

  const currentSnippet = embedSnippets[embedMode];

  const handleToggleEnabled = async () => {
    setSaving(true);
    await upsertConfig({ is_enabled: !config?.is_enabled });
    setSaving(false);
    toast({ title: config?.is_enabled ? "Widget disabled" : "Widget enabled" });
  };

  const handleSetupWidget = async () => {
    setSaving(true);
    await upsertConfig({
      is_enabled: true,
      enabled_features: ["measurements", "tryon", "appointments", "catalogue"],
    });
    setSaving(false);
    toast({ title: "Widget created! Copy the embed code below." });
  };

  const handleToggleFeature = async (feature: string, checked: boolean) => {
    const features = config?.enabled_features || [];
    const updated = checked ? [...features, feature] : features.filter(f => f !== feature);
    await upsertConfig({ enabled_features: updated });
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    const domains = [...(config?.allowed_domains || []), newDomain.trim()];
    await upsertConfig({ allowed_domains: domains });
    setNewDomain("");
    toast({ title: "Domain added" });
  };

  const handleRemoveDomain = (domain: string) => {
    const domains = (config?.allowed_domains || []).filter(d => d !== domain);
    upsertConfig({ allowed_domains: domains });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe size={20} /> Website Integration Widget</CardTitle>
          <CardDescription>Enable external websites to integrate FSA features with a single line of code.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSetupWidget} disabled={saving}>
            <Code size={16} className="mr-2" /> Set Up Widget
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Globe size={20} /> Embed Widget</CardTitle>
              <CardDescription>Let external websites use your FSA services.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.is_enabled ? "default" : "secondary"}>
                {config.is_enabled ? "Active" : "Disabled"}
              </Badge>
              <Switch checked={config.is_enabled} onCheckedChange={handleToggleEnabled} disabled={saving} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Embed Mode Selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Embed Mode</Label>
            <div className="flex gap-2 mb-3">
              {([
                { key: "widget" as const, label: "Floating Widget", desc: "Button in corner" },
                { key: "inline" as const, label: "Inline Embed", desc: "Embedded in page" },
                { key: "iframe" as const, label: "Full iFrame", desc: "Full page embed" },
              ]).map(mode => (
                <button
                  key={mode.key}
                  className={`flex-1 p-3 rounded-lg border text-left transition-colors ${embedMode === mode.key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  onClick={() => setEmbedMode(mode.key)}
                >
                  <p className="text-xs font-semibold">{mode.label}</p>
                  <p className="text-[10px] text-muted-foreground">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Embed Code */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Embed Code</Label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg text-xs break-all font-mono whitespace-pre-wrap">{currentSnippet}</code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(currentSnippet)}>
                <Copy size={14} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {embedMode === "widget" && "Paste this before the closing </body> tag. Shows a floating button."}
              {embedMode === "inline" && "Place the <div> where you want FSA to appear. Change data-page to: catalogue, book, or tryon."}
              {embedMode === "iframe" && "Paste this iframe anywhere in your HTML. Fully self-contained."}
            </p>
          </div>

          {/* Widget Key */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Widget Key</Label>
            <div className="flex gap-2">
              <Input value={config.widget_key} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(config.widget_key)}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enabled Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {AVAILABLE_FEATURES.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <Checkbox
                checked={config.enabled_features.includes(f.key)}
                onCheckedChange={(checked) => handleToggleFeature(f.key, !!checked)}
              />
              <span className="text-sm">{f.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Allowed Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ExternalLink size={16} /> Allowed Domains</CardTitle>
          <CardDescription>Leave empty to allow all domains, or restrict to specific ones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button variant="outline" onClick={handleAddDomain}>Add</Button>
          </div>
          {config.allowed_domains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {config.allowed_domains.map(d => (
                <Badge key={d} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveDomain(d)}>
                  {d} ✕
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">All domains allowed (no restrictions).</p>
          )}
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette size={16} /> Theme</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Primary Color</Label>
            <Input
              type="color"
              value={config.theme_config?.primaryColor || "#000000"}
              onChange={(e) => upsertConfig({ theme_config: { ...config.theme_config, primaryColor: e.target.value } })}
            />
          </div>
          <div>
            <Label className="text-xs">Position</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={config.theme_config?.position || "bottom-right"}
              onChange={(e) => upsertConfig({ theme_config: { ...config.theme_config, position: e.target.value } })}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedConfigPanel;
