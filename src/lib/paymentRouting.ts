// Country- and currency-aware payment gateway routing (client side).
// Mirrors the server-side chooseGateway in _shared/resolve-gateway-keys.ts.

export type Gateway = "opay" | "paypal" | "paystack" | "flutterwave" | "stripe";

export interface GatewayOption {
  id: Gateway;
  label: string;
  description: string;
  methods: string[];
}

const AFRICAN_CURRENCIES = new Set([
  "NGN","KES","GHS","ZAR","UGX","TZS","RWF","XOF","XAF","EGP","MAD","ETB","MWK","ZMW","SLL","GMD",
]);

const CATALOG: Record<Gateway, GatewayOption> = {
  opay: {
    id: "opay",
    label: "Opay — Direct Bank Transfer",
    description: "Nigeria only. Pay by transferring to a one-time virtual account. Confirms automatically.",
    methods: ["Bank transfer (NGN)"],
  },
  paypal: {
    id: "paypal",
    label: "PayPal",
    description: "Pay from anywhere with your PayPal balance or an international card.",
    methods: ["PayPal balance", "International card"],
  },
  paystack: {
    id: "paystack",
    label: "Paystack",
    description: "Cards, bank transfer, USSD (NGN, GHS, ZAR, KES).",
    methods: ["Card", "Bank", "USSD"],
  },
  flutterwave: {
    id: "flutterwave",
    label: "Flutterwave",
    description: "African local rails plus international cards.",
    methods: ["Card", "Mobile money", "Bank"],
  },
  stripe: {
    id: "stripe",
    label: "Stripe",
    description: "International card payments.",
    methods: ["Card", "Apple Pay", "Google Pay"],
  },
};

export function chooseGateways(opts: {
  country?: string | null;
  currency?: string | null;
}): GatewayOption[] {
  const country = (opts.country || "").toUpperCase();
  const currency = (opts.currency || "NGN").toUpperCase();

  let order: Gateway[];
  if (country === "NG" && currency === "NGN") {
    order = ["opay", "paystack", "flutterwave", "paypal"];
  } else if (AFRICAN_CURRENCIES.has(currency)) {
    order = ["flutterwave", "paystack", "paypal"];
  } else {
    order = ["paypal", "stripe"];
  }
  return order.map((id) => CATALOG[id]);
}

export function isGatewayAllowed(gateway: Gateway, country?: string | null, currency?: string | null): boolean {
  return chooseGateways({ country, currency }).some((g) => g.id === gateway);
}