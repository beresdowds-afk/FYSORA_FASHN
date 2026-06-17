import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Wand2, Loader2, Trash2, Eye, Save, Sparkles, Palette as PaletteIcon, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCustomWebsiteTemplates, rowToTemplate, type CustomTemplateRow } from "@/hooks/useCustomWebsiteTemplates";
import type { WebsiteTemplate } from "@/config/websiteTemplates";
import WebsiteTemplatePicker from "@/components/website-builder/WebsiteTemplatePicker";

type Cat = WebsiteTemplate["category"];
type HeroStyle = WebsiteTemplate["design"]["heroStyle"];
type NavStyle = WebsiteTemplate["design"]["navStyle"];
type CardStyle = WebsiteTemplate["design"]["cardStyle"];
type Hover = WebsiteTemplate["design"]["hoverEffect"];
type Anim = WebsiteTemplate["design"]["animationStyle"];
type Aspect = WebsiteTemplate["design"]["imageAspect"];
type Weight = WebsiteTemplate["design"]["headingWeight"];
type Case = WebsiteTemplate["design"]["headingCase"];

const TEMPLATE_KEY_RE = /^[a-z0-9][a-z0-9-]{2,40}$/;

const FONT_OPTIONS = [
  "Inter", "Playfair Display", "Space Grotesk", "DM Sans", "Cormorant Garamond",
  "Manrope", "Poppins", "Lora", "Bodoni Moda", "Archivo", "Outfit", "Geist", "Fraunces",
];

const blankTemplate = (): Omit<CustomTemplateRow, "id" | "created_at"> => ({
  template_key: "",
  name: "",
  description: "",
  category: "minimal",
  is_active: true,
  design: {
    heroStyle: "fullscreen",
    navStyle: "minimal",
    gridColumns: 3,
    cardStyle: "rounded",
    fontHeadingDefault: "Inter",
    fontBodyDefault: "Inter",
    headingWeight: "600",
    headingCase: "none",
    headingSpacing: "0em",
    bgBase: "#0F172A",
    bgSurface: "#1E293B",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    borderOpacity: "0.1",
    sectionPadding: "py-24",
    containerMaxWidth: "max-w-7xl",
    hoverEffect: "lift",
    animationStyle: "smooth",
    imageAspect: "auto",
    showSustainabilityBadge: false,
    showCulturalStory: false,
    editorialDescriptions: false,
    useSerifAccents: false,
  },
  copy: {
    heroTagline: "Refined craftsmanship, modern presentation",
    ctaPrimary: "Shop Now",
    ctaSecondary: "Learn More",
    catalogueIntro: "Browse our latest collection.",
    aboutIntro: "Our story begins with a single thread.",
    sustainabilityNote: "Ethically made, mindfully sourced.",
  },
});

