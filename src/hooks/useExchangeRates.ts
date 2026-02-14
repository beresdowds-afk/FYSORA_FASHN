import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

export const useExchangeRates = () => {
  const [rates, setRates] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      const { data } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("base_currency", "NGN");

      if (data && data.length > 0) {
        const rateMap = new Map<string, number>();
        data.forEach((r: ExchangeRate) => {
          rateMap.set(r.target_currency, r.rate);
        });
        setRates(rateMap);
        setLastFetched(data[0].fetched_at);
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  /**
   * Convert an amount from a source currency to a target currency.
   * All rates are stored as NGN -> target, so:
   * - NGN to USD: amount * rate(USD)
   * - GHS to USD: (amount / rate(GHS)) * rate(USD)  [convert to NGN first]
   */
  const convert = (amount: number, fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) return amount;
    if (rates.size === 0) return null;

    // Convert to NGN base first
    let amountInNGN = amount;
    if (fromCurrency !== "NGN") {
      const fromRate = rates.get(fromCurrency);
      if (!fromRate || fromRate === 0) return null;
      amountInNGN = amount / fromRate; // reverse: NGN = amount / (NGN->fromCurrency rate)
    }

    // Convert from NGN to target
    if (toCurrency === "NGN") return amountInNGN;
    const toRate = rates.get(toCurrency);
    if (!toRate) return null;
    return amountInNGN * toRate;
  };

  /**
   * Format amount with currency conversion display.
   * Returns: "₦50,000 (~$32.50)"
   */
  const formatWithUSD = (amount: number, currency: string): { local: string; usd: string | null } => {
    const local = `${Number(amount).toLocaleString()} ${currency}`;
    if (currency === "USD") return { local, usd: null };

    const usdAmount = convert(amount, currency, "USD");
    const usd = usdAmount !== null ? `~$${usdAmount.toFixed(2)}` : null;
    return { local, usd };
  };

  return { rates, loading, lastFetched, convert, formatWithUSD };
};
