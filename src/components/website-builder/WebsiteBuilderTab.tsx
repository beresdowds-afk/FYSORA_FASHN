import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Globe, Zap, Link2, Eye, Plus, Trash2, Edit2, Save, X, Package, ExternalLink, Copy, Key } from "lucide-react";
import type { AppRole } from "@/hooks/useOrganization";

interface WebsiteSettings {
  id?: string;
  org_id: string;
  is_enabled: boolean;
  mode: "auto_builder" | "custom_integration";
  tagline: string;
  hero_description: string;
  hero_image_url: string;
  brand_color: string;
  accent_color: string;
  theme: "dark" | "light";
  api_key: string;
  api_secret: string;
  webhook_url: string;
  instagram_url: string;
  facebook_url: string;
  whatsapp_number: string;
}

interface CatalogueItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  is_available: boolean;
  sort_order: number;
  tags: string[] | null;
}

interface WebsiteBuilderTabProps {
  org: { id: string; name: string; slug: string; currency?: string | null };
  role: AppRole | null;
}

const defaultSettings = (orgId: string): WebsiteSettings => ({
  org_id: orgId,
  is_enabled: true,
  mode: "auto_builder",
  tagline: "",
  hero_description: "",
  hero_image_url: "",
  brand_color: "#8B5CF6",
  accent_color: "#D4AF37",
  theme: "dark",
  api_key: "",
  api_secret: "",
  webhook_url: "",
  instagram_url: "",
  facebook_url: "",
  whatsapp_number: "",
});

