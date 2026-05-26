import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Pricing from "@/components/landing/Pricing";

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto px-4 mb-4"
        >
          <span className="text-primary font-heading font-semibold text-sm uppercase tracking-widest">
            Subscription Plans
          </span>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-3 mb-4">
            Simple monthly pricing.{" "}
            <span className="text-gradient-brand">No surprises.</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Checkout is processed via Stripe (international) and Paystack
            (Africa) automatically based on your region.
          </p>
        </motion.div>
        <Pricing />
        <div className="container mx-auto px-4 lg:px-8 pb-20 max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground text-center">
            <p className="mb-2 font-medium text-foreground">
              Secure checkout, your way.
            </p>
            <p>
              Selecting a plan starts a 14-day free trial and routes you to
              Stripe or Paystack at the activation step. You can switch
              gateways anytime from your billing settings.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;