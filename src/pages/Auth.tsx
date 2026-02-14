import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Reset link sent",
          description: "Check your email for a password reset link.",
        });
        setMode("signin");
      }
      return;
    }

    const { error } = mode === "signup"
      ? await signUp(email, password, displayName)
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (mode === "signup") {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to verify your account.",
      });
    } else {
      navigate("/dashboard");
    }
  };

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    signin: { heading: "Welcome back", sub: "Sign in to manage your fashion business" },
    signup: { heading: "Create your account", sub: "Start your journey with Fashion Stitches Africa" },
    forgot: { heading: "Reset password", sub: "We'll send a reset link to your email" },
  };

  return (
    <div className="min-h-screen bg-ebony flex items-center justify-center px-4 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <a
          href="/"
          className="inline-flex items-center gap-2 text-ivory/50 hover:text-primary text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to home
        </a>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-sm">FS</span>
            </div>
            <span className="font-heading font-bold text-lg">Fashion Stitches Africa</span>
          </div>

          <h1 className="font-heading font-bold text-2xl mt-4 mb-1">
            {titles[mode].heading}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {titles[mode].sub}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name or business name"
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <Button variant="hero" className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  {mode === "forgot" ? "Sending..." : mode === "signup" ? "Creating..." : "Signing in..."}
                </span>
              ) : mode === "forgot" ? "Send Reset Link" : mode === "signup" ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "forgot" ? (
              <button
                onClick={() => setMode("signin")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
