import { motion } from "framer-motion";
import { Compass, Target, Sparkles, Heart } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const pillars = [
  {
    icon: Compass,
    title: "Our Mission",
    body: "Equip every African fashion business — from the single-needle tailor in Kano to the multi-city atelier in Lagos — with the same digital infrastructure global brands take for granted.",
  },
  {
    icon: Target,
    title: "Our Vision",
    body: "An Africa where indigenous designers run world-class operations, where customers measure, order and pay with confidence, and where craft and technology lift each other.",
  },
  {
    icon: Sparkles,
    title: "How We Help Designers",
    body: "We bundle storefront, catalogue, AI measurements, video consultations, payments, logistics and analytics into one platform — so designers can focus on creating, not stitching together ten different tools.",
  },
  {
    icon: Heart,
    title: "Built In & For Africa",
    body: "Multi-currency by default, local payment gateways (Paystack, Flutterwave), WhatsApp-first communications and pricing in NGN tokens. Built with African workflows at the centre, not as an afterthought.",
  },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <span className="text-primary font-heading font-semibold text-sm uppercase tracking-widest">
              About Us
            </span>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-3 mb-5">
              FYSORA FASHN —{" "}
              <span className="text-gradient-brand">Fashion Stitches Africa</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We are building the operating system for African fashion: a
              single platform connecting designers, tailors, customers and
              organizations across the continent.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl bg-card border border-border p-7 hover:border-primary/30 hover:shadow-gold transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-brand/15 flex items-center justify-center mb-4">
                  <p.icon className="text-primary" size={22} />
                </div>
                <h2 className="font-heading font-bold text-xl mb-2">{p.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl bg-ebony text-ivory p-8 sm:p-12 text-center">
            <h3 className="font-heading font-bold text-2xl mb-3">
              The needle that traces the continent.
            </h3>
            <p className="text-ivory/70 max-w-2xl mx-auto">
              Our gold needle logo — shaped as the map of Africa — is a daily
              reminder of what we serve: every stitch, every studio, every
              story the continent has to tell.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;