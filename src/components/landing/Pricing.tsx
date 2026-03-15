import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useHeroPricing } from "@/hooks/useHeroPricing";

const PLAN_DEFS = [
  {
    roleKey: "customer",
    name: "Customer Premium",
    fallbackPrice: "$10",
    fallbackPeriod: "/year",
    description: "Unlock smart fashion tools as a customer.",
    fallbackFeatures: [
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
    roleKey: "tailor",
    name: "Tailor",
    fallbackPrice: "$29",
    fallbackPeriod: "/month",
    description: "For individual tailors working through organizations.",
    fallbackFeatures: [
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
    roleKey: "designer",
    name: "Designer",
    fallbackPrice: "$15",
    fallbackPeriod: "/month",
    description: "For independent fashion designers building their brand.",
    fallbackFeatures: [
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
    roleKey: "org_native_basic",
    name: "Organization Lite",
    fallbackPrice: "$79",
    fallbackPeriod: "/month",
    description: "Native platform website with standard branding.",
    fallbackFeatures: [
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
    roleKey: "org_native_custom",
    name: "Organization Pro",
    fallbackPrice: "$149",
    fallbackPeriod: "/month",
    description: "Native platform website with full customization & custom domain.",
    fallbackFeatures: [
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
    roleKey: "org_external",
    name: "Enterprise",
    fallbackPrice: "$249",
    fallbackPeriod: "/month",
    description: "For businesses with their own external website needing backend integration.",
    fallbackFeatures: [
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
  const { pricing, plans } = useHeroPricing();

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
          {PLAN_DEFS.map((plan, index) => {
            // Get dynamic data from subscription_rates if available
            const dynamicPlan = plans[plan.roleKey];
            const displayPrice = dynamicPlan?.price
              ? `$${dynamicPlan.price}`
              : plan.fallbackPrice;
            const displayPeriod = dynamicPlan?.cycle
              ? `/${dynamicPlan.cycle === "monthly" ? "month" : dynamicPlan.cycle === "yearly" ? "year" : dynamicPlan.cycle}`
              : plan.fallbackPeriod;
            const displayName = dynamicPlan?.planName || plan.name;
            const displayDescription = dynamicPlan?.description || plan.description;
            const displayFeatures =
              dynamicPlan?.features && dynamicPlan.features.length > 0
                ? dynamicPlan.features
                : plan.fallbackFeatures;

            return (
              <motion.div
                key={plan.roleKey}
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
                  {displayName}
                </h3>
                <p
                  className={`text-sm mb-6 ${
                    plan.popular ? "text-ivory/60" : "text-muted-foreground"
                  }`}
                >
                  {displayDescription}
                </p>

                <div className="mb-6">
                  <span
                    className={`text-4xl font-heading font-bold ${
                      plan.popular ? "text-primary" : ""
                    }`}
                  >
                    {displayPrice}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.popular ? "text-ivory/50" : "text-muted-foreground"
                    }`}
                  >
                    {displayPeriod}
                  </span>
                </div>

                <Link to={`/auth?role=${plan.role}`}>
                  <Button
                    variant={plan.popular ? "hero" : "heroOutline"}
                    className="w-full mb-8"
                  >
                    Start Free Trial
                  </Button>
                </Link>

                <ul className="space-y-3">
                  {displayFeatures.map((feature) => (
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
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
