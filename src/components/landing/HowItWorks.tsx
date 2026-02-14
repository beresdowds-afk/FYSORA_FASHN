import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Sign Up & Onboard",
    description: "Create your organization, set up your team, and follow our interactive onboarding tour to configure your business.",
  },
  {
    number: "02",
    title: "Set Up Your Shop",
    description: "Build your custom website, configure pricing in your local currency, and connect your payment gateways.",
  },
  {
    number: "03",
    title: "Manage Orders",
    description: "Receive orders, process AI measurements, manage your production workflow, and communicate with customers seamlessly.",
  },
  {
    number: "04",
    title: "Grow & Scale",
    description: "Leverage analytics, social media tools, and multi-region support to expand your fashion business globally.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-ebony relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-brand opacity-30" />
      {/* Decorative circles */}
      <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-primary/10" />
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-primary/5" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary font-heading font-semibold text-sm uppercase tracking-widest">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mt-3 mb-5 text-ivory">
            Get Started in{" "}
            <span className="text-gradient-gold">Four Simple Steps</span>
          </h2>
          <p className="text-ivory/50 text-lg">
            From sign-up to scaling globally — we make it effortless.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              <div className="text-5xl font-heading font-bold text-primary/20 mb-4">
                {step.number}
              </div>
              <h3 className="font-heading font-semibold text-xl text-ivory mb-3">
                {step.title}
              </h3>
              <p className="text-ivory/50 text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
