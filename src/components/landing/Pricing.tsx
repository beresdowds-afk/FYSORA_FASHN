import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Customer Premium",
    price: "$10",
    period: "/year",
    description: "Unlock smart fashion tools as a customer.",
    features: [
      "AI Body Measurements",
      "Virtual Try-On",
      "Video Consultations",
      "Priority Order Tracking",
      "Direct Messaging",
      "Dispute Resolution",
    ],
    popular: false,
    role: "customer",
  },
  {
    name: "Tailor",
    price: "$29",
    period: "/month",
    description: "For individual tailors working through organizations.",
    features: [
      "Order Management",
      "Customer Profiles",
      "Measurement Tracking",
      "Basic Analytics",
      "Email Support",
      "1 Currency",
    ],
    popular: false,
    role: "tailor",
  },
  {
    name: "Designer",
    price: "$15",
    period: "/month",
    description: "For independent fashion designers building their brand.",
    features: [
      "Personal Portfolio Website",
      "Catalogue Showcase",
      "AI Measurements",
      "Customer Management",
      "Order Tracking",
      "Direct Messaging",
    ],
    popular: false,
    role: "designer",
  },
  {
    name: "Organization Lite",
    price: "$79",
    period: "/month",
    description: "Native platform website with standard branding.",
    features: [
      "10 Team Members",
      "Unlimited Orders",
      "Free Subdomain",
      "Standard Branding",
      "Multi-Currency",
      "AI Measurements",
      "WhatsApp Integration",
    ],
    popular: true,
    role: "organization",
    tier: "org_native_basic",
  },
  {
    name: "Organization Pro",
    price: "$149",
    period: "/month",
    description: "Native platform website with full customization & custom domain.",
    features: [
      "Unlimited Team",
      "Custom Domain",
      "Full Brand Customization",
      "Advanced Analytics",
      "Priority Support",
      "All Currencies",
      "API Access",
      "VoIP & SMS",
    ],
    popular: false,
    role: "organization",
    tier: "org_native_custom",
  },
  {
    name: "Enterprise",
    price: "$249",
    period: "/month",
    description: "For businesses with their own external website needing backend integration.",
    features: [
      "External Website Integration",
      "Embed Widget & API",
      "White-label Solution",
      "Dedicated Support",
      "SLA Guarantee",
      "Custom Analytics",
      "Social Media Hub",
      "Full Platform Access",
    ],
    popular: false,
    role: "organization",
    tier: "org_external",
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-background relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-brand opacity-30" />
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary font-heading font-semibold text-sm uppercase tracking-widest">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mt-3 mb-5">
            Plans That Grow{" "}
            <span className="text-gradient-brand">With Your Business</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free, upgrade when you're ready. All plans include a 14-day trial.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                plan.popular
                  ? "bg-ebony border-primary shadow-brand scale-105"
                  : "bg-card border-border hover:border-primary/30 hover:shadow-gold"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-brand px-4 py-1 rounded-full flex items-center gap-1">
                  <Star size={14} className="text-primary-foreground" />
                  <span className="text-xs font-heading font-semibold text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              <h3
                className={`font-heading font-bold text-xl mb-2 ${
                  plan.popular ? "text-ivory" : ""
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-6 ${
                  plan.popular ? "text-ivory/60" : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-6">
                <span
                  className={`text-4xl font-heading font-bold ${
                    plan.popular ? "text-primary" : ""
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ${
                    plan.popular ? "text-ivory/50" : "text-muted-foreground"
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              <Link to={`/auth?role=${(plan as any).role || "organization"}`}>
                <Button
                  variant={plan.popular ? "hero" : "heroOutline"}
                  className="w-full mb-8"
                >
                  Start Free Trial
                </Button>
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check
                      size={16}
                      className={plan.popular ? "text-primary" : "text-secondary"}
                    />
                    <span
                      className={`text-sm ${
                        plan.popular ? "text-ivory/70" : "text-muted-foreground"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
