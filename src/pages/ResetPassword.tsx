import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isPasswordLeaked, MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { resolveHomeRoute } from "@/lib/roleHome";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery event from hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type === "recovery") {
      setIsRecovery(true);
    }
    // Expired/invalid links come back with an error in the hash or query string.
    const queryParams = new URLSearchParams(window.location.search);
    if (hashParams.get("error") || queryParams.get("error")) {
      setLinkInvalid(true);
    }
    // After a refresh the hash is gone, but the recovery session may still exist.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setIsRecovery(true);
      else if (type !== "recovery") setLinkInvalid(true);
    });

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, variant: "destructive" });
      return;
    }

    setLoading(true);
    if (await isPasswordLeaked(password)) {
      setLoading(false);
      toast({ title: "Unsafe password", description: "This password has appeared in a data breach. Please choose a different one.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Password updated successfully" });
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      const home = uid ? await resolveHomeRoute(uid) : "/auth";
      setTimeout(() => navigate(home), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-ebony flex items-center justify-center px-4 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <a href="/auth" className="inline-flex items-center gap-2 text-ivory/50 hover:text-primary text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to sign in
        </a>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <span className="font-heading font-bold text-lg">FYSORA FASHN (Fashion Stitches Africa)</span>
          </div>

          {linkInvalid && !isRecovery && !success ? (
            <div className="text-center py-8">
              <h2 className="font-heading font-bold text-xl mb-2">Link expired or invalid</h2>
              <p className="text-muted-foreground text-sm mb-4">Request a new password reset link to continue.</p>
              <Button variant="hero" onClick={() => navigate("/auth")}>Back to sign in</Button>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-secondary mb-4" />
              <h2 className="font-heading font-bold text-xl mb-2">Password Updated</h2>
              <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="font-heading font-bold text-2xl mt-4 mb-1">Set New Password</h1>
              <p className="text-muted-foreground text-sm mb-6">Enter your new password below.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={MIN_PASSWORD_LENGTH} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={MIN_PASSWORD_LENGTH} className="pl-10" />
                  </div>
                </div>
                <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
