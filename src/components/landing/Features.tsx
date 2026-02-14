import { motion } from "framer-motion";
import {
  Users,
  Globe,
  CreditCard,
  Smartphone,
  BarChart3,
  Shield,
  Palette,
  Zap,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Multi-Tenant Platform",
    description: "Isolated organization spaces with role-based access for SuperAdmins, OrgAdmins, Tailors & Customers.",
  },
  {
    icon: Globe,
    title: "Multi-Region & Currency",
    description: "Automatic currency conversion and localized pricing across 15+ African countries and beyond.",
  },
  {
    icon: CreditCard,
    title: "Integrated Billing",
    description: "Stripe & Paystack integration with subscription management, invoicing, and usage-based charges.",
  },
  {
    icon: Zap,
    title: "AI Measurements",
    description: "Cloud-powered AI measurement processing for accurate, contactless body measurements.",
  },
  {
    icon: MessageSquare,
    title: "Omnichannel Comms",
    description: "WhatsApp, VoIP, Email & SMS integration with a unified inbox and real-time notifications.",
  },
  {
    icon: Palette,
    title: "Website Builder",
    description: "Drag-and-drop builder with custom domains, templates, and auto-generated REST APIs.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time analytics for sales, workflows, social media, and communication performance.",
  },
  {
    icon: Smartphone,
    title: "Social Media Hub",
    description: "Multi-platform social media management with scheduling, analytics, and campaign tools.",
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description: "GDPR + African data protection compliance, audit logging, and encrypted data at rest.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Features = () => {
  return (
    <section id="features" className="py-24 bg-background relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-brand opacity-30" />
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary font-heading font-semibold text-sm uppercase tracking-widest">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mt-3 mb-5">
            Everything You Need to{" "}
            <span className="text-gradient-brand">Scale Your Fashion Business</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            From order management to AI-powered measurements, our platform
            provides end-to-end solutions for African fashion enterprises.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-gold transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="text-primary-foreground" size={22} />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
