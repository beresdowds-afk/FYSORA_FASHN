import { Scissors, Instagram, Phone, Mail, Menu } from "lucide-react";

interface BrandingLivePreviewProps {
  orgName: string;
  logoUrl?: string | null;
  brandColor: string;
  accentColor: string;
  palette: Record<string, string>;
  fontHeading: string;
  fontBody: string;
  tagline?: string;
  description?: string | null;
  visionStatement?: string | null;
  missionStatement?: string | null;
}

const BrandingLivePreview = ({
  orgName,
  logoUrl,
  brandColor,
  accentColor,
  palette,
  fontHeading,
  fontBody,
  tagline,
  description,
  visionStatement,
  missionStatement,
}: BrandingLivePreviewProps) => {
  const bgColor = palette.background || "#0d0d0d";
  const textColor = palette.text_color || "#ffffff";
  const surfaceColor = palette.surface || "#1a1a1a";
  const tertiaryColor = palette.tertiary || "#6366F1";

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-lg">
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono ml-2 truncate">yoursite.fashionstitches.africa</span>
      </div>

      <div
        className="overflow-hidden text-xs"
        style={{ backgroundColor: bgColor, color: textColor, fontFamily: fontBody, maxHeight: 420 }}
      >
        {/* Mini Nav */}
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: `${textColor}15` }}>
          <div className="flex items-center gap-1.5">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-4 h-4 rounded-full object-contain" />
            ) : (
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                <Scissors size={8} className="text-white" />
              </div>
            )}
            <span className="font-bold text-[10px]" style={{ color: accentColor, fontFamily: fontHeading }}>{orgName}</span>
          </div>
          <Menu size={12} style={{ color: textColor, opacity: 0.5 }} />
        </div>

        {/* Mini Hero */}
        <div className="px-4 py-6 relative">
          <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at 30% 50%, ${brandColor} 0%, transparent 60%)` }} />
          <div className="relative">
            <div className="flex items-center gap-1 mb-2">
              <div className="h-px w-4" style={{ background: accentColor }} />
              <span className="text-[8px] font-semibold uppercase tracking-widest" style={{ color: accentColor }}>Est. 2025</span>
            </div>
            <h2 className="font-bold text-lg leading-tight mb-1" style={{ fontFamily: fontHeading }}>{orgName}</h2>
            {tagline && <p className="text-[10px] mb-1" style={{ color: accentColor }}>{tagline}</p>}
            {description && <p className="text-[9px] leading-relaxed opacity-60 mb-2 line-clamp-2">{description}</p>}
            <div className="flex gap-1.5">
              <div className="px-3 py-1 rounded-full text-[8px] font-semibold text-white" style={{ background: brandColor }}>
                Book Now
              </div>
              <div className="px-3 py-1 rounded-full text-[8px] font-semibold border" style={{ borderColor: accentColor, color: accentColor }}>
                Catalogue
              </div>
            </div>
          </div>
        </div>

        {/* Mini Services */}
        <div className="px-4 py-3 border-t" style={{ borderColor: `${textColor}10` }}>
          <p className="text-[9px] font-bold text-center mb-2" style={{ fontFamily: fontHeading }}>What We Offer</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Tailoring", color: brandColor },
              { label: "Consultations", color: accentColor },
              { label: "Textiles", color: tertiaryColor },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-1.5 text-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}20` }}>
                <div className="w-3 h-3 rounded mx-auto mb-1" style={{ background: `${s.color}30` }} />
                <span className="text-[7px] font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Vision & Mission */}
        {(visionStatement || missionStatement) && (
          <div className="px-4 py-3 border-t" style={{ borderColor: `${textColor}10` }}>
            <div className="grid grid-cols-2 gap-2">
              {visionStatement && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-px w-2" style={{ background: accentColor }} />
                    <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>Vision</span>
                  </div>
                  <p className="text-[7px] opacity-60 line-clamp-2">{visionStatement}</p>
                </div>
              )}
              {missionStatement && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-px w-2" style={{ background: brandColor }} />
                    <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: brandColor }}>Mission</span>
                  </div>
                  <p className="text-[7px] opacity-60 line-clamp-2">{missionStatement}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mini CTA */}
        <div className="px-4 py-3 mx-3 mb-3 rounded-lg text-center" style={{ background: `linear-gradient(135deg, ${brandColor}22, ${accentColor}11)`, border: `1px solid ${textColor}10` }}>
          <p className="text-[9px] font-bold mb-1" style={{ fontFamily: fontHeading }}>Ready to Start?</p>
          <div className="inline-block px-3 py-1 rounded-full text-[7px] font-semibold text-white" style={{ background: brandColor }}>
            Book Now
          </div>
        </div>

        {/* Mini Footer */}
        <div className="px-4 py-2 border-t" style={{ borderColor: `${textColor}10`, background: surfaceColor }}>
          <div className="flex items-center justify-between">
            <span className="text-[7px] opacity-40">© {orgName}</span>
            <div className="flex gap-1 opacity-40">
              <Instagram size={8} />
              <Phone size={8} />
              <Mail size={8} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingLivePreview;
