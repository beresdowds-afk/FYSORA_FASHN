// Website Templates Registry
// Reusable design templates for native and non-native organization websites

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  preview_thumbnail?: string;
  category: "luxury" | "minimal" | "editorial" | "bold" | "classic";
  
  // Design tokens
  design: {
    // Layout
    heroStyle: "fullscreen" | "split" | "overlay" | "editorial";
    navStyle: "transparent" | "solid" | "minimal" | "editorial";
    gridColumns: 2 | 3 | 4;
    cardStyle: "rounded" | "sharp" | "editorial" | "minimal";
    
    // Typography
    fontHeadingDefault: string;
    fontBodyDefault: string;
    headingWeight: "400" | "500" | "600" | "700";
    headingCase: "none" | "uppercase" | "capitalize";
    headingSpacing: string; // letter-spacing
    
    // Color scheme
    bgBase: string;
    bgSurface: string;
    textPrimary: string;
    textSecondary: string;
    borderOpacity: string; // e.g. "0.08"
    
    // Spacing
    sectionPadding: string;
    containerMaxWidth: string;
    
    // Effects
    hoverEffect: "scale" | "fade" | "slide" | "lift" | "none";
    animationStyle: "smooth" | "dramatic" | "subtle" | "none";
    imageAspect: "portrait" | "square" | "landscape" | "auto";
    
    // Unique traits
    showSustainabilityBadge: boolean;
    showCulturalStory: boolean;
    editorialDescriptions: boolean;
    useSerifAccents: boolean;
  };
  
  // Copy / microcopy defaults
  copy: {
    heroTagline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    catalogueIntro: string;
    aboutIntro: string;
    sustainabilityNote: string;
  };
}

export const WEBSITE_TEMPLATES: Record<string, WebsiteTemplate> = {
  "hertunba-luxe": {
    id: "hertunba-luxe",
    name: "Heritage Luxe",
    description: "Hertunba-inspired premium African fashion template. Editorial layout with clean whitespace, earth tones, and luxury feel. Perfect for high-end womenswear and cultural fashion brands.",
    category: "luxury",
    design: {
      heroStyle: "fullscreen",
      navStyle: "editorial",
      gridColumns: 3,
      cardStyle: "editorial",
      fontHeadingDefault: "Playfair Display",
      fontBodyDefault: "Inter",
      headingWeight: "400",
      headingCase: "none",
      headingSpacing: "0.02em",
      bgBase: "#FDFCFA",
      bgSurface: "#F5F0EB",
      textPrimary: "#1A1A1A",
      textSecondary: "#8B7E74",
      borderOpacity: "0.08",
      sectionPadding: "py-24 lg:py-32",
      containerMaxWidth: "max-w-7xl",
      hoverEffect: "lift",
      animationStyle: "smooth",
      imageAspect: "portrait",
      showSustainabilityBadge: true,
      showCulturalStory: true,
      editorialDescriptions: true,
      useSerifAccents: true,
    },
    copy: {
      heroTagline: "Modern African Fashion for the Bold Woman",
      ctaPrimary: "Shop Now",
      ctaSecondary: "Our Story",
      catalogueIntro: "Each piece is a conversation between heritage and modernity — crafted with intention, worn with pride.",
      aboutIntro: "Born from a deep reverence for African textile traditions and a vision for modern elegance.",
      sustainabilityNote: "Ethically sourced fabrics · Zero-waste pattern cutting · Supporting artisan communities",
    },
  },

  "dark-atelier": {
    id: "dark-atelier",
    name: "Dark Atelier",
    description: "Moody, sophisticated dark theme for contemporary fashion houses. High contrast with metallic accents.",
    category: "editorial",
    design: {
      heroStyle: "fullscreen",
      navStyle: "transparent",
      gridColumns: 3,
      cardStyle: "rounded",
      fontHeadingDefault: "Inter",
      fontBodyDefault: "Inter",
      headingWeight: "700",
      headingCase: "none",
      headingSpacing: "0em",
      bgBase: "#0d0d0d",
      bgSurface: "#1a1a1a",
      textPrimary: "#ffffff",
      textSecondary: "#9ca3af",
      borderOpacity: "0.1",
      sectionPadding: "py-24",
      containerMaxWidth: "max-w-7xl",
      hoverEffect: "scale",
      animationStyle: "smooth",
      imageAspect: "auto",
      showSustainabilityBadge: false,
      showCulturalStory: false,
      editorialDescriptions: false,
      useSerifAccents: false,
    },
    copy: {
      heroTagline: "Bespoke Fashion, Redefined",
      ctaPrimary: "Book Appointment",
      ctaSecondary: "View Catalogue",
      catalogueIntro: "Explore our collections — every piece is available as a bespoke commission tailored to your measurements.",
      aboutIntro: "Crafting excellence in African fashion.",
      sustainabilityNote: "Sustainably crafted with premium African textiles",
    },
  },
};

export function getTemplate(templateId: string): WebsiteTemplate {
  return WEBSITE_TEMPLATES[templateId] || WEBSITE_TEMPLATES["dark-atelier"];
}

export function getTemplateList(): WebsiteTemplate[] {
  return Object.values(WEBSITE_TEMPLATES);
}

/**
 * Check if a template supports light backgrounds
 * (determines if we should invert text colors)
 */
export function isLightTemplate(templateId: string): boolean {
  const t = getTemplate(templateId);
  // Simple heuristic: if bgBase starts with #F or is close to white
  const bg = t.design.bgBase.toUpperCase();
  return bg.startsWith("#F") || bg.startsWith("#E") || bg === "#FFFFFF";
}
