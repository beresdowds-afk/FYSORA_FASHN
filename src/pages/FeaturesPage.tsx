import { motion } from "framer-motion";
import { UserPlus, Building2, Ruler, Workflow, Check } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const sections = [
  {
    icon: UserPlus,
    title: "Frictionless Onboarding",
    tagline: "From signup to first order in minutes.",
    bullets: [
      "Google one-tap sign-in with role auto-routing",
      "Guided 8-step narrated platform tour",
      "Smart onboarding wizard for organizations, designers, tailors and customers",
      "Email verification and HaveIBeenPwned password protection out of the box",
    ],
  },
  {
    icon: Building2,
    title: "True Multi-Tenancy",
    tagline: "One platform, isolated workspaces for every brand.",
    bullets: [
      "Row-level security guaranteeing org data isolation",
      "Org-scoped branding, currencies, tax and payment gateways",
      "Multi-org sign-in with organization picker",
      "Sub-domains and custom domains per organization",
    ],
  },
  {
    icon: Ruler,
    title: "AI-Powered Measurements",
    tagline: "Capture body measurements with accuracy, not guesswork.",
    bullets: [
      "Tiered models: Gemini Flash, Gemini Pro and ARCore precision",
      "360° in-call AI measurement detection during video consultations",
      "Virtual try-on with Fashn.ai and Photoroom enhancement",
      "Reusable measurement profiles per customer",
    ],
  },
  {
    icon: Workflow,
    title: "End-to-End ERP Workflow",
    tagline: "Orders, production, payments and logistics in one place.",
    bullets: [
      "9-stage production pipeline with CSV exports",
      "Tailor contracts, subcontracting and automatic agency-fee splits",
      "Integrated invoicing, payments and Paystack DVA top-ups",
      "Global logistics with carrier rates, shipments and tracking webhooks",
    ],
  },
];

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-primary font-heading font-semibold text-sm uppercase tracking-widest">
              Features
            </span>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-3 mb-5">
              Everything African fashion businesses need{" "}
              <span className="text-gradient-brand">to scale.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              From the first signup to the final shipment, FYSORA FASHN runs the
              workflow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {sections.map((s, i) => (
              <motion.section
                key={s.title}
                id={s.title.toLowerCase().replace(/[^a-z]+/g, "-")}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-2xl bg-card border border-border p-8 hover:border-primary/30 hover:shadow-gold transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-brand/15 flex items-center justify-center mb-5">
                  <s.icon className="text-primary" size={24} />
                </div>
                <h2 className="font-heading font-bold text-2xl mb-2">{s.title}</h2>
                <p className="text-muted-foreground mb-6">{s.tagline}</p>
                <ul className="space-y-3">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <Check size={18} className="text-secondary mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground/80">{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FeaturesPage;