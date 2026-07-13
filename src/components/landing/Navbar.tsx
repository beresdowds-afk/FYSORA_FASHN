import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, Download, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import fsaLogo from "@/assets/fsa-logo.png";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Visit landing page", href: "/landing", isRoute: true },
  { label: "Features", href: "/features", isRoute: true },
  { label: "Pricing", href: "/pricing", isRoute: true },
  { label: "About", href: "/about", isRoute: true },
  { label: "Browse", href: "/browse", isRoute: true },
];

const mobileExtraLinks = [
  { label: "API Docs", href: "/docs/api" },
  { label: "Legal", href: "/legal" },
  { label: "Install App", href: "/install" },
  { label: "Platform Tour", href: "/platform-tour" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = usePlatformSettings();
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ebony/90 backdrop-blur-md border-b border-primary/10">
      <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 lg:px-8 gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={settings.logo_url || fsaLogo}
            alt={settings.platform_name}
            className="w-9 h-9 object-contain"
          />
          <span className="font-heading font-bold text-lg text-ivory">
            {settings.platform_short_name ? (
              <>
                {settings.platform_short_name.split(" ")[0]}
                <span className="text-gradient-gold"> {settings.platform_short_name.split(" ").slice(1).join(" ")}</span>
              </>
            ) : (
              <>FYSORA<span className="text-gradient-gold"> FASHN</span></>
            )}
          </span>
        </Link>

        <div className="hidden md:flex items-center justify-center gap-6">
          {navLinks.map((link) =>
            (link as any).isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-ivory/70 hover:text-primary transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-ivory/70 hover:text-primary transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            )
          )}
          <Link to="/install">
            <Button variant="heroOutline" size="sm" className="gap-1.5">
              <Download size={15} />
              Download App
            </Button>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3 justify-end">
          {user && (
            <Link to="/account/security" title="Account & Security">
              <Button variant="ghost" size="sm" className="gap-1.5 text-ivory/80 hover:text-primary">
                <ShieldCheck size={15} />
                <span className="hidden lg:inline">Security</span>
              </Button>
            </Link>
          )}
          <Link to="/auth">
            <Button variant="hero" size="sm" className="gap-1.5">
              <LogIn size={15} />
              Sign In / Sign Up
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden text-ivory col-start-3 justify-self-end"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-ebony border-t border-primary/10 overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="flex flex-col gap-4 p-4">
              {navLinks.map((link) =>
                (link as any).isRoute ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="text-ivory/70 hover:text-primary transition-colors text-sm font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-ivory/70 hover:text-primary transition-colors text-sm font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              )}
              <div className="h-px bg-ivory/10 my-1" />
              {mobileExtraLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-ivory/70 hover:text-primary transition-colors text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-2">
                {user && (
                  <Link to="/account/security" onClick={() => setIsOpen(false)}>
                    <Button variant="heroOutline" className="w-full gap-1.5">
                      <ShieldCheck size={15} />
                      Account &amp; Security
                    </Button>
                  </Link>
                )}
                <Link to="/install" onClick={() => setIsOpen(false)}>
                  <Button variant="heroOutline" className="w-full gap-1.5">
                    <Download size={15} />
                    Download App
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" className="w-full gap-1.5">
                    <LogIn size={15} />
                    Sign In / Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
