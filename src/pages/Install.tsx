import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Download, Smartphone, Check, Share, ArrowRight, Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-2xl mb-3">You're All Set!</h1>
          <p className="text-muted-foreground mb-6">FYSORA FASHN (Fashion Stitches Africa) is installed on your device.</p>
          <Button variant="hero" onClick={() => navigate("/auth")} className="w-full">
            Get Started <ArrowRight size={16} className="ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />
      
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-brand flex items-center justify-center mx-auto mb-6 shadow-gold">
            <span className="font-heading font-bold text-primary-foreground text-2xl">FS</span>
          </div>
          <h1 className="font-heading font-bold text-3xl mb-2">FYSORA FASHN (Fashion Stitches Africa)</h1>
          <p className="text-muted-foreground">
            The operating system for African fashion commerce
          </p>
        </motion.div>

        {installed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl bg-secondary/10 border border-secondary/30 p-6 text-center mb-8"
          >
            <Check size={32} className="text-secondary mx-auto mb-3" />
            <h2 className="font-heading font-bold text-lg">Successfully Installed!</h2>
            <p className="text-muted-foreground text-sm mt-1">Find FYSORA FASHN (Fashion Stitches Africa) on your home screen.</p>
          </motion.div>
        )}

        {!installed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            {/* Android / Chrome install */}
            {deferredPrompt && (
              <div className="rounded-xl bg-card border border-border p-6 text-center">
                <Chrome size={32} className="text-primary mx-auto mb-3" />
                <h2 className="font-heading font-bold text-lg mb-2">Install Now</h2>
                <p className="text-muted-foreground text-sm mb-4">Add to your home screen for the best experience.</p>
                <Button variant="hero" onClick={handleInstall} className="w-full">
                  <Download size={16} className="mr-2" /> Install App
                </Button>
              </div>
            )}

            {/* iOS instructions */}
            {isIOS && !deferredPrompt && (
              <div className="rounded-xl bg-card border border-border p-6">
                <Apple size={32} className="text-foreground mx-auto mb-3" />
                <h2 className="font-heading font-bold text-lg mb-3 text-center">Install on iPhone / iPad</h2>
                <ol className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">1</span>
                    <span>Tap the <Share size={14} className="inline text-primary" /> <strong>Share</strong> button at the bottom of Safari</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">3</span>
                    <span>Tap <strong>"Add"</strong> to confirm</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Android without prompt (fallback) */}
            {isAndroid && !deferredPrompt && (
              <div className="rounded-xl bg-card border border-border p-6">
                <Smartphone size={32} className="text-primary mx-auto mb-3" />
                <h2 className="font-heading font-bold text-lg mb-3 text-center">Install on Android</h2>
                <ol className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">1</span>
                    <span>Tap the <strong>⋮ menu</strong> (3 dots) in your browser</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">2</span>
                    <span>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">3</span>
                    <span>Tap <strong>"Install"</strong> to confirm</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Desktop fallback */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <div className="rounded-xl bg-card border border-border p-6 text-center">
                <Smartphone size={32} className="text-primary mx-auto mb-3" />
                <h2 className="font-heading font-bold text-lg mb-2">Get the App</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Open this page on your mobile device to install FYSORA FASHN (Fashion Stitches Africa).
                </p>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-2">Share this link:</p>
                  <code className="text-sm font-medium text-primary break-all">
                    {window.location.origin}/install
                  </code>
                </div>
              </div>
            )}

            {/* Features list */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="font-heading font-semibold text-sm mb-4 text-center">What You Get</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  "AI Measurements",
                  "Virtual Try-On",
                  "Order Tracking",
                  "Video Consultations",
                  "Catalogue Browsing",
                  "Secure Payments",
                  "Push Notifications",
                  "Offline Support",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check size={14} className="text-secondary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="text-center mt-8 space-y-2">
          <Button variant="outline" onClick={() => navigate("/platform-catalogue")} className="w-full max-w-xs text-sm">
            Browse Platform Catalogue
          </Button>
          <div>
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground text-sm">
              Continue in Browser →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Install;
