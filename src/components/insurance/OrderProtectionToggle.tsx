import { Shield, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePremiumQuote } from "@/hooks/useInsurance";
import { useInsuranceFlag } from "@/hooks/useInsuranceFlags";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import { cn } from "@/lib/utils";

interface Props {
  orderValue: number;
  currency?: string;
  enabled: boolean;
  onChange: (next: boolean, premium: number) => void;
  className?: string;
}

/**
 * Customer checkout toggle for Order Protection.
 * Hidden when the order_protection feature flag is off or order ineligible.
 */
export default function OrderProtectionToggle({
  orderValue, currency = "NGN", enabled, onChange, className,
}: Props) {
  const { enabled: flagOn } = useInsuranceFlag("order_protection");
  const { quote, eligible, loading } = usePremiumQuote({ orderValue, currency });

  if (!flagOn || loading || !eligible || !quote) return null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        enabled
          ? "border-[hsl(43,65%,52%)] bg-[hsl(43,65%,52%)]/5 shadow-[0_2px_0_0_hsl(43,65%,38%,0.4)]"
          : "border-border bg-card",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            enabled
              ? "bg-[hsl(43,65%,52%)] text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Shield size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-heading font-semibold text-sm">
                Add Order Protection
              </p>
              <p className="text-xs text-muted-foreground">
                Covers delivery failure, wrong items & quality issues.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => onChange(v, quote.premium)}
              aria-label="Toggle order protection"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Premium</p>
              <p className="font-semibold">
                <CurrencyDisplay amount={quote.premium} currency={quote.currency} />
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Coverage up to</p>
              <p className="font-semibold">
                <CurrencyDisplay amount={quote.coverageLimit} currency={quote.currency} />
              </p>
            </div>
          </div>
          {enabled && (
            <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              {["Full refund if delivery fails", "Free reorder on quality issues", "24-hour claims response"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={11} className="text-[hsl(152,100%,26%)]" />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}