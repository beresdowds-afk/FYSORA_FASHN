import { useExchangeRates } from "@/hooks/useExchangeRates";

interface CurrencyDisplayProps {
  amount: number;
  currency: string;
  className?: string;
  showUsdOnly?: boolean;
}

/**
 * Displays an amount in local currency with USD equivalent.
 * Example: "₦50,000 (~$32.50)"
 */
const CurrencyDisplay = ({ amount, currency, className = "", showUsdOnly = false }: CurrencyDisplayProps) => {
  const { formatWithUSD } = useExchangeRates();
  const { local, usd } = formatWithUSD(amount, currency);

  if (showUsdOnly && usd) {
    return <span className={className}>{usd}</span>;
  }

  return (
    <span className={className}>
      {local}
      {usd && (
        <span className="text-muted-foreground text-[10px] ml-1">
          ({usd})
        </span>
      )}
    </span>
  );
};

export default CurrencyDisplay;
