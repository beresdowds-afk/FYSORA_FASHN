import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import fsaLogo from "@/assets/fsa-logo.png";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Browse", href: "/browse", isRoute: true },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = usePlatformSettings();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ebony/90 backdrop-blur-md border-b border-primary/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
        <a href="#" className="flex items-center gap-2">
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
        </a>

        <div className="hidden md:flex items-center gap-8">
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
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="heroOutline" size="sm" className="gap-1.5">
              <LogIn size={15} />
              Sign In
            </Button>
          </Link>
          <Link to="/auth?mode=signup">
            <Button variant="hero" size="sm" className="gap-1.5">
              <UserPlus size={15} />
              Sign Up
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden text-ivory"
          onClick={() => setIsOpen(!isOpen)}
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
            className="md:hidden bg-ebony border-t border-primary/10 overflow-hidden"
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
              <div className="flex flex-col gap-2 mt-2">
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button variant="heroOutline" className="w-full gap-1.5">
                    <LogIn size={15} />
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" className="w-full gap-1.5">
                    <UserPlus size={15} />
                    Sign Up
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
