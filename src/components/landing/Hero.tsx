import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Download, Users, Scissors, Building2, Palette, Play } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { useHeroPricing } from "@/hooks/useHeroPricing";

const Hero = () => {
  const { pricing } = useHeroPricing();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-ebony/40" />

      {/* Decorative gold line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <div className="container relative z-10 mx-auto px-4 lg:px-8 pt-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-medium">
              The Future of African Fashion Tech
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-heading font-bold leading-tight text-ivory mb-6"
          >
            Elevating African Fashion{" "}
            <span className="text-gradient-gold">Through Technology</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="text-lg sm:text-xl text-ivory/70 max-w-xl mb-8 leading-relaxed"
          >
            The operating system for African fashion commerce, connecting
            designers, tailors, organizations, and customers through AI-powered
            measurement, virtual try-on, seamless logistics, and integrated
            communication.
          </motion.p>

          {/* Role-specific CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="space-y-4"
          >
            <p className="text-ivory/50 text-sm font-medium uppercase tracking-wider">Get Started As</p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Link to="/auth?role=customer">
                <Button variant="hero" size="lg" className="text-base w-full relative overflow-hidden">
                  <Users size={18} className="mr-2" />
                  Customer
                  <ArrowRight className="ml-2" size={16} />
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md rounded-tr-md">
                    {pricing.customer?.label || "Free"}
                  </span>
                </Button>
              </Link>
              <Link to="/auth?role=designer">
                <Button
                  variant="heroOutline"
                  size="lg"
                  className="text-base w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground relative overflow-hidden group"
                >
                  <Palette size={18} className="mr-2" />
                  Designer
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md rounded-tr-md">
                    {pricing.designer?.label || "$15/mo"}
                  </span>
                </Button>
              </Link>
              <Link to="/auth?role=tailor">
                <Button
                  size="lg"
                  className="text-base w-full bg-ivory/10 border border-ivory/20 text-ivory hover:bg-ivory/20 relative overflow-hidden"
                >
                  <Scissors size={18} className="mr-2" />
                  Tailor
                  <ArrowRight className="ml-2" size={16} />
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md rounded-tr-md">
                    {pricing.tailor?.label || "$10/mo"}
                  </span>
                </Button>
              </Link>
              <Link to="/auth?role=organization">
                <Button
                  size="lg"
                  className="text-base w-full bg-ivory/10 border border-ivory/20 text-ivory hover:bg-ivory/20 relative overflow-hidden"
                >
                  <Building2 size={18} className="mr-2" />
                  Organization
                  <ArrowRight className="ml-2" size={16} />
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md rounded-tr-md">
                    Tier Based
                  </span>
                </Button>
              </Link>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link to="/platform-tour">
                <Button
                  variant="hero"
                  size="sm"
                  className="animate-pulse hover:animate-none"
                >
                  <Play size={14} className="mr-2" />
                  Take Free Platform Tour
                </Button>
              </Link>
              <Link to="/install">
                <Button
                  variant="heroOutline"
                  size="sm"
                  className="border-ivory/20 text-ivory/60 hover:bg-ivory/10 hover:text-ivory"
                >
                  <Download size={14} className="mr-2" />
                  Get the App
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-12 flex items-center gap-8 text-ivory/50 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-2xl text-primary">2K+</span>
              <span>Fashion<br />Businesses</span>
            </div>
            <div className="w-px h-10 bg-ivory/20" />
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-2xl text-primary">15+</span>
              <span>African<br />Countries</span>
            </div>
            <div className="w-px h-10 bg-ivory/20" />
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-2xl text-primary">$5M+</span>
              <span>Transactions<br />Processed</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
