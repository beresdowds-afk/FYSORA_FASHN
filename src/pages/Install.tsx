import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Download, Smartphone, Check, Share, ArrowRight, Apple, Chrome, Monitor, Plus, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Helmet } from "react-helmet-async";

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
      <Helmet>
        <title>Install the FYSORA FASHN App — iOS, Android &amp; Desktop</title>
        <meta name="description" content="Step-by-step instructions to install the FYSORA FASHN (Fashion Stitches Africa) progressive web app on iPhone, Android, Windows, macOS and Linux." />
        <link rel="canonical" href="https://fs-africa.org.ng/install" />
      </Helmet>
      <Navbar />
      <div className="h-16" />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-brand flex items-center justify-center mx-auto mb-6 shadow-gold">
            <span className="font-heading font-bold text-primary-foreground text-2xl">FS</span>
          </div>
          <h1 className="font-heading font-bold text-3xl mb-2">Install the FYSORA FASHN App</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A lightweight Progressive Web App — under 1MB, installs in seconds, works offline.
            Pick your platform below for step&#8209;by&#8209;step instructions.
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

            <PlatformCard
              icon={<Apple size={28} />}
              title="iPhone &amp; iPad"
              subtitle="Safari · iOS 13+"
              highlight={isIOS}
              illustration={<IosScreenshot />}
              steps={[
                <>Open <strong>fs-africa.org.ng</strong> in <strong>Safari</strong>.</>,
                <>Tap the <Share size={14} className="inline text-primary mx-0.5" /> <strong>Share</strong> icon in the toolbar.</>,
                <>Scroll and select <strong>“Add to Home Screen”</strong>.</>,
                <>Tap <strong>Add</strong>. The FSA icon appears on your home screen.</>,
              ]}
            />

            <PlatformCard
              icon={<Smartphone size={28} />}
              title="Android"
              subtitle="Chrome · Edge · Samsung Internet"
              highlight={isAndroid}
              illustration={<AndroidScreenshot />}
              steps={[
                <>Open the site in <strong>Chrome</strong> (or any Chromium browser).</>,
                <>If you see a banner, tap <strong>Install</strong>. Otherwise tap the <MoreVertical size={14} className="inline mx-0.5" /> menu.</>,
                <>Choose <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong>.</>,
                <>Confirm with <strong>Install</strong>. FSA launches like a native app.</>,
              ]}
              action={deferredPrompt ? (
                <Button variant="hero" onClick={handleInstall} className="w-full">
                  <Download size={16} className="mr-2" /> Install Now
                </Button>
              ) : undefined}
            />

            <PlatformCard
              icon={<Monitor size={28} />}
              title="Windows, macOS &amp; Linux"
              subtitle="Chrome · Edge · Brave · Arc"
              highlight={!isIOS && !isAndroid}
              illustration={<DesktopScreenshot />}
              steps={[
                <>Open <strong>fs-africa.org.ng</strong> in a Chromium browser.</>,
                <>Click the <Plus size={14} className="inline mx-0.5" /> install icon at the right of the address bar.</>,
                <>Click <strong>Install</strong>. FSA opens in its own window and gets a dock/taskbar icon.</>,
              ]}
            />

            <div className="rounded-xl bg-muted/40 border border-border p-5 text-center text-xs text-muted-foreground">
              <p className="mb-2">Prefer to share with someone else? Send them this page:</p>
              <code className="text-sm font-medium text-primary break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/install
              </code>
            </div>

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
      <Footer />
    </div>
  );
};

export default Install;

function PlatformCard({
  icon, title, subtitle, steps, highlight, illustration, action,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
  steps: React.ReactNode[];
  highlight?: boolean;
  illustration: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-card border p-6 transition-all ${highlight ? "border-primary shadow-gold" : "border-border"}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-heading font-bold text-lg leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {highlight && (
          <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Detected
          </span>
        )}
      </div>
      <div className="grid sm:grid-cols-[1fr,180px] gap-5 items-start">
        <ol className="space-y-3 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[11px]">{i + 1}</span>
              <span className="text-muted-foreground leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
        <div className="hidden sm:block">{illustration}</div>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Lightweight SVG-ish illustrations so we don't need real screenshot assets.
function IosScreenshot() {
  return (
    <div className="rounded-[2rem] border-4 border-foreground/80 bg-gradient-to-b from-muted to-background p-2 aspect-[9/16] flex flex-col">
      <div className="h-3 mx-auto w-12 bg-foreground/80 rounded-full mb-2" />
      <div className="flex-1 rounded-xl bg-card border border-border p-2 grid grid-cols-3 gap-1 content-start">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={`aspect-square rounded ${i === 4 ? "bg-gradient-brand shadow-gold" : "bg-muted"}`} />
        ))}
      </div>
      <div className="text-[8px] text-center text-muted-foreground mt-1">Home Screen</div>
    </div>
  );
}
function AndroidScreenshot() {
  return (
    <div className="rounded-2xl border-4 border-foreground/80 bg-gradient-to-b from-muted to-background p-2 aspect-[9/16] flex flex-col">
      <div className="h-2 flex justify-end gap-0.5 mb-2">
        <div className="w-1 h-1 rounded-full bg-foreground/70" />
        <div className="w-1 h-1 rounded-full bg-foreground/70" />
        <div className="w-1 h-1 rounded-full bg-foreground/70" />
      </div>
      <div className="rounded-md bg-card border border-border p-1.5 mb-2 text-[8px] text-muted-foreground flex items-center gap-1">
        <Download size={8} className="text-primary" /> Install app
      </div>
      <div className="flex-1 rounded-xl bg-card border border-border grid grid-cols-4 gap-1 p-1.5 content-start">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`aspect-square rounded ${i === 5 ? "bg-gradient-brand shadow-gold" : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}
function DesktopScreenshot() {
  return (
    <div className="rounded-xl border-2 border-foreground/80 bg-gradient-to-b from-muted to-background overflow-hidden">
      <div className="bg-foreground/80 h-4 flex items-center gap-1 px-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-destructive/80" />
        <div className="w-1.5 h-1.5 rounded-full bg-primary/80" />
        <div className="w-1.5 h-1.5 rounded-full bg-secondary/80" />
        <div className="ml-2 flex-1 h-2 bg-background/30 rounded text-[6px]" />
        <Plus size={8} className="text-background" />
      </div>
      <div className="p-2 aspect-[16/10]">
        <div className="rounded bg-card border border-border h-full grid grid-cols-3 gap-1 p-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`rounded ${i === 1 ? "bg-gradient-brand" : "bg-muted"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
