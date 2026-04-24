import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Download, Smartphone, Check, Share, ArrowRight, Apple, Chrome, Shield, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserGlobalRole } from "@/hooks/useOrganization";
import fsaLogo from "@/assets/fsa-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const AdminInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isSuperAssistant, loading: roleLoading } = useUserGlobalRole();

  const hasAccess = isSuperAdmin || isSuperAssistant;
  const isLoading = authLoading || roleLoading;

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ebony flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-ebony flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
            <Lock size={36} className="text-destructive" />
          </div>
          <h1 className="font-heading font-bold text-2xl mb-3 text-ivory">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">You must sign in with an authorized admin account to access this app.</p>
          <Button variant="hero" onClick={() => navigate("/auth")} className="w-full">
            Sign In <ArrowRight size={16} className="ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-ebony flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
            <Shield size={36} className="text-destructive" />
          </div>
          <h1 className="font-heading font-bold text-2xl mb-3 text-ivory">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            This app is restricted to Super Admins and Super Admin Assistants only. Your current role does not have permission.
          </p>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Return to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  // Already installed — go to dashboard
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-ebony flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-6 shadow-gold">
            <Check size={36} className="text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-2xl mb-3 text-ivory">Admin App Ready</h1>
          <p className="text-muted-foreground mb-6">FSA Admin Console is installed on your device.</p>
          <Button variant="hero" onClick={() => navigate("/super-admin")} className="w-full">
            Open Admin Dashboard <ArrowRight size={16} className="ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ebony">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive via-primary to-destructive" />

      <div className="container mx-auto px-4 py-12 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="w-24 h-24 rounded-3xl bg-gradient-brand flex items-center justify-center shadow-gold overflow-hidden">
              <img src={fsaLogo} alt="FSA" className="w-16 h-16 object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive flex items-center justify-center border-2 border-ebony">
              <Shield size={14} className="text-destructive-foreground" />
            </div>
          </div>
          <h1 className="font-heading font-bold text-3xl mb-2 text-ivory">
            FSA Admin Console
          </h1>
          <p className="text-muted-foreground text-sm">
            Restricted backend management app for authorized administrators
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
            <Shield size={12} />
            Signed in as {isSuperAdmin ? "Super Admin" : "Super Assistant"}
          </div>
        </motion.div>

        {installed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl bg-secondary/10 border border-secondary/30 p-6 text-center mb-8"
          >
            <Check size={32} className="text-secondary mx-auto mb-3" />
            <h2 className="font-heading font-bold text-lg text-ivory">Successfully Installed!</h2>
            <p className="text-muted-foreground text-sm mt-1">Find FSA Admin Console on your home screen.</p>
            <Button variant="hero" onClick={() => navigate("/super-admin")} className="w-full mt-4">
              Open Dashboard <ArrowRight size={16} className="ml-2" />
            </Button>
          </motion.div>
        )}

        {!installed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            {/* Chrome / Android install */}
            {deferredPrompt && (
              <div className="rounded-xl bg-card border border-border p-6 text-center">
                <Chrome size={32} className="text-primary mx-auto mb-3" />
                <h2 className="font-heading font-bold text-lg mb-2">Install Admin Console</h2>
                <p className="text-muted-foreground text-sm mb-4">Add to your home screen for quick backend access.</p>
                <Button variant="hero" onClick={handleInstall} className="w-full">
                  <Download size={16} className="mr-2" /> Install Admin App
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

            {/* Android without prompt */}
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

            {/* Desktop install */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <div className="rounded-xl bg-card border border-border p-6 text-center">
                <Chrome size={32} className="text-primary mx-auto mb-3" />
                <h2 className="font-heading font-bold text-lg mb-2">Install Admin Console</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Use Chrome or Edge on desktop — click the install icon in the address bar, or use the browser menu → <strong>"Install FYSORA FASHN (Fashion Stitches Africa)"</strong>.
                </p>
                <div className="bg-muted rounded-lg p-4 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Or share this link with authorized admins:</p>
                  <code className="text-sm font-medium text-primary break-all">
                    {window.location.origin}/admin-install
                  </code>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/admin-install`).then(() => toast({ title: "Link copied!" }))}>
                  Copy Install Link
                </Button>
              </div>
            )}

            {/* Admin features list */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="font-heading font-semibold text-sm mb-4 text-center">Admin Console Features</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  "Organization Mgmt",
                  "User & Role Control",
                  "Revenue Analytics",
                  "Platform Pricing",
                  "Feature Flags",
                  "Audit Logs",
                  "Data Backups",
                  "API Key Vault",
                  "Subscription Rates",
                  "Exchange Rates",
                  "Dispute Oversight",
                  "Mobile App Gate",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check size={14} className="text-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick access to dashboard */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center">
              <p className="text-muted-foreground text-sm mb-3">Prefer to use in browser?</p>
              <Button variant="heroOutline" onClick={() => navigate("/super-admin")} className="w-full">
                Open Admin Dashboard →
              </Button>
            </div>
          </motion.div>
        )}

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground text-sm">
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminInstall;
