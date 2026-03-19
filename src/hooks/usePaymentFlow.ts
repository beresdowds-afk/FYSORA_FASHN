import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ServiceType = "order" | "website_builder" | "registration" | "measurement" | "subscription";

export type FlowStep = "idle" | "initializing" | "redirecting" | "verifying" | "invoicing" | "activating" | "complete" | "failed";

interface PaymentFlowState {
  step: FlowStep;
  checkoutUrl: string | null;
  reference: string | null;
  invoiceNumber: string | null;
  error: string | null;
  activated: boolean;
}

const initialState: PaymentFlowState = {
  step: "idle",
  checkoutUrl: null,
  reference: null,
  invoiceNumber: null,
  error: null,
  activated: false,
};

export const usePaymentFlow = () => {
  const [state, setState] = useState<PaymentFlowState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const initializePayment = useCallback(async (
    functionName: string,
    params: Record<string, any>,
  ) => {
    setState(prev => ({ ...prev, step: "initializing", error: null }));

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params,
      });

      if (error || !data?.checkout_url) {
        const msg = data?.error || error?.message || "Failed to initialize payment";
        setState(prev => ({ ...prev, step: "failed", error: msg }));
        toast.error(msg);
        return null;
      }

      setState(prev => ({
        ...prev,
        step: "redirecting",
        checkoutUrl: data.checkout_url,
        reference: data.reference,
      }));

      toast.success("Redirecting to payment gateway...");
      return { checkoutUrl: data.checkout_url, reference: data.reference, gateway: data.gateway };
    } catch (err: any) {
      const msg = err.message || "Payment initialization failed";
      setState(prev => ({ ...prev, step: "failed", error: msg }));
      toast.error(msg);
      return null;
    }
  }, []);

  const verifyPayment = useCallback(async (
    functionName: string,
    params: Record<string, any>,
  ) => {
    setState(prev => ({ ...prev, step: "verifying", error: null }));

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params,
      });

      if (error) {
        setState(prev => ({ ...prev, step: "failed", error: error.message }));
        toast.error("Payment verification failed");
        return null;
      }

      if (data?.status === "success") {
        setState(prev => ({
          ...prev,
          step: "complete",
          invoiceNumber: data.invoice_number || null,
          activated: data.activated !== false,
        }));

        const activationMsg = data.activated === false
          ? "Payment verified. Awaiting admin approval for activation."
          : "Payment verified and service activated!";

        toast.success(activationMsg);
        if (data.invoice_number) {
          toast.info(`Invoice: ${data.invoice_number}`);
        }
        return data;
      }

      if (data?.status === "already_completed" || data?.status === "already_paid") {
        setState(prev => ({ ...prev, step: "complete", activated: true }));
        toast.info("Payment was already processed");
        return data;
      }

      // Still pending
      setState(prev => ({ ...prev, step: "verifying" }));
      toast.info("Payment is still being processed. Please wait...");
      return data;
    } catch (err: any) {
      setState(prev => ({ ...prev, step: "failed", error: err.message }));
      toast.error("Verification failed");
      return null;
    }
  }, []);

  const pollVerification = useCallback(async (
    functionName: string,
    params: Record<string, any>,
    maxAttempts = 5,
    intervalMs = 3000,
  ) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await verifyPayment(functionName, params);
      if (result?.status === "success" || result?.status === "already_completed" || result?.status === "already_paid") {
        return result;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    setState(prev => ({
      ...prev,
      step: "failed",
      error: "Payment verification timed out. Please contact support if you were charged.",
    }));
    toast.error("Verification timed out. Please try again or contact support.");
    return null;
  }, [verifyPayment]);

  return {
    ...state,
    reset,
    initializePayment,
    verifyPayment,
    pollVerification,
  };
};
