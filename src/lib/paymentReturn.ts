/**
 * Helpers for handling the URL parameters PSPs append to the callback URL when
 * a user returns from a hosted checkout page (Paystack, Flutterwave, Stripe).
 */

export type PaymentGateway = "paystack" | "flutterwave" | "stripe";

export interface GatewayReturn {
  gateway: PaymentGateway;
  reference: string;
}

/** Detect the gateway + reference Paystack/Flutterwave/Stripe append on return. */
export function extractGatewayReference(params: URLSearchParams): GatewayReturn | null {
  // Stripe checkout session id
  const sessionId = params.get("session_id");
  if (sessionId) return { gateway: "stripe", reference: sessionId };

  // Flutterwave: status=successful&tx_ref=...&transaction_id=...
  const txRef = params.get("tx_ref");
  if (txRef) return { gateway: "flutterwave", reference: txRef };

  // Paystack: ?reference=...&trxref=...
  const ref = params.get("reference") || params.get("trxref");
  if (ref) return { gateway: "paystack", reference: ref };

  return null;
}

/** Strip payment-return params after we've handled them so refreshes don't re-fire. */
export function clearPaymentReturnParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const keys = [
    "reference", "trxref", "tx_ref", "transaction_id", "status", "session_id",
    "payment", "kind", "order_id", "gateway", "reg_status", "org", "onboard",
  ];
  let changed = false;
  for (const k of keys) {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : "") + url.hash);
  }
}