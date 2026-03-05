import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
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

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button variant="hero" size="lg" className="text-base">
              Start Free Trial
              <ArrowRight className="ml-2" size={18} />
            </Button>
            <Button
              variant="heroOutline"
              size="lg"
              className="text-base border-ivory/30 text-ivory hover:bg-ivory/10 hover:text-ivory"
            >
              <Play size={18} className="mr-2" />
              Watch Demo
            </Button>
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
