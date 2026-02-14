import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const CtaBanner = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-brand opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_60%)]" />

      {/* Decorative elements */}
      <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full border border-primary-foreground/10" />
      <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full border border-primary-foreground/10" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-primary-foreground" />
            <span className="text-primary-foreground/80 text-sm font-medium">
              Limited Early Access
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-primary-foreground mb-4">
            Be the First to Transform Your Fashion Business
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-lg mx-auto">
            Join thousands of African fashion entrepreneurs. Sign up for early
            access and get 3 months free on any plan.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary-foreground/10 rounded-xl p-6 border border-primary-foreground/20"
            >
              <p className="text-primary-foreground font-heading font-semibold text-lg">
                🎉 You're on the list!
              </p>
              <p className="text-primary-foreground/60 text-sm mt-1">
                We'll notify you when early access opens.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:ring-primary-foreground/30"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 bg-ebony text-ivory hover:bg-ebony/90 font-heading font-semibold shrink-0"
              >
                Get Early Access
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </form>
          )}

          <p className="text-primary-foreground/40 text-xs mt-4">
            No spam, ever. Unsubscribe anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaBanner;
