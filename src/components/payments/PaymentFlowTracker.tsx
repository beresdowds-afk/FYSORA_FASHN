import { CheckCircle2, Clock, CreditCard, FileText, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import type { FlowStep } from "@/hooks/usePaymentFlow";

interface PaymentFlowTrackerProps {
  step: FlowStep;
  invoiceNumber?: string | null;
  activated?: boolean;
  error?: string | null;
  className?: string;
}

const steps: { key: FlowStep; label: string; icon: React.ElementType }[] = [
  { key: "initializing", label: "Initializing", icon: Loader2 },
  { key: "redirecting", label: "Payment", icon: CreditCard },
  { key: "verifying", label: "Verifying", icon: Clock },
  { key: "invoicing", label: "Invoicing", icon: FileText },
  { key: "activating", label: "Activation", icon: ShieldCheck },
  { key: "complete", label: "Complete", icon: CheckCircle2 },
];

const stepOrder: FlowStep[] = ["idle", "initializing", "redirecting", "verifying", "invoicing", "activating", "complete"];

export const PaymentFlowTracker = ({ step, invoiceNumber, activated, error, className = "" }: PaymentFlowTrackerProps) => {
  if (step === "idle") return null;

  const currentIndex = stepOrder.indexOf(step);
  const isFailed = step === "failed";

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Payment Progress</h4>
        {isFailed && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Failed
          </span>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const stepIdx = stepOrder.indexOf(s.key);
          const isActive = stepIdx === currentIndex;
          const isDone = stepIdx < currentIndex && !isFailed;
          const Icon = s.icon;

          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/20 text-primary ring-2 ring-primary"
                        : isFailed && isActive
                          ? "bg-destructive/20 text-destructive ring-2 ring-destructive"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive && !isFailed ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 text-center leading-tight ${
                  isActive ? "text-primary font-medium" : isDone ? "text-primary" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-full mx-0.5 rounded transition-all duration-300 ${
                  isDone ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status messages */}
      {error && (
        <p className="mt-3 text-xs text-destructive bg-destructive/10 rounded-lg p-2">{error}</p>
      )}
      {invoiceNumber && step === "complete" && (
        <p className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-2">
          Invoice: <span className="font-mono font-medium text-foreground">{invoiceNumber}</span>
          {activated === false && (
            <span className="ml-2 text-amber-600">• Pending admin approval</span>
          )}
        </p>
      )}
    </div>
  );
};
