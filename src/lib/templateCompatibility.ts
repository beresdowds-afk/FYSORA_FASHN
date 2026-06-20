import type { WebsiteTemplate } from "@/config/websiteTemplates";

export type CompatSeverity = "breaking" | "warning" | "info";
export type CompatCode =
  | "missing_asset"
  | "unsupported_widget"
  | "layout_break"
  | "feature_loss"
  | "design_shift";

export interface CompatIssue {
  severity: CompatSeverity;
  code: CompatCode;
  message: string;
}

export interface WebsiteState {
  hero_image_url?: string | null;
  logo_url?: string | null;
  gallery_count?: number;
  category_count?: number;
  cultural_story_text?: string | null;
  has_officers?: boolean;
  has_featured_products?: boolean;
  enabled_widgets?: string[];
}

export interface CompatReport {
  issues: CompatIssue[];
  breakingCount: number;
  warningCount: number;
  infoCount: number;
  canProceed: boolean; // true when no breaking issues OR they have been acknowledged elsewhere
}

/**
 * Automatic compatibility checker — runs before the consent dialog.
 * Flags missing assets, unsupported widgets, and layout-break risks.
 */
export function checkTemplateCompatibility(
  current: WebsiteTemplate | null,
  next: WebsiteTemplate,
  state: WebsiteState = {}
): CompatReport {
  const issues: CompatIssue[] = [];

  // --- Missing assets ---
  if (!state.hero_image_url && next.design.heroStyle !== "editorial") {
    issues.push({
      severity: "warning",
      code: "missing_asset",
      message: `"${next.name}" expects a hero image — none uploaded. The hero section will fall back to a placeholder.`,
    });
  }
  if (!state.logo_url) {
    issues.push({
      severity: "info",
      code: "missing_asset",
      message: "No brand logo uploaded yet. The navigation will show your organization name as text.",
    });
  }
  if (next.design.gridColumns >= 3 && (state.gallery_count ?? 0) < next.design.gridColumns) {
    issues.push({
      severity: "warning",
      code: "missing_asset",
      message: `Template uses a ${next.design.gridColumns}-column gallery but only ${state.gallery_count ?? 0} catalogue items exist. Rows will look sparse until you add more.`,
    });
  }

  // --- Unsupported widgets / feature loss ---
  if (current) {
    if (current.design.showCulturalStory && !next.design.showCulturalStory && (state.cultural_story_text || "").trim().length > 0) {
      issues.push({
        severity: "breaking",
        code: "feature_loss",
        message: "Your cultural story section will be hidden — the new template doesn't render this widget.",
      });
    }
    if (current.design.showSustainabilityBadge && !next.design.showSustainabilityBadge) {
      issues.push({
        severity: "breaking",
        code: "feature_loss",
        message: "Sustainability badge will be removed from product cards.",
      });
    }
    if (current.design.editorialDescriptions && !next.design.editorialDescriptions) {
      issues.push({
        severity: "warning",
        code: "feature_loss",
        message: "Editorial product descriptions will be replaced by the compact catalogue layout.",
      });
    }
  }
  if (state.has_officers && next.category === "minimal") {
    issues.push({
      severity: "warning",
      code: "unsupported_widget",
      message: "Minimal templates do not render the Company Officers section — it will be hidden.",
    });
  }
  if (state.has_featured_products && next.design.gridColumns === 2) {
    issues.push({
      severity: "info",
      code: "unsupported_widget",
      message: "Featured products carousel will render in a 2-up layout (smaller thumbnails).",
    });
  }

  // --- Layout break risks ---
  if (current && current.design.imageAspect !== next.design.imageAspect && (state.gallery_count ?? 0) > 0) {
    issues.push({
      severity: "warning",
      code: "layout_break",
      message: `Product image aspect changes from ${current.design.imageAspect} to ${next.design.imageAspect}. Existing photos may be cropped or letterboxed.`,
    });
  }
  if (current && current.design.heroStyle === "fullscreen" && next.design.heroStyle === "split" && !state.hero_image_url) {
    issues.push({
      severity: "breaking",
      code: "layout_break",
      message: "Split hero requires a side image. Without one, the layout will collapse to a single column.",
    });
  }
  if ((state.category_count ?? 0) > 6 && next.design.gridColumns === 2) {
    issues.push({
      severity: "info",
      code: "layout_break",
      message: "You have many categories — they will stack vertically in this 2-column template.",
    });
  }

  // --- Design shifts (info-only) ---
  if (current && current.category !== next.category) {
    issues.push({
      severity: "info",
      code: "design_shift",
      message: `Template mood changes: ${current.category} → ${next.category}. Brand colors will be re-applied automatically.`,
    });
  }

  const breakingCount = issues.filter((i) => i.severity === "breaking").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    issues,
    breakingCount,
    warningCount,
    infoCount,
    // Always true — UI requires explicit consent regardless
    canProceed: true,
  };
}