/**
 * Shared helper to resolve payment gateway keys.
 * 1. Try org-level keys from org_api_keys
 * 2. Fall back to platform-level keys from platform_api_keys
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface GatewayKeys {
  secretKey: string;
  publicKey?: string;
  merchantId?: string;
}

export async function resolveGatewayKeys(
  serviceClient: SupabaseClient,
  orgId: string,
  gateway: string
): Promise<GatewayKeys | null> {
  // 1. Try org-level keys
  const { data: orgKeys } = await serviceClient
    .from("org_api_keys")
    .select("key_name, key_value")
    .eq("org_id", orgId)
    .eq("provider", gateway)
    .eq("is_active", true);

  const orgMap = Object.fromEntries(
    (orgKeys || []).map((k: any) => [k.key_name, k.key_value])
  );

  const orgSecret =
    orgMap["secret_key"] ||
    orgMap["PAYSTACK_SECRET_KEY"] ||
    orgMap["STRIPE_SECRET_KEY"] ||
    orgMap["FLUTTERWAVE_SECRET_KEY"] ||
    orgMap["OPAY_SECRET_KEY"] ||
    orgMap["PAYPAL_CLIENT_SECRET"];

  if (orgSecret) {
    return {
      secretKey: orgSecret,
      publicKey: orgMap["public_key"] || orgMap["publishable_key"],
      merchantId: orgMap["merchant_id"] || orgMap["OPAY_MERCHANT_ID"] || orgMap["PAYPAL_CLIENT_ID"],
    };
  }

  // 2. Fall back to platform-level keys
  const { data: platformKeys } = await serviceClient
    .from("platform_api_keys")
    .select("key_name, key_value")
    .eq("provider", gateway)
    .eq("is_active", true);

  const platMap = Object.fromEntries(
    (platformKeys || []).map((k: any) => [k.key_name, k.key_value])
  );

  const platSecret = platMap["secret_key"];
  if (platSecret) {
    return {
      secretKey: platSecret,
      publicKey: platMap["public_key"] || platMap["publishable_key"],
      merchantId: platMap["merchant_id"],
    };
  }

  // 3. Final fallback: env secrets (sandbox/dev credentials configured via secrets manager)
  const envMap: Record<string, { secret: string; public?: string; merchant?: string }> = {
    opay: {
      secret: Deno.env.get("OPAY_SECRET_KEY") || "",
      public: Deno.env.get("OPAY_PUBLIC_KEY") || undefined,
      merchant: Deno.env.get("OPAY_MERCHANT_ID") || undefined,
    },
    paypal: {
      secret: Deno.env.get("PAYPAL_CLIENT_SECRET") || "",
      public: Deno.env.get("PAYPAL_CLIENT_ID") || undefined,
      merchant: Deno.env.get("PAYPAL_CLIENT_ID") || undefined,
    },
    paystack: { secret: Deno.env.get("PAYSTACK_SECRET_KEY") || "" },
  };
  const env = envMap[gateway];
  if (env?.secret) {
    return { secretKey: env.secret, publicKey: env.public, merchantId: env.merchant };
  }
  return null;
}


/** African country currency codes supported by Flutterwave */
const AFRICAN_CURRENCIES = new Set([
  "NGN", "KES", "GHS", "ZAR", "UGX", "TZS", "RWF", "XOF", "XAF",
  "EGP", "MAD", "ETB", "MWK", "ZMW", "SLL", "GMD",
]);

/**
 * Country- and currency-aware gateway routing.
 * Returns an ordered list of gateway candidates for a customer:
 *   - Opay is Nigeria-only (NGN + country NG).
 *   - PayPal is used as the global fallback for non-NGN or non-NG customers.
 *   - Paystack/Flutterwave remain available for Africa when configured.
 */
export function chooseGateway(opts: {
  country?: string | null;
  currency?: string | null;
}): string[] {
  const country = (opts.country || "").toUpperCase();
  const currency = (opts.currency || "NGN").toUpperCase();

  if (country === "NG" && currency === "NGN") {
    return ["opay", "paystack", "flutterwave", "paypal"];
  }
  if (AFRICAN_CURRENCIES.has(currency)) {
    return ["flutterwave", "paystack", "paypal"];
  }
  // Global / non-African: PayPal first, Stripe as an option if configured
  return ["paypal", "stripe"];
}

