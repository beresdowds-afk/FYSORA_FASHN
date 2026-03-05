import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image, Type, Palette, Building2, Loader2, Sparkles } from "lucide-react";

interface OrgBrandingPanelProps {
  org: { id: string; name: string; slug: string; description?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null };
  websiteSettings: {
    brand_color: string;
    accent_color: string;
    font_heading?: string;
    font_body?: string;
    color_palette?: Record<string, string>;
    favicon_url?: string | null;
    vision_statement?: string | null;
    mission_statement?: string | null;
  };
  canEdit: boolean;
  onSettingsChange: (updates: Record<string, any>) => void;
  onOrgChange: (updates: Record<string, any>) => void;
  onSave: () => void;
  saving: boolean;
}

const FONT_OPTIONS = [
  "Inter", "Playfair Display", "Poppins", "Lora", "Montserrat",
  "Raleway", "Oswald", "Merriweather", "Roboto Slab", "DM Sans",
  "Space Grotesk", "Cormorant Garamond",
];

const OrgBrandingPanel = ({ org, websiteSettings, canEdit, onSettingsChange, onOrgChange, onSave, saving }: OrgBrandingPanelProps) => {
  const { toast } = useToast();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const palette = (websiteSettings.color_palette || {}) as Record<string, string>;
  const fontHeading = websiteSettings.font_heading || "Inter";
  const fontBody = websiteSettings.font_body || "Inter";

  const handleFileUpload = async (file: File, type: "logo" | "favicon") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);

    const ext = file.name.split(".").pop() || "png";
    const path = `${org.id}/${type}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("org-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("org-assets").getPublicUrl(path);

    if (type === "logo") {
      // Update organizations.logo_url
      await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", org.id);
      onOrgChange({ logo_url: publicUrl });
    } else {
      onSettingsChange({ favicon_url: publicUrl });
    }

    toast({ title: `${type === "logo" ? "Logo" : "Favicon"} uploaded!` });
    setUploading(false);
  };

  const handlePaletteChange = (key: string, value: string) => {
    onSettingsChange({ color_palette: { ...palette, [key]: value } });
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Image size={16} /> Logo</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
            {org.logo_url ? (
              <img src={org.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Upload size={24} className="text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo")} />
            <Button variant="outline" size="sm" disabled={!canEdit || uploadingLogo}
              onClick={() => logoRef.current?.click()}>
              {uploadingLogo ? <><Loader2 size={14} className="mr-1 animate-spin" /> Uploading...</> : "Upload Logo"}
            </Button>
            <p className="text-xs text-muted-foreground">Recommended: 512×512px, PNG or SVG</p>
          </div>
        </div>
      </div>

      {/* Favicon Upload */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Image size={16} /> Favicon</h3>
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
            {websiteSettings.favicon_url ? (
              <img src={websiteSettings.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
            ) : (
              <Upload size={16} className="text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input ref={faviconRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "favicon")} />
            <Button variant="outline" size="sm" disabled={!canEdit || uploadingFavicon}
              onClick={() => faviconRef.current?.click()}>
              {uploadingFavicon ? <><Loader2 size={14} className="mr-1 animate-spin" /> Uploading...</> : "Upload Favicon"}
            </Button>
            <p className="text-xs text-muted-foreground">32×32px or 64×64px, PNG or ICO</p>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Palette size={16} /> Color Palette</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { key: "brand_color", label: "Brand Color", value: websiteSettings.brand_color, isMain: true },
            { key: "accent_color", label: "Accent Color", value: websiteSettings.accent_color, isMain: true },
            { key: "tertiary", label: "Tertiary", value: palette.tertiary || "#6366F1" },
            { key: "background", label: "Background", value: palette.background || "#0d0d0d" },
            { key: "text_color", label: "Text Color", value: palette.text_color || "#ffffff" },
            { key: "surface", label: "Surface", value: palette.surface || "#1a1a1a" },
          ].map((c) => (
            <div key={c.key} className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{c.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.value}
                  disabled={!canEdit}
                  onChange={(e) => {
                    if ('isMain' in c && c.isMain) {
                      onSettingsChange({ [c.key]: e.target.value });
                    } else {
                      handlePaletteChange(c.key, e.target.value);
                    }
                  }}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                />
                <input
                  value={c.value}
                  disabled={!canEdit}
                  onChange={(e) => {
                    if ('isMain' in c && c.isMain) {
                      onSettingsChange({ [c.key]: e.target.value });
                    } else {
                      handlePaletteChange(c.key, e.target.value);
                    }
                  }}
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live Swatch Preview */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <div className="flex gap-2">
            {[websiteSettings.brand_color, websiteSettings.accent_color, palette.tertiary || "#6366F1", palette.background || "#0d0d0d", palette.text_color || "#ffffff", palette.surface || "#1a1a1a"].map((color, i) => (
              <div key={i} className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ background: color }} title={color} />
            ))}
          </div>
        </div>
      </div>

      {/* Font Selection */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Type size={16} /> Typography</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Heading Font</label>
            <select
              value={fontHeading}
              disabled={!canEdit}
              onChange={(e) => onSettingsChange({ font_heading: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <p className="text-lg font-bold" style={{ fontFamily: fontHeading }}>Sample Heading</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Body Font</label>
            <select
              value={fontBody}
              disabled={!canEdit}
              onChange={(e) => onSettingsChange({ font_body: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <p className="text-sm" style={{ fontFamily: fontBody }}>This is sample body text to preview the font selection.</p>
          </div>
        </div>
      </div>

      {/* Vision & Mission */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Sparkles size={16} /> Vision & Mission</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Vision Statement</label>
            <textarea
              value={websiteSettings.vision_statement || ""}
              disabled={!canEdit}
              onChange={(e) => onSettingsChange({ vision_statement: e.target.value })}
              rows={3}
              placeholder="What future does your brand aspire to create?"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mission Statement</label>
            <textarea
              value={websiteSettings.mission_statement || ""}
              disabled={!canEdit}
              onChange={(e) => onSettingsChange({ mission_statement: e.target.value })}
              rows={3}
              placeholder="What is your brand's purpose and how do you serve your customers?"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Building2 size={16} /> Company Details</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={org.description || ""}
              disabled={!canEdit}
              onChange={(e) => onOrgChange({ description: e.target.value })}
              rows={3}
              placeholder="Tell customers about your brand..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input value={org.email || ""} disabled={!canEdit}
                onChange={(e) => onOrgChange({ email: e.target.value })}
                placeholder="contact@yourbrand.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <input value={org.phone || ""} disabled={!canEdit}
                onChange={(e) => onOrgChange({ phone: e.target.value })}
                placeholder="+234 800 000 0000"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <input value={org.address || ""} disabled={!canEdit}
              onChange={(e) => onOrgChange({ address: e.target.value })}
              placeholder="123 Fashion Street, Lagos, Nigeria"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {canEdit && (
        <Button variant="hero" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Branding & Details"}
        </Button>
      )}
    </div>
  );
};

export default OrgBrandingPanel;
