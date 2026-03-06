import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for individual tailors getting started.",
    features: [
      "1 Team Member",
      "100 Orders/month",
      "Basic Analytics",
      "Email Support",
      "1 Currency",
      "Free Subdomain",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing fashion businesses ready to scale.",
    features: [
      "10 Team Members",
      "Unlimited Orders",
      "Advanced Analytics",
      "Priority Support",
      "Multi-Currency",
      "Custom Domain",
      "AI Measurements",
      "WhatsApp Integration",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For established businesses with complex needs.",
    features: [
      "Unlimited Team",
      "Unlimited Everything",
      "Custom Analytics",
      "Dedicated Support",
      "All Currencies",
      "White-label Solution",
      "API Access",
      "VoIP & SMS",
      "Social Media Hub",
      "SLA Guarantee",
    ],
    popular: false,
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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

              <Link to={`/auth?role=${plan.popular ? "organization" : plan.name === "Starter" ? "tailor" : "organization"}`}>
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