/** Map currencies to optimal Flutterwave payment options */
function getFlutterwavePaymentOptions(currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "NGN") return "card, banktransfer, ussd, nqr";
  if (cur === "KES") return "card, mpesa";
  if (cur === "GHS") return "card, mobilemoneysn";
  if (cur === "UGX") return "card, mobilemoneyuganda";
  if (cur === "RWF") return "card, mobilemoneyfranco";
  if (cur === "TZS") return "card, mobilemoneytanzania";
  if (cur === "XOF" || cur === "XAF") return "card, mobilemoneyfranco";
  if (cur === "ZAR") return "card";
  if (AFRICAN_CURRENCIES.has(cur)) return "card, banktransfer";
  // Non-African: international cards, Apple Pay, Google Pay
  return "card";
}

/** Determine Flutterwave country code from currency */
function getFlutterwaveCountry(currency: string): string {
  const map: Record<string, string> = {
    NGN: "NG", KES: "KE", GHS: "GH", ZAR: "ZA", UGX: "UG",
    TZS: "TZ", RWF: "RW", XOF: "CI", XAF: "CM", EGP: "EG",
    USD: "US", GBP: "GB", EUR: "FR", CAD: "CA", AUD: "AU",
  };
  return map[currency.toUpperCase()] || "NG";
}

/**
 * Initialize a payment transaction across gateways.
 * Returns { checkoutUrl, reference } or throws.
 */
export async function initializeGatewayPayment(opts: {
  gateway: string;
  keys: GatewayKeys;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  email: string;
  metadata: Record<string, unknown>;
  productName?: string;
  customerName?: string;
  customerPhone?: string;
  webhookUrl?: string;
}): Promise<{
  checkoutUrl: string;
  reference: string;
  bankTransfer?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    amount: number;
    currency: string;
    expiresAt?: string;
    orderNo?: string;
  };
}> {
  const { gateway, keys, amount, currency, reference, callbackUrl, email, metadata, productName, customerName, customerPhone } = opts;

  if (gateway === "paystack") {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keys.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: currency || "NGN",
        email,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    });
    const data = await res.json();
    if (!data.status) throw new Error(data.message || "Paystack initialization failed");
    return { checkoutUrl: data.data.authorization_url, reference: data.data.reference };
  }

  if (gateway === "stripe") {
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", callbackUrl + (callbackUrl.includes("?") ? "&" : "?") + "payment=success");
    params.append("cancel_url", callbackUrl + (callbackUrl.includes("?") ? "&" : "?") + "payment=cancelled");
    params.append("line_items[0][price_data][currency]", (currency || "USD").toLowerCase());
    params.append("line_items[0][price_data][product_data][name]", productName || "Payment");
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
    params.append("line_items[0][quantity]", "1");
    if (email) params.append("customer_email", email);
    for (const [k, v] of Object.entries(metadata)) {
      params.append(`metadata[${k}]`, String(v));
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(keys.secretKey + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { checkoutUrl: data.url, reference: data.id };
  }

  if (gateway === "flutterwave") {
    const cur = (currency || "NGN").toUpperCase();
    const paymentOptions = getFlutterwavePaymentOptions(cur);
    const country = getFlutterwaveCountry(cur);
    const isAfrican = AFRICAN_CURRENCIES.has(cur);

    const payload: Record<string, unknown> = {
      tx_ref: reference,
      amount,
      currency: cur,
      redirect_url: callbackUrl,
      meta: metadata,
      customer: {
        email,
        ...(customerName ? { name: customerName } : {}),
        ...(customerPhone ? { phonenumber: customerPhone } : {}),
      },
      customizations: {
        title: productName || "Payment",
        description: `Payment via FYSORA FASHN (Fashion Stitches Africa)`,
        logo: "https://fashionstitchesafrica.lovable.app/pwa-192x192.png",
      },
      payment_options: paymentOptions,
      country,
    };

    // For non-African currencies, enable currency switching so customers can pay in their local currency
    if (!isAfrican) {
      payload.currency = cur;
    }

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keys.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.message || "Flutterwave initialization failed");
    return { checkoutUrl: data.data.link, reference };
  }

  throw new Error(`Unsupported gateway: ${gateway}`);
}
