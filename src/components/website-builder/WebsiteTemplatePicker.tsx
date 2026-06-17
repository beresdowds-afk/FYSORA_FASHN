import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Eye, Palette, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTemplateList, type WebsiteTemplate } from "@/config/websiteTemplates";
import { motion } from "framer-motion";
import { useCustomWebsiteTemplates, rowToTemplate } from "@/hooks/useCustomWebsiteTemplates";

interface WebsiteTemplatePickerProps {
  selectedTemplateId?: string;
  onSelect?: (templateId: string) => void;
  readOnly?: boolean;
}

const categoryColors: Record<string, string> = {
  luxury: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  minimal: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  editorial: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  bold: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  classic: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function WebsiteTemplatePicker({ selectedTemplateId, onSelect, readOnly }: WebsiteTemplatePickerProps) {
  const builtin = getTemplateList();
  const { rows } = useCustomWebsiteTemplates();
  const custom = rows.filter((r) => r.is_active).map(rowToTemplate);
  const templates: WebsiteTemplate[] = [...builtin, ...custom];
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette size={18} className="text-primary" />
            Website Templates
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {readOnly ? "Available templates for organization websites." : "Choose a template for your website."}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">{templates.length} available</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const isSelected = selectedTemplateId === t.id;
          return (
            <motion.div key={t.id} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className={`overflow-hidden cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}>
                {/* Color swatch preview */}
                <div className="h-28 relative flex" style={{ background: t.design.bgBase }}>
                  <div className="absolute inset-0 flex items-center justify-center gap-2 p-4">
                    {/* Mini preview showing colors + font */}
                    <div className="text-center space-y-1">
                      <p
                        style={{
                          fontFamily: t.design.fontHeadingDefault,
                          color: t.design.textPrimary,
                          fontWeight: t.design.headingWeight,
                          textTransform: t.design.headingCase === "uppercase" ? "uppercase" : t.design.headingCase === "capitalize" ? "capitalize" : "none",
                          letterSpacing: t.design.headingSpacing,
                          fontSize: "1.1rem",
                        }}
                      >
                        {t.name}
                      </p>
                      <p style={{ fontFamily: t.design.fontBodyDefault, color: t.design.textSecondary, fontSize: "0.7rem" }}>
                        {t.copy.heroTagline}
                      </p>
                    </div>
                  </div>
                  {/* Color dots */}
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {[t.design.bgBase, t.design.bgSurface, t.design.textPrimary, t.design.textSecondary].map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check size={14} className="text-primary-foreground" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.name}</span>
                    <Badge variant="outline" className={`text-[10px] capitalize ${categoryColors[t.category] || ""}`}>
                      {t.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>

                  {/* Design traits */}
                  <div className="flex flex-wrap gap-1">
                    {t.design.showSustainabilityBadge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">Eco</span>
                    )}
                    {t.design.showCulturalStory && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">Cultural</span>
                    )}
                    {t.design.editorialDescriptions && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600">Editorial</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                      {t.design.heroStyle}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {t.design.gridColumns}-col grid
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setPreviewTemplate(t)}>
                      <Eye size={12} className="mr-1" /> Preview
                    </Button>
                    {!readOnly && onSelect && (
                      <Button
                        size="sm"
                        className={`flex-1 h-7 text-xs ${isSelected ? "bg-primary" : ""}`}
                        variant={isSelected ? "default" : "secondary"}
                        onClick={() => onSelect(t.id)}
                      >
                        {isSelected ? <><Check size={12} className="mr-1" /> Selected</> : <><Sparkles size={12} className="mr-1" /> Use</>}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette size={18} className="text-primary" />
              {previewTemplate?.name} — Template Preview
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && <TemplatePreviewDetail template={previewTemplate} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatePreviewDetail({ template: t }: { template: WebsiteTemplate }) {
  return (
    <div className="space-y-6">
      {/* Hero preview */}
      <div className="rounded-lg overflow-hidden" style={{ background: t.design.bgBase }}>
        <div className="p-8 text-center space-y-3" style={{ minHeight: 200 }}>
          <p
            style={{
              fontFamily: t.design.fontHeadingDefault,
              color: t.design.textPrimary,
              fontWeight: t.design.headingWeight,
              textTransform: t.design.headingCase === "uppercase" ? "uppercase" : t.design.headingCase === "capitalize" ? "capitalize" : "none",
              letterSpacing: t.design.headingSpacing,
              fontSize: "1.8rem",
              lineHeight: 1.2,
            }}
          >
            {t.copy.heroTagline}
          </p>
          <p style={{ fontFamily: t.design.fontBodyDefault, color: t.design.textSecondary, fontSize: "0.9rem" }}>
            {t.copy.catalogueIntro}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <span
              className="px-5 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: t.design.textPrimary, color: t.design.bgBase }}
            >
              {t.copy.ctaPrimary}
            </span>
            <span
              className="px-5 py-2 rounded text-sm font-medium border"
              style={{ color: t.design.textPrimary, borderColor: t.design.textPrimary + "33" }}
            >
              {t.copy.ctaSecondary}
            </span>
          </div>
        </div>
      </div>

      {/* Design tokens grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Typography</h4>
          <p><span className="text-muted-foreground">Heading:</span> {t.design.fontHeadingDefault}</p>
          <p><span className="text-muted-foreground">Body:</span> {t.design.fontBodyDefault}</p>
          <p><span className="text-muted-foreground">Weight:</span> {t.design.headingWeight}</p>
          <p><span className="text-muted-foreground">Case:</span> {t.design.headingCase}</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Layout</h4>
          <p><span className="text-muted-foreground">Hero:</span> {t.design.heroStyle}</p>
          <p><span className="text-muted-foreground">Nav:</span> {t.design.navStyle}</p>
          <p><span className="text-muted-foreground">Grid:</span> {t.design.gridColumns} columns</p>
          <p><span className="text-muted-foreground">Cards:</span> {t.design.cardStyle}</p>
        </div>
      </div>

      {/* Color palette */}
      <div className="space-y-2">
        <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Color Palette</h4>
        <div className="flex gap-3">
          {[
            { label: "Base", color: t.design.bgBase },
            { label: "Surface", color: t.design.bgSurface },
            { label: "Text", color: t.design.textPrimary },
            { label: "Secondary", color: t.design.textSecondary },
          ].map((c) => (
            <div key={c.label} className="text-center space-y-1">
              <div className="w-12 h-12 rounded-lg border" style={{ backgroundColor: c.color }} />
              <span className="text-[10px] text-muted-foreground">{c.label}</span>
              <span className="text-[10px] block font-mono text-muted-foreground">{c.color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Features</h4>
        <div className="flex flex-wrap gap-2">
          {t.design.showSustainabilityBadge && <Badge variant="outline" className="text-xs">Sustainability Badge</Badge>}
          {t.design.showCulturalStory && <Badge variant="outline" className="text-xs">Cultural Story</Badge>}
          {t.design.editorialDescriptions && <Badge variant="outline" className="text-xs">Editorial Copy</Badge>}
          {t.design.useSerifAccents && <Badge variant="outline" className="text-xs">Serif Accents</Badge>}
          <Badge variant="outline" className="text-xs capitalize">{t.design.hoverEffect} Hover</Badge>
          <Badge variant="outline" className="text-xs capitalize">{t.design.animationStyle} Animations</Badge>
          <Badge variant="outline" className="text-xs capitalize">{t.design.imageAspect} Images</Badge>
        </div>
      </div>

      {/* Copy preview */}
      <div className="space-y-2">
        <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Default Copy</h4>
        <div className="text-xs space-y-1 text-muted-foreground">
          <p><strong>About:</strong> {t.copy.aboutIntro}</p>
          <p><strong>Sustainability:</strong> {t.copy.sustainabilityNote}</p>
        </div>
      </div>
    </div>
  );
}
