import { useExchangeRates } from "@/hooks/useExchangeRates";
import { motion } from "framer-motion";
import { Globe, Clock } from "lucide-react";

const currencyNames: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  GHS: "Ghanaian Cedi",
  KES: "Kenyan Shilling",
  ZAR: "South African Rand",
};

const OrgExchangeRates = () => {
  const { rates, loading, lastFetched } = useExchangeRates();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rates.size === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-12 text-center">
        <Globe size={40} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Exchange rates not available yet.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <Globe size={18} className="text-primary" /> Exchange Rates
        </h3>
        {lastFetched && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock size={10} /> Updated {new Date(lastFetched).toLocaleString()}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from(rates.entries()).map(([currency, rate]) => (
          <div key={currency} className="p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="font-heading font-bold text-[10px] text-primary">{currency}</span>
              </div>
              <span className="text-xs text-muted-foreground">{currencyNames[currency] || currency}</span>
            </div>
            <p className="text-sm font-bold">
              {rate < 0.01 ? rate.toFixed(6) : rate.toFixed(4)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              1 {currency} = {(1 / rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} NGN
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default OrgExchangeRates;