export default function WebsiteTemplateBuilder() {
  const { user } = useAuth();
  const { rows, loading, reload } = useCustomWebsiteTemplates();
  const [form, setForm] = useState(blankTemplate());
  const [keyError, setKeyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);

  const updateDesign = <K extends keyof WebsiteTemplate["design"]>(k: K, v: WebsiteTemplate["design"][K]) =>
    setForm((f) => ({ ...f, design: { ...f.design, [k]: v } }));
  const updateCopy = <K extends keyof WebsiteTemplate["copy"]>(k: K, v: WebsiteTemplate["copy"][K]) =>
    setForm((f) => ({ ...f, copy: { ...f.copy, [k]: v } }));

  const setKey = (raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    setForm((f) => ({ ...f, template_key: v }));
    setKeyError(v && !TEMPLATE_KEY_RE.test(v) ? "Key must be 3–40 chars, lowercase letters, digits and dashes only." : null);
  };

  const reset = () => { setForm(blankTemplate()); setEditingId(null); setKeyError(null); };

  const save = async () => {
    if (!form.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    if (!form.template_key || keyError) return toast({ title: "Fix the template key first", description: keyError ?? "Required", variant: "destructive" });
    setSaving(true);
    const payload = {
      template_key: form.template_key,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      category: form.category,
      design: form.design,
      copy: form.copy,
      is_active: form.is_active,
      created_by: user?.id ?? null,
    };
    const q = editingId
      ? supabase.from("custom_website_templates").update(payload).eq("id", editingId)
      : supabase.from("custom_website_templates").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast({ title: editingId ? "Update failed" : "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editingId ? "Template updated" : "Template created", description: "Added to the available templates list." });
    reset();
    reload();
  };

  const startEdit = (r: CustomTemplateRow) => {
    setEditingId(r.id);
    setForm({
      template_key: r.template_key,
      name: r.name,
      description: r.description ?? "",
      category: r.category,
      design: r.design,
      copy: r.copy,
      is_active: r.is_active,
    });
    setKeyError(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    const { error } = await supabase.from("custom_website_templates").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Template deleted" });
    reload();
  };

  const toggleActive = async (r: CustomTemplateRow) => {
    const { error } = await supabase.from("custom_website_templates").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    reload();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-primary" />
            <h2 className="font-heading font-semibold text-base">
              {editingId ? "Edit Website Template" : "Build a New Website Template"}
            </h2>
          </div>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={reset}>New template</Button>
          )}
        </div>

        {/* Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Template name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sahara Editorial" maxLength={80} />
          </Field>
          <Field label="Template key (URL-safe)" error={keyError}>
            <Input value={form.template_key} onChange={(e) => setKey(e.target.value)} placeholder="sahara-editorial" disabled={!!editingId} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={400} placeholder="Short description shown in the template picker" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Cat })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["luxury", "minimal", "editorial", "bold", "classic"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end gap-3 pb-1">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label className="text-xs">Active (visible in template picker)</Label>
          </div>
        </div>

        {/* Layout */}
        <Section title="Layout">
          <Field label="Hero style">
            <SelectInput value={form.design.heroStyle} options={["fullscreen", "split", "overlay", "editorial"]} onChange={(v) => updateDesign("heroStyle", v as HeroStyle)} />
          </Field>
          <Field label="Nav style">
            <SelectInput value={form.design.navStyle} options={["transparent", "solid", "minimal", "editorial"]} onChange={(v) => updateDesign("navStyle", v as NavStyle)} />
          </Field>
          <Field label="Grid columns">
            <SelectInput value={String(form.design.gridColumns)} options={["2", "3", "4"]} onChange={(v) => updateDesign("gridColumns", Number(v) as 2 | 3 | 4)} />
          </Field>
          <Field label="Card style">
            <SelectInput value={form.design.cardStyle} options={["rounded", "sharp", "editorial", "minimal"]} onChange={(v) => updateDesign("cardStyle", v as CardStyle)} />
          </Field>
          <Field label="Section padding (tailwind)">
            <Input value={form.design.sectionPadding} onChange={(e) => updateDesign("sectionPadding", e.target.value)} placeholder="py-24" />
          </Field>
          <Field label="Container max-width (tailwind)">
            <Input value={form.design.containerMaxWidth} onChange={(e) => updateDesign("containerMaxWidth", e.target.value)} placeholder="max-w-7xl" />
          </Field>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <Field label="Heading font">
            <SelectInput value={form.design.fontHeadingDefault} options={FONT_OPTIONS} onChange={(v) => updateDesign("fontHeadingDefault", v)} />
          </Field>
          <Field label="Body font">
            <SelectInput value={form.design.fontBodyDefault} options={FONT_OPTIONS} onChange={(v) => updateDesign("fontBodyDefault", v)} />
          </Field>
          <Field label="Heading weight">
            <SelectInput value={form.design.headingWeight} options={["400", "500", "600", "700"]} onChange={(v) => updateDesign("headingWeight", v as Weight)} />
          </Field>
          <Field label="Heading case">
            <SelectInput value={form.design.headingCase} options={["none", "uppercase", "capitalize"]} onChange={(v) => updateDesign("headingCase", v as Case)} />
          </Field>
          <Field label="Heading letter-spacing">
            <Input value={form.design.headingSpacing} onChange={(e) => updateDesign("headingSpacing", e.target.value)} placeholder="0.02em" />
          </Field>
        </Section>

        {/* Colors */}
        <Section title="Colors">
          <ColorField label="Base background" value={form.design.bgBase} onChange={(v) => updateDesign("bgBase", v)} />
          <ColorField label="Surface" value={form.design.bgSurface} onChange={(v) => updateDesign("bgSurface", v)} />
          <ColorField label="Primary text" value={form.design.textPrimary} onChange={(v) => updateDesign("textPrimary", v)} />
          <ColorField label="Secondary text" value={form.design.textSecondary} onChange={(v) => updateDesign("textSecondary", v)} />
          <Field label="Border opacity (0–1)">
            <Input value={form.design.borderOpacity} onChange={(e) => updateDesign("borderOpacity", e.target.value)} placeholder="0.08" />
          </Field>
        </Section>

        {/* Effects */}
        <Section title="Effects">
          <Field label="Hover effect">
            <SelectInput value={form.design.hoverEffect} options={["scale", "fade", "slide", "lift", "none"]} onChange={(v) => updateDesign("hoverEffect", v as Hover)} />
          </Field>
          <Field label="Animation style">
            <SelectInput value={form.design.animationStyle} options={["smooth", "dramatic", "subtle", "none"]} onChange={(v) => updateDesign("animationStyle", v as Anim)} />
          </Field>
          <Field label="Image aspect">
            <SelectInput value={form.design.imageAspect} options={["portrait", "square", "landscape", "auto"]} onChange={(v) => updateDesign("imageAspect", v as Aspect)} />
          </Field>
        </Section>

        {/* Features */}
        <Section title="Feature flags" cols={2}>
          <ToggleField label="Sustainability badge" value={form.design.showSustainabilityBadge} onChange={(v) => updateDesign("showSustainabilityBadge", v)} />
          <ToggleField label="Cultural story section" value={form.design.showCulturalStory} onChange={(v) => updateDesign("showCulturalStory", v)} />
          <ToggleField label="Editorial descriptions" value={form.design.editorialDescriptions} onChange={(v) => updateDesign("editorialDescriptions", v)} />
          <ToggleField label="Serif accents" value={form.design.useSerifAccents} onChange={(v) => updateDesign("useSerifAccents", v)} />
        </Section>

        {/* Copy */}
        <Section title="Default copy" cols={2}>
          <Field label="Hero tagline" className="md:col-span-2">
            <Input value={form.copy.heroTagline} onChange={(e) => updateCopy("heroTagline", e.target.value)} maxLength={140} />
          </Field>
          <Field label="Primary CTA"><Input value={form.copy.ctaPrimary} onChange={(e) => updateCopy("ctaPrimary", e.target.value)} maxLength={32} /></Field>
          <Field label="Secondary CTA"><Input value={form.copy.ctaSecondary} onChange={(e) => updateCopy("ctaSecondary", e.target.value)} maxLength={32} /></Field>
          <Field label="Catalogue intro" className="md:col-span-2">
            <Textarea rows={2} value={form.copy.catalogueIntro} onChange={(e) => updateCopy("catalogueIntro", e.target.value)} maxLength={300} />
          </Field>
          <Field label="About intro" className="md:col-span-2">
            <Textarea rows={2} value={form.copy.aboutIntro} onChange={(e) => updateCopy("aboutIntro", e.target.value)} maxLength={300} />
          </Field>
          <Field label="Sustainability note" className="md:col-span-2">
            <Input value={form.copy.sustainabilityNote} onChange={(e) => updateCopy("sustainabilityNote", e.target.value)} maxLength={200} />
          </Field>
        </Section>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(toTemplate(form))}>
            <Eye size={14} className="mr-1" /> Preview
          </Button>
          <Button size="sm" variant="hero" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
            {editingId ? "Update template" : "Save & add to library"}
          </Button>
        </div>
      </motion.div>

      {/* Custom templates list */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h3 className="font-heading font-semibold text-sm">Custom-built templates ({rows.length})</h3>
          </div>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No custom templates yet. Build one above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="h-16 rounded" style={{ background: r.design.bgBase }}>
                  <div className="h-full flex items-center justify-center" style={{ color: r.design.textPrimary, fontFamily: r.design.fontHeadingDefault }}>
                    {r.name}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{r.category}</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[28px]">{r.description ?? "—"}</p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => startEdit(r)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={r.is_active ? "Disable" : "Enable"} onClick={() => toggleActive(r)}>
                    {r.is_active ? <Power size={12} /> : <PowerOff size={12} className="text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(r.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All available templates (built-in + custom) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <PaletteIcon size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">All available templates</h3>
        </div>
        <WebsiteTemplatePicker readOnly />
      </div>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name} — Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && <LivePreview t={previewTemplate} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toTemplate(f: ReturnType<typeof blankTemplate>): WebsiteTemplate {
  return {
    id: f.template_key || "preview",
    name: f.name || "Untitled",
    description: f.description ?? "",
    category: f.category,
    design: f.design,
    copy: f.copy,
  };
}

function Field({ label, children, className, error }: { label: string; children: React.ReactNode; className?: string; error?: string | null }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function Section({ title, children, cols = 3 }: { title: string; children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</h4>
      <div className={`grid grid-cols-1 ${cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3`}>{children}</div>
    </div>
  );
}

function SelectInput({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-border bg-transparent" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </Field>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function LivePreview({ t }: { t: WebsiteTemplate }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: t.design.bgBase }}>
      <div className="p-8 text-center space-y-3">
        <p style={{
          fontFamily: t.design.fontHeadingDefault, color: t.design.textPrimary,
          fontWeight: t.design.headingWeight,
          textTransform: t.design.headingCase === "uppercase" ? "uppercase" : t.design.headingCase === "capitalize" ? "capitalize" : "none",
          letterSpacing: t.design.headingSpacing, fontSize: "1.8rem", lineHeight: 1.2,
        }}>
          {t.copy.heroTagline}
        </p>
        <p style={{ fontFamily: t.design.fontBodyDefault, color: t.design.textSecondary, fontSize: "0.9rem" }}>
          {t.copy.catalogueIntro}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <span className="px-5 py-2 rounded text-sm font-medium" style={{ backgroundColor: t.design.textPrimary, color: t.design.bgBase }}>{t.copy.ctaPrimary}</span>
          <span className="px-5 py-2 rounded text-sm font-medium border" style={{ color: t.design.textPrimary, borderColor: t.design.textPrimary + "33" }}>{t.copy.ctaSecondary}</span>
        </div>
      </div>
    </div>
  );
}
