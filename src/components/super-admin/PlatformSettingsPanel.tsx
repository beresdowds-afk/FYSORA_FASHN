import { useState, useEffect } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Globe, Mail, Phone, MapPin, Save, Loader2, Image, FileImage,
  Eye, Type, Target, Compass, Link as LinkIcon, Hash, Copyright,
  Twitter, Facebook, Instagram, Linkedin, Youtube
} from "lucide-react";

const SOCIAL_FIELDS = [
  { key: "twitter", label: "Twitter / X", icon: Twitter },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "youtube", label: "YouTube", icon: Youtube },
];

export default function PlatformSettingsPanel() {
  const { settings, loading, updateSettings, refetch } = usePlatformSettings();
  const { toast } = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(settings);
    setSocialLinks(settings.social_links || {});
  }, [settings]);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage
      .from("org-assets")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("org-assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);

    let logoUrl = form.logo_url;
    let faviconUrl = form.favicon_url;

    if (logoFile) {
      const url = await uploadFile(logoFile, `platform/logo-${Date.now()}.${logoFile.name.split('.').pop()}`);
      if (url) logoUrl = url;
    }

    if (faviconFile) {
      const url = await uploadFile(faviconFile, `platform/favicon-${Date.now()}.${faviconFile.name.split('.').pop()}`);
      if (url) faviconUrl = url;
    }

    const { error } = await updateSettings({
      platform_name: form.platform_name,
      platform_short_name: form.platform_short_name,
      tagline: form.tagline,
      description: form.description,
      vision: form.vision,
      mission: form.mission,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      contact_address: form.contact_address,
      website_url: form.website_url,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      social_links: socialLinks,
      meta_keywords: form.meta_keywords,
      copyright_text: form.copyright_text,
    });

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Platform settings saved", description: "Changes will reflect across all pages." });
      setLogoFile(null);
      setFaviconFile(null);
    }
    setSaving(false);
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Globe size={22} className="text-primary" /> Platform Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage FSA brand identity, contacts, and metadata used across the website and apps.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
          Save Changes
        </Button>
      </div>

      {/* Identity */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Type size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Brand Identity</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input value={form.platform_name} onChange={(e) => update("platform_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Short Name</Label>
              <Input value={form.platform_short_name} onChange={(e) => update("platform_short_name", e.target.value)} placeholder="e.g. Fashion Stitches" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="The Future of African Fashion Tech" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Short platform description for footer and about sections..." />
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Compass size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Vision & Mission</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Target size={14} /> Vision Statement</Label>
            <Textarea rows={3} value={form.vision} onChange={(e) => update("vision", e.target.value)} placeholder="Our vision is to..." />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Compass size={14} /> Mission Statement</Label>
            <Textarea rows={3} value={form.mission} onChange={(e) => update("mission", e.target.value)} placeholder="Our mission is to..." />
          </div>
        </div>
      </section>

      {/* Contact Details */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Mail size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Contact Information</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail size={14} /> Email</Label>
              <Input value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone size={14} /> Phone</Label>
              <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MapPin size={14} /> Address</Label>
              <Input value={form.contact_address} onChange={(e) => update("contact_address", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><LinkIcon size={14} /> Website URL</Label>
            <Input value={form.website_url} onChange={(e) => update("website_url", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Logo & Favicon */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Image size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Logo & Favicon</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><Image size={14} /> Platform Logo</Label>
            {(form.logo_url || logoFile) && (
              <div className="w-20 h-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : form.logo_url}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Recommended: 512×512 PNG with transparent background</p>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><FileImage size={14} /> Favicon</Label>
            {(form.favicon_url || faviconFile) && (
              <div className="w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                <img
                  src={faviconFile ? URL.createObjectURL(faviconFile) : form.favicon_url}
                  alt="Favicon preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/*,.ico"
              onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Recommended: 32×32 or 64×64 ICO/PNG</p>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <LinkIcon size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Social Media Links</h3>
        </div>
        <div className="p-5 space-y-3">
          {SOCIAL_FIELDS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon size={16} className="text-muted-foreground shrink-0" />
              <Input
                value={socialLinks[key] || ""}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={`https://${key}.com/...`}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </section>

      {/* SEO & Meta */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Hash size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">SEO & Metadata</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Meta Keywords</Label>
            <Input value={form.meta_keywords} onChange={(e) => update("meta_keywords", e.target.value)} placeholder="african fashion, tailoring, bespoke..." />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Copyright size={14} /> Copyright Text</Label>
            <Input value={form.copyright_text} onChange={(e) => update("copyright_text", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="rounded-xl border-2 border-primary/20 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-primary/5 flex items-center gap-2">
          <Eye size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Live Preview</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-ebony p-6 text-ivory">
            <div className="flex items-center gap-3 mb-3">
              {(form.logo_url || logoFile) && (
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : form.logo_url}
                  alt=""
                  className="w-9 h-9 object-contain"
                />
              )}
              <div>
                <p className="font-heading font-bold text-lg">{form.platform_short_name || form.platform_name}</p>
                <p className="text-ivory/50 text-xs">{form.tagline}</p>
              </div>
            </div>
            <p className="text-ivory/40 text-sm">{form.description}</p>
            <div className="flex gap-4 mt-4 text-xs text-ivory/30">
              <span>{form.contact_email}</span>
              <span>{form.contact_phone}</span>
              <span>{form.contact_address}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Save footer */}
      <div className="flex justify-end">
        <Button variant="hero" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
          Save All Changes
        </Button>
      </div>
    </motion.div>
  );
}
