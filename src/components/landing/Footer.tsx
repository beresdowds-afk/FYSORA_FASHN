import { Mail, MapPin, Phone, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import fsaLogo from "@/assets/fsa-logo.png";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

type FooterLink = { label: string; to?: string; href?: string };

const footerLinks: Record<string, FooterLink[]> = {
  Platform: [
    { label: "Features", to: "/features" },
    { label: "Pricing", to: "/pricing" },
    { label: "API Docs", to: "/docs/api" },
    { label: "Website Builder" },
    { label: "Integrations" },
  ],
  Company: [
    { label: "About Us", to: "/about" },
    { label: "Careers" },
    { label: "Blog" },
    { label: "Press" },
    { label: "Partners" },
  ],
  Support: [
    { label: "Help Center" },
    { label: "Documentation", to: "/docs/api" },
    { label: "Status" },
    { label: "Contact Us" },
    { label: "Community" },
  ],
  Legal: [
    { label: "Privacy Policy", to: "/legal" },
    { label: "Terms of Service", to: "/legal" },
    { label: "Cookie Policy", to: "/legal" },
    { label: "GDPR", to: "/legal" },
    { label: "Data Protection", to: "/legal" },
  ],
};

const Footer = () => {
  const { settings } = usePlatformSettings();
  const supportLinks: FooterLink[] = footerLinks.Support.map((l) =>
    l.label === "Contact Us" && settings.contact_email
      ? { ...l, href: `mailto:${settings.contact_email}` }
      : l,
  );
  const phoneHref = settings.contact_phone
    ? `tel:${String(settings.contact_phone).replace(/[^\d+]/g, "")}`
    : undefined;
  const mapHref = settings.contact_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.contact_address)}`
    : undefined;

  return (
    <footer id="contact" className="bg-ebony pt-20 pb-8 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-brand opacity-30" />
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 p-5 rounded-2xl bg-gradient-brand/10 border border-primary/20">
          <div className="text-center sm:text-left">
            <p className="font-heading font-semibold text-ivory text-sm">Get the {settings.platform_short_name || "FYSORA FASHN"} app</p>
            <p className="text-ivory/50 text-xs">Install on your device for the best experience.</p>
          </div>
          <Link to="/install">
            <Button variant="hero" size="sm" className="gap-1.5">
              <Download size={15} />
              Download App
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img
                src={settings.logo_url || fsaLogo}
                alt={settings.platform_name}
                className="w-9 h-9 object-contain"
              />
              <span className="font-heading font-bold text-lg text-ivory">
                {settings.platform_short_name || "FYSORA FASHN (Fashion Stitches Africa)"}
              </span>
            </div>
            <p className="text-ivory/50 text-sm leading-relaxed mb-6 max-w-xs">
              {settings.description}
            </p>
            <div className="space-y-3 text-sm text-ivory/40">
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Mail size={14} className="text-primary" />
                  {settings.contact_email}
                </a>
              )}
              {settings.contact_phone && (
                <a
                  href={phoneHref}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Phone size={14} className="text-primary" />
                  {settings.contact_phone}
                </a>
              )}
              {settings.contact_address && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <MapPin size={14} className="text-primary" />
                  {settings.contact_address}
                </a>
              )}
            </div>
          </div>

          {Object.entries({ ...footerLinks, Support: supportLinks }).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-heading font-semibold text-ivory mb-4 text-sm">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-ivory/40 hover:text-primary text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : link.href ? (
                      <a
                        href={link.href}
                        className="text-ivory/40 hover:text-primary text-sm transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <span className="text-ivory/30 text-sm cursor-default">
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-ivory/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ivory/30 text-sm">
            {settings.copyright_text}
          </p>
          <div className="flex items-center gap-2 text-xs text-ivory/20">
            <span>{settings.website_url || "app.fashionstitches.africa"}</span>
            <span>·</span>
            <span>api.fashionstitches.africa</span>
            <span>·</span>
            <span>docs.fashionstitches.africa</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
