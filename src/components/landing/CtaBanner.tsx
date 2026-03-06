import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Users, Scissors, Building2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CtaBanner = () => {
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
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-primary-foreground" />
            <span className="text-primary-foreground/80 text-sm font-medium">
              Free Registration · Instant Access
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-primary-foreground mb-4">
            Join the Future of African Fashion
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-10 max-w-lg mx-auto">
            Whether you're a customer looking for bespoke fashion, a skilled tailor, or running a fashion house — we have the tools for you.
          </p>

          {/* Role-specific CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Link to="/auth?role=customer" className="group">
              <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-6 hover:bg-primary-foreground/10 transition-colors">
                <Users size={28} className="mx-auto text-primary-foreground mb-3" />
                <h3 className="font-heading font-bold text-primary-foreground text-lg mb-1">Customer</h3>
                <p className="text-primary-foreground/60 text-xs mb-4">Free signup · Browse & order from top tailors</p>
                <Button
                  size="sm"
                  className="w-full bg-ebony text-ivory hover:bg-ebony/90 font-heading font-semibold"
                >
                  Sign Up Free
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </Link>

            <Link to="/auth?role=tailor" className="group">
              <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-6 hover:bg-primary-foreground/10 transition-colors">
                <Scissors size={28} className="mx-auto text-primary-foreground mb-3" />
                <h3 className="font-heading font-bold text-primary-foreground text-lg mb-1">Tailor</h3>
                <p className="text-primary-foreground/60 text-xs mb-4">Manage orders · AI tools · Grow your craft</p>
                <Button
                  size="sm"
                  className="w-full bg-ebony text-ivory hover:bg-ebony/90 font-heading font-semibold"
                >
                  Register as Tailor
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </Link>

            <Link to="/auth?role=organization" className="group">
              <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-6 hover:bg-primary-foreground/10 transition-colors">
                <Building2 size={28} className="mx-auto text-primary-foreground mb-3" />
                <h3 className="font-heading font-bold text-primary-foreground text-lg mb-1">Organization</h3>
                <p className="text-primary-foreground/60 text-xs mb-4">Full dashboard · Team management · Analytics</p>
                <Button
                  size="sm"
                  className="w-full bg-ebony text-ivory hover:bg-ebony/90 font-heading font-semibold"
                >
                  Create Organization
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </Link>
          </div>

          <p className="text-primary-foreground/40 text-xs mt-6">
            All accounts start free. Premium features available via subscription.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaBanner;
