import { Mail, MapPin, Phone } from "lucide-react";
import fsaLogo from "@/assets/fsa-logo.png";

const footerLinks = {
  Platform: ["Features", "Pricing", "API Docs", "Website Builder", "Integrations"],
  Company: ["About Us", "Careers", "Blog", "Press", "Partners"],
  Support: ["Help Center", "Documentation", "Status", "Contact Us", "Community"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR", "Data Protection"],
};

const Footer = () => {
  return (
    <footer id="contact" className="bg-ebony pt-20 pb-8 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-brand opacity-30" />
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src={fsaLogo} alt="Fashion Stitches Africa" className="w-9 h-9 object-contain" />
              <span className="font-heading font-bold text-lg text-ivory">
                Fashion Stitches
              </span>
            </div>
            <p className="text-ivory/50 text-sm leading-relaxed mb-6 max-w-xs">
              Digitizing and scaling African fashion businesses through innovative
              technology solutions since 2024.
            </p>
            <div className="space-y-3 text-sm text-ivory/40">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary" />
                hello@fashionstitches.africa
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                +234 800 123 4567
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                Lagos, Nigeria
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-heading font-semibold text-ivory mb-4 text-sm">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-ivory/40 hover:text-primary text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-ivory/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ivory/30 text-sm">
            © 2024 Fashion Stitches Africa. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-ivory/20">
            <span>app.fashionstitches.africa</span>
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