const WebsiteBuilderTab = ({ org, role }: WebsiteBuilderTabProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebsiteSettings>(defaultSettings(org.id));
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "catalogue" | "integration">("general");
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  const canEdit = role === "org_admin" || role === "super_admin";
  const websiteUrl = `${window.location.origin}/site/${org.slug}`;

  const load = async () => {
    setLoading(true);

    const { data: ws } = await supabase
      .from("org_websites")
      .select("*")
      .eq("org_id", org.id)
      .single();

    if (ws) {
      setSettings({
        ...defaultSettings(org.id),
        ...ws,
        tagline: ws.tagline || "",
        hero_description: ws.hero_description || "",
        hero_image_url: ws.hero_image_url || "",
        api_key: ws.api_key || "",
        api_secret: ws.api_secret || "",
        webhook_url: ws.webhook_url || "",
        instagram_url: ws.instagram_url || "",
        facebook_url: ws.facebook_url || "",
        whatsapp_number: ws.whatsapp_number || "",
        mode: (ws.mode as "auto_builder" | "custom_integration") || "auto_builder",
        theme: (ws.theme as "dark" | "light") || "dark",
      });
    }

    const { data: catData } = await supabase
      .from("org_catalogue_items")
      .select("*")
      .eq("org_id", org.id)
      .order("sort_order");

    setCatalogue((catData || []) as CatalogueItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [org.id]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const payload = {
      org_id: org.id,
      is_enabled: settings.is_enabled,
      mode: settings.mode,
      tagline: settings.tagline || null,
      hero_description: settings.hero_description || null,
      hero_image_url: settings.hero_image_url || null,
      brand_color: settings.brand_color,
      accent_color: settings.accent_color,
      theme: settings.theme,
      api_key: settings.api_key || null,
      api_secret: settings.api_secret || null,
      webhook_url: settings.webhook_url || null,
      instagram_url: settings.instagram_url || null,
      facebook_url: settings.facebook_url || null,
      whatsapp_number: settings.whatsapp_number || null,
    };

    const { error } = await supabase
      .from("org_websites")
      .upsert(payload, { onConflict: "org_id" });

    setSaving(false);
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else { toast({ title: "Website settings saved!" }); load(); }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("org_catalogue_items").delete().eq("id", id);
    toast({ title: "Item deleted" });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-bold text-2xl">Website Builder</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Create your public website or connect your own.</p>
        </div>
        <div className="flex gap-2">
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Eye size={14} className="mr-1.5" /> Preview
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { navigator.clipboard.writeText(websiteUrl); toast({ title: "Link copied!" }); }}
          >
            <Copy size={14} className="mr-1.5" /> Copy Link
          </Button>
        </div>
      </div>

      {/* Website URL display */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-6 flex items-center gap-3">
        <Globe size={18} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Your public website URL</p>
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate">
            {websiteUrl} <ExternalLink size={12} />
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-2 h-2 rounded-full ${settings.is_enabled ? "bg-green-500" : "bg-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{settings.is_enabled ? "Live" : "Disabled"}</span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit mb-6">
        {[
          { id: "general" as const, icon: Globe, label: "General" },
          { id: "catalogue" as const, icon: Package, label: "Catalogue" },
          { id: "integration" as const, icon: Link2, label: "Integration" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === s.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>

      {/* ── General Settings ─────────────────────────────────── */}
      {activeSection === "general" && (
        <div className="space-y-6">
          {/* Mode selector */}
          <div className="rounded-xl bg-card border border-border p-6">
            <h3 className="font-heading font-semibold text-base mb-4">Website Mode</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: "auto_builder", icon: Zap, title: "Auto Builder", desc: "We build your website automatically using your organization details and catalogue." },
                { value: "custom_integration", icon: Link2, title: "Custom Integration", desc: "Connect your own external website using our API key & secret for data sync." },
              ].map((opt) => (
                <button
                  key={opt.value}
                  disabled={!canEdit}
                  onClick={() => setSettings({ ...settings, mode: opt.value as "auto_builder" | "custom_integration" })}
                  className={`text-left p-5 rounded-xl border-2 transition-all ${settings.mode === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <opt.icon size={20} className={settings.mode === opt.value ? "text-primary mb-2" : "text-muted-foreground mb-2"} />
                  <p className="font-semibold text-sm mb-1">{opt.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {settings.mode === "auto_builder" && (
            <div className="rounded-xl bg-card border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-base">Website Content</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-muted-foreground">Website enabled</span>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${settings.is_enabled ? "bg-primary" : "bg-muted"}`}
                    onClick={() => canEdit && setSettings({ ...settings, is_enabled: !settings.is_enabled })}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.is_enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tagline</label>
                <input
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. Where African Heritage Meets Contemporary Style"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hero Description</label>
                <textarea
                  value={settings.hero_description}
                  onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Brief description of your brand for the homepage hero section"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hero Image URL</label>
                <input
                  value={settings.hero_image_url}
                  onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                  disabled={!canEdit}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.brand_color} disabled={!canEdit}
                      onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                      className="h-9 w-16 rounded border border-input cursor-pointer"
                    />
                    <input value={settings.brand_color} onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                      disabled={!canEdit} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.accent_color} disabled={!canEdit}
                      onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      className="h-9 w-16 rounded border border-input cursor-pointer"
                    />
                    <input value={settings.accent_color} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      disabled={!canEdit} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instagram URL</label>
                  <input value={settings.instagram_url} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://instagram.com/..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Facebook URL</label>
                  <input value={settings.facebook_url} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    disabled={!canEdit} placeholder="https://facebook.com/..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp Number</label>
                  <input value={settings.whatsapp_number} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    disabled={!canEdit} placeholder="+234 800 000 0000" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {canEdit && (
            <Button variant="hero" onClick={handleSaveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Website Settings"}
            </Button>
          )}
        </div>
      )}

      {/* ── Catalogue ────────────────────────────────────────── */}
      {activeSection === "catalogue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Catalogue Items ({catalogue.length})</h3>
            {canEdit && (
              <Button variant="hero" size="sm" onClick={() => setAddingItem(true)}>
                <Plus size={14} className="mr-1" /> Add Item
              </Button>
            )}
          </div>

          {(addingItem || editingItem) && (
            <CatalogueItemForm
              item={editingItem}
              orgId={org.id}
              currency={org.currency || "NGN"}
              onSave={() => { setAddingItem(false); setEditingItem(null); load(); }}
              onCancel={() => { setAddingItem(false); setEditingItem(null); }}
            />
          )}

          {catalogue.length === 0 && !addingItem ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Package size={32} className="mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No catalogue items yet. Add items to showcase your work on the website.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogue.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setAddingItem(false); }}>
                          <Edit2 size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                  {item.price != null && (
                    <p className="text-sm font-bold text-primary">{item.price.toLocaleString()} {item.currency}</p>
                  )}
                  <div className={`text-xs px-2 py-0.5 rounded-full w-fit ${item.is_available ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {item.is_available ? "Available" : "Unavailable"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Integration ──────────────────────────────────────── */}
      {activeSection === "integration" && (
        <div className="rounded-xl bg-card border border-border p-6 space-y-6">
          <div>
            <h3 className="font-heading font-semibold text-base mb-1">API Integration</h3>
            <p className="text-xs text-muted-foreground">Use these credentials to connect your own website or app to sync data with Fashion Stitches.</p>
          </div>

          {settings.mode === "auto_builder" ? (
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
              Switch to <strong className="text-foreground">Custom Integration</strong> mode in the General tab to enable API credentials.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5"><Key size={14} /> API Key</label>
                <div className="flex gap-2">
                  <input
                    value={settings.api_key}
                    onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Your API key for external integration"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(settings.api_key); toast({ title: "Copied!" }); }}>
                    <Copy size={14} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5"><Key size={14} /> API Secret</label>
                <input
                  value={settings.api_secret}
                  onChange={(e) => setSettings({ ...settings, api_secret: e.target.value })}
                  disabled={!canEdit}
                  type="password"
                  placeholder="Your API secret (keep this confidential)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">External Website URL</label>
                <input
                  value={settings.webhook_url}
                  onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                  disabled={!canEdit}
                  placeholder="https://yourwebsite.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">Visitors to your Fashion Stitches page will be redirected here.</p>
              </div>

              {canEdit && (
                <Button variant="hero" onClick={handleSaveSettings} disabled={saving}>
                  {saving ? "Saving..." : "Save Integration Settings"}
                </Button>
              )}
            </div>
          )}

          {/* API endpoint reference */}
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold text-sm mb-3">Available API Endpoints</h4>
            <div className="space-y-2">
              {[
                { method: "GET", path: `/api/orgs/${org.slug}/catalogue`, desc: "Fetch catalogue items" },
                { method: "POST", path: `/api/orgs/${org.slug}/consultations`, desc: "Create a consultation booking" },
                { method: "GET", path: `/api/orgs/${org.slug}/profile`, desc: "Fetch organisation profile" },
              ].map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/50">
                  <span className={`px-2 py-0.5 rounded font-mono font-semibold ${ep.method === "GET" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"}`}>{ep.method}</span>
                  <code className="text-muted-foreground font-mono flex-1">{ep.path}</code>
                  <span className="text-muted-foreground">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── Catalogue Item Form ───────────────────────────────────────────────────────
const CatalogueItemForm = ({ item, orgId, currency, onSave, onCancel }: {
  item: CatalogueItem | null;
  orgId: string;
  currency: string;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || "",
    price: item?.price?.toString() || "",
    currency: item?.currency || currency,
    is_available: item?.is_available ?? true,
    tags: item?.tags?.join(", ") || "",
    image_url: item?.image_url || "",
    sort_order: item?.sort_order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);

    const payload = {
      org_id: orgId,
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      price: form.price ? parseFloat(form.price) : null,
      currency: form.currency,
      is_available: form.is_available,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      image_url: form.image_url || null,
      sort_order: form.sort_order,
    };

    const { error } = item
      ? await supabase.from("org_catalogue_items").update(payload).eq("id", item.id)
      : await supabase.from("org_catalogue_items").insert(payload);

    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: item ? "Item updated" : "Item added" }); onSave(); }
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{item ? "Edit Item" : "New Catalogue Item"}</h4>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Bespoke Ankara Senator"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Menswear, Womenswear"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          placeholder="Brief description of this garment/service"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Price</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="85000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Currency</label>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="NGN"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Image URL</label>
        <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="https://..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="ankara, bespoke, menswear"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
            className="rounded" />
          <span className="text-sm">Available / Visible on website</span>
        </label>
      </div>

      <div className="flex gap-2">
        <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1" /> {saving ? "Saving..." : "Save Item"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default WebsiteBuilderTab;
