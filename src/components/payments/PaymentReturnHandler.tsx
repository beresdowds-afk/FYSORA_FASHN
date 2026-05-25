import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractGatewayReference, clearPaymentReturnParams } from "@/lib/paymentReturn";

/**
 * Global handler that detects when a user has just returned from a payment
 * gateway checkout and invokes the correct `verify-*` edge function so the
 * subscription/order is activated even if the gateway's server-to-server
 * webhook is delayed or missed.
 *
 * Markers we recognise:
 * - `?reg_status=success`     → customer registration fee  (verify-registration-payment)
 * - `?onboard=success`        → alias for the registration fee marker
 * - `?payment=success&kind=order&order_id=...` → order payment  (verify-payment)
 *
 * In all cases the gateway also appends a `reference`/`trxref`/`tx_ref`/
 * `session_id` query param which we use to call the verifier.
 */
const PaymentReturnHandler = () => {
  const location = useLocation();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isReg = params.get("reg_status") === "success" || params.get("onboard") === "success";
    const isOrder = params.get("payment") === "success" && params.get("kind") === "order";

    if (!isReg && !isOrder) return;

    const ret = extractGatewayReference(params);
    if (!ret) return;

    // Dedupe per reference for the lifetime of the tab
    const key = `${isReg ? "reg" : "order"}:${ret.reference}`;
    if (handledRef.current.has(key)) return;
    handledRef.current.add(key);

    (async () => {
      try {
        if (isReg) {
          const { data, error } = await supabase.functions.invoke("verify-registration-payment", {
            body: { reference: ret.reference },
          });
          if (error) {
            toast.error("Could not verify registration payment. Please refresh in a moment.");
            return;
          }
          if (data?.status === "success" || data?.status === "already_paid") {
            toast.success("Registration confirmed — welcome aboard!");
          } else if (data?.status === "pending") {
            toast.info("Payment is still being processed. We'll update your access shortly.");
          }
        } else if (isOrder) {
          const orderId = params.get("order_id") || undefined;
          const gateway = params.get("gateway") || ret.gateway;
          const { data, error } = await supabase.functions.invoke("verify-payment", {
            body: { reference: ret.reference, gateway, order_id: orderId },
          });
          if (error) {
            toast.error("Could not verify your order payment. Please refresh in a moment.");
            return;
          }
          if (data?.status === "success" || data?.status === "already_completed") {
            toast.success("Payment verified — order updated.");
          } else if (data?.status === "pending") {
            toast.info("Payment is still being processed. Refresh in a moment.");
          }
        }
      } finally {
        clearPaymentReturnParams();
      }
    })();
  }, [location.search]);

  return null;
};

export default PaymentReturnHandler;