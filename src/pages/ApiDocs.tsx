import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Code2, Copy, Check, ArrowLeft, Zap, Shield, Globe, Palette,
  BookOpen, Terminal, Settings, ChevronRight, ExternalLink, Webhook, Search
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const APP_URL = "https://fashionstitchesafrica.lovable.app";

const sections = [
  { id: "quickstart", label: "Quick Start", icon: Zap },
  { id: "installation", label: "Installation", icon: Terminal },
  { id: "configuration", label: "Configuration", icon: Settings },
  { id: "features", label: "Features", icon: BookOpen },
  { id: "theming", label: "Theming", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "webhooks", label: "Payment Webhooks", icon: Webhook },
  { id: "endpoints", label: "Endpoint Reference", icon: Code2 },
  { id: "api-reference", label: "API Reference", icon: Code2 },
];

type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  group: string;
  auth: "anon" | "bearer";
  curl: string;
  exampleResponse?: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    id: "embed-widget",
    method: "GET",
    path: "/functions/v1/embed-widget",
    summary: "Returns the embeddable widget JS (or JSON config) for an organization.",
    group: "Widget",
    auth: "anon",
    curl: `curl "${SUPABASE_URL}/functions/v1/embed-widget?key=YOUR_WIDGET_KEY&format=config"`,
    exampleResponse: `{
  "orgId": "uuid",
  "orgName": "My Fashion House",
  "features": ["measurements","tryon","appointments","catalogue"],
  "theme": { "primaryColor": "#D4A853", "borderRadius": "12px", "position": "bottom-right" }
}`,
  },
  {
    id: "initialize-payment",
    method: "POST",
    path: "/functions/v1/initialize-payment",
    summary: "Start checkout for an order via Paystack/Stripe/Flutterwave.",
    group: "Payments",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/initialize-payment" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"order_id":"<uuid>","callback_url":"https://your.app/return"}'`,
    exampleResponse: `{ "authorization_url": "https://checkout.paystack.com/abc...", "reference": "fsa_..." }`,
  },
  {
    id: "initialize-designer-subscription",
    method: "POST",
    path: "/functions/v1/initialize-designer-subscription",
    summary: "Start the $15/month Designer subscription checkout.",
    group: "Payments",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/initialize-designer-subscription" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"callback_url":"https://your.app/designer-portal?subscription=success"}'`,
  },
  {
    id: "initialize-website-payment",
    method: "POST",
    path: "/functions/v1/initialize-website-payment",
    summary: "Start checkout for a website builder plan (lite, pro, pro-lite).",
    group: "Payments",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/initialize-website-payment" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"org_id":"<uuid>","plan":"pro"}'`,
  },
  {
    id: "verify-payment",
    method: "POST",
    path: "/functions/v1/verify-payment",
    summary: "Verify a Paystack/Flutterwave reference and activate the underlying flow.",
    group: "Payments",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/verify-payment" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"reference":"fsa_..."}'`,
  },
  {
    id: "payment-webhook",
    method: "POST",
    path: "/functions/v1/payment-webhook",
    summary: "Unified PSP webhook endpoint (Paystack + Flutterwave). Signature verified.",
    group: "Payments",
    auth: "anon",
    curl: `# Configure this URL in your PSP dashboard — direct curl is rejected without a valid signature.
# ${SUPABASE_URL}/functions/v1/payment-webhook`,
  },
  {
    id: "ai-measure-detect",
    method: "POST",
    path: "/functions/v1/ai-measure-detect",
    summary: "Submit a frame for AI-powered body measurement detection.",
    group: "AI",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/ai-measure-detect" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"image_base64":"<jpeg>","profile_id":"<uuid>"}'`,
  },
  {
    id: "virtual-tryon",
    method: "POST",
    path: "/functions/v1/virtual-tryon",
    summary: "Generate a virtual try-on image via Fashn.ai (token-billed).",
    group: "AI",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/virtual-tryon" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"person_url":"https://...jpg","garment_url":"https://...jpg"}'`,
  },
  {
    id: "carrier-rates",
    method: "POST",
    path: "/functions/v1/carrier-rates",
    summary: "Quote shipping rates across configured carriers for an org.",
    group: "Logistics",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/carrier-rates" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"org_id":"<uuid>","from":{"country":"NG"},"to":{"country":"GB"},"weight_kg":1.2}'`,
  },
  {
    id: "send-email",
    method: "POST",
    path: "/functions/v1/send-email",
    summary: "Send a transactional email via Resend; billed per send.",
    group: "Communications",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/send-email" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"user@example.com","subject":"Order ready","html":"<p>Hi!</p>"}'`,
  },
  {
    id: "smart-route-message",
    method: "POST",
    path: "/functions/v1/smart-route-message",
    summary: "Route an outbound message via the optimal channel (SMS/WhatsApp/Email).",
    group: "Communications",
    auth: "bearer",
    curl: `curl -X POST "${SUPABASE_URL}/functions/v1/smart-route-message" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"+2348012345678","body":"Your order is ready","prefer":["whatsapp","sms"]}'`,
  },
];

const CodeBlock = ({ code, language = "html" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg bg-foreground text-background overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-foreground/90 border-b border-background/10">
        <span className="text-xs text-background/50 font-mono">{language}</span>
        <button onClick={handleCopy} className="text-background/50 hover:text-background transition-colors">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const EndpointCard = ({ ep }: { ep: Endpoint }) => {
  const [copied, setCopied] = useState(false);
  const copyCurl = () => {
    navigator.clipboard.writeText(ep.curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge className={ep.method === "GET" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}>
          {ep.method}
        </Badge>
        <code className="text-xs font-mono text-foreground break-all">{ep.path}</code>
        <Badge variant="outline" className="text-[10px] ml-auto">{ep.group}</Badge>
        <Badge variant="outline" className="text-[10px]">
          {ep.auth === "bearer" ? "JWT required" : "Public"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{ep.summary}</p>
      <div className="relative rounded-md bg-foreground text-background text-xs font-mono overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-foreground/90 border-b border-background/10">
          <span className="text-background/50">curl</span>
          <button
            onClick={copyCurl}
            className="text-background/70 hover:text-background flex items-center gap-1 text-[11px]"
          >
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy curl</>}
          </button>
        </div>
        <pre className="p-3 overflow-x-auto whitespace-pre">{ep.curl}</pre>
      </div>
      {ep.exampleResponse && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-primary font-medium">Example response</summary>
          <pre className="mt-1.5 rounded bg-muted p-2 overflow-x-auto text-[11px]">{ep.exampleResponse}</pre>
        </details>
      )}
    </div>
  );
};

const EndpointReferenceSection = () => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.group.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q)
    );
  }, [query]);
  return (
    <section id="endpoints" className="mb-12">
      <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
        <Code2 size={20} className="text-primary" /> Endpoint Reference
      </h2>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search endpoints by path, group, or description…"
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No endpoints match “{query}”.
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ep) => <EndpointCard key={ep.id} ep={ep} />)}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">
        Showing {filtered.length} of {ENDPOINTS.length} endpoints. Bearer endpoints accept a Supabase user JWT.
      </p>
    </section>
  );
};

const ApiDocs = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("quickstart");

  const widgetUrl = `${SUPABASE_URL}/functions/v1/embed-widget`;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft size={18} />
            </Button>
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="font-heading font-bold text-primary-foreground text-[10px]">FS</span>
            </div>
            <span className="font-heading font-bold text-sm">Developer Docs</span>
            <Badge variant="secondary" className="text-[10px]">v1.0</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/browse")} className="text-xs">
              <Globe size={14} className="mr-1" /> Browse Orgs
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-6 flex gap-8">
        {/* Sidebar */}
        <nav className="hidden lg:flex flex-col w-52 shrink-0 gap-0.5 sticky top-20 self-start">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                activeSection === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <s.icon size={16} />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Hero */}
            <div className="mb-10">
              <h1 className="font-heading font-bold text-3xl mb-3">
                FYSORA FASHN (Fashion Stitches Africa) Widget API
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Integrate AI-powered fashion tools — measurements, virtual try-on, appointment booking, and catalogue browsing — into any website with a single script tag.
              </p>
            </div>

            {/* Quick Start */}
            <section id="quickstart" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Zap size={20} className="text-primary" /> Quick Start
              </h2>
              <p className="text-muted-foreground mb-4">
                Add the FYSORA FASHN (Fashion Stitches Africa) widget to your website in under 2 minutes.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">1</span>
                  <div>
                    <p className="font-medium text-sm">Get your Widget Key</p>
                    <p className="text-muted-foreground text-sm">Navigate to Dashboard → Contracts → Widget tab. Enable the widget and copy your unique key.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">2</span>
                  <div>
                    <p className="font-medium text-sm">Add the Script Tag</p>
                    <p className="text-muted-foreground text-sm">Paste this snippet before the closing <code className="bg-muted px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag:</p>
                    <CodeBlock language="html" code={`<script src="${widgetUrl}?key=YOUR_WIDGET_KEY"></script>`} />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">3</span>
                  <div>
                    <p className="font-medium text-sm">Done!</p>
                    <p className="text-muted-foreground text-sm">A floating button appears on your site. Customers can access all enabled features.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Installation */}
            <section id="installation" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Terminal size={20} className="text-primary" /> Installation Methods
              </h2>

              <h3 className="font-heading font-semibold text-base mb-2 mt-6">Script Tag (Recommended)</h3>
              <p className="text-muted-foreground text-sm mb-2">The simplest approach — works on any HTML page, WordPress, Shopify, Wix, etc.</p>
              <CodeBlock language="html" code={`<!-- Add before </body> -->
<script src="${widgetUrl}?key=YOUR_WIDGET_KEY"></script>`} />

              <h3 className="font-heading font-semibold text-base mb-2 mt-6">Dynamic Loading (SPA)</h3>
              <p className="text-muted-foreground text-sm mb-2">For React, Vue, Angular, or other single-page apps:</p>
              <CodeBlock language="javascript" code={`// Load FSA widget dynamically
function loadFSAWidget(widgetKey) {
  if (window.__FSA_WIDGET_LOADED) return;
  const script = document.createElement('script');
  script.src = '${widgetUrl}?key=' + widgetKey;
  script.async = true;
  document.body.appendChild(script);
}

// Call when your app mounts
loadFSAWidget('YOUR_WIDGET_KEY');`} />

              <h3 className="font-heading font-semibold text-base mb-2 mt-6">React Component Wrapper</h3>
              <CodeBlock language="tsx" code={`import { useEffect } from 'react';

export function FSAWidget({ widgetKey }: { widgetKey: string }) {
  useEffect(() => {
    if ((window as any).__FSA_WIDGET_LOADED) return;
    const script = document.createElement('script');
    script.src = '${widgetUrl}?key=' + widgetKey;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const btn = document.getElementById('fsa-widget-btn');
      const panel = document.getElementById('fsa-widget-panel');
      btn?.remove();
      panel?.remove();
      (window as any).__FSA_WIDGET_LOADED = false;
    };
  }, [widgetKey]);
  return null;
}`} />
            </section>

            {/* Configuration */}
            <section id="configuration" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Settings size={20} className="text-primary" /> Configuration
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                All widget configuration is managed from your Dashboard under Contracts → Widget. No code changes needed.
              </p>
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Setting</th>
                      <th className="text-left px-4 py-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Widget Key", "Unique identifier for your organization's widget"],
                      ["Enabled Features", "Toggle: measurements, tryon, appointments, catalogue"],
                      ["Allowed Domains", "Restrict widget to specific domains (security)"],
                      ["Theme Config", "Primary color, border radius, position (bottom-left/right)"],
                      ["Branding Text", "Footer text shown in the widget panel"],
                    ].map(([setting, desc]) => (
                      <tr key={setting} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{setting}</td>
                        <td className="px-4 py-3 text-muted-foreground">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Features */}
            <section id="features" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-primary" /> Available Features
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { id: "measurements", name: "AI Body Measurements", desc: "Customers get precise body measurements using AI-powered video analysis." },
                  { id: "tryon", name: "Virtual Try-On", desc: "Let customers visualize garments on themselves before ordering." },
                  { id: "appointments", name: "Appointment Booking", desc: "Schedule fittings and consultations with availability management." },
                  { id: "catalogue", name: "Catalogue Browsing", desc: "Showcase your garment collection with filtering and search." },
                ].map((f) => (
                  <div key={f.id} className="rounded-xl bg-card border border-border p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{f.id}</Badge>
                      <h3 className="font-heading font-semibold text-sm">{f.name}</h3>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Theming */}
            <section id="theming" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Theming
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Customize the widget appearance to match your brand via the Dashboard.
              </p>
              <CodeBlock language="json" code={`// Theme configuration object (managed in Dashboard)
{
  "primaryColor": "#D4A853",
  "borderRadius": "12px",
  "position": "bottom-right"   // or "bottom-left"
}`} />
            </section>

            {/* Security */}
            <section id="security" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" /> Security
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl bg-card border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm mb-2">Domain Allowlisting</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Restrict your widget to load only on specified domains. If no domains are listed, the widget works on any site. We strongly recommend adding your production domain(s).
                  </p>
                </div>
                <div className="rounded-xl bg-card border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm mb-2">Widget Key Rotation</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    If your widget key is compromised, disable it and generate a new one from the Dashboard. Old keys are immediately invalidated.
                  </p>
                </div>
                <div className="rounded-xl bg-card border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm mb-2">CORS Headers</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    The widget API supports Cross-Origin Resource Sharing (CORS) from all origins. Domain restriction happens at the application layer for finer control.
                  </p>
                </div>
              </div>
            </section>

            {/* Payment Webhooks */}
            <section id="webhooks" className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" /> Payment Webhooks
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                FYSORA FASHN runs a unified, signature-verified webhook endpoint that activates subscriptions, orders,
                registrations, measurement bookings and website plans the moment your payment service provider (PSP)
                confirms the payment — even if the customer closes the browser tab before the redirect completes.
              </p>

              <div className="rounded-xl bg-card border border-border p-5 mb-4">
                <h3 className="font-heading font-semibold text-sm mb-2">Unified webhook endpoint</h3>
                <p className="text-muted-foreground text-xs mb-3">
                  Paste this URL into your Paystack and Flutterwave dashboards. The same endpoint handles both providers
                  — signatures are verified server-side and the corresponding <code className="bg-muted px-1 py-0.5 rounded">verify-*</code> flow runs automatically.
                </p>
                <CodeBlock
                  language="text"
                  code={`${SUPABASE_URL}/functions/v1/payment-webhook`}
                />
              </div>

              <div className="rounded-xl bg-card border border-border p-5 mb-4">
                <h3 className="font-heading font-semibold text-sm mb-2">Required platform secrets</h3>
                <p className="text-muted-foreground text-xs mb-3">
                  Configure these under <strong>Super Admin → Keys &amp; Secrets → FSA Platform Secrets</strong>.
                  Without them, signature checks fail and webhooks are rejected with <code>401</code>.
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium">Provider</th>
                      <th className="text-left px-3 py-2 font-medium">Secret</th>
                      <th className="text-left px-3 py-2 font-medium">Header verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Paystack", "secret_key (signs with HMAC-SHA512)", "x-paystack-signature"],
                      ["Paystack", "webhook_secret (optional override)", "x-paystack-signature"],
                      ["Flutterwave", "webhook_hash (verif-hash value)", "verif-hash"],
                    ].map(([prov, secret, header]) => (
                      <tr key={`${prov}-${secret}`} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{prov}</td>
                        <td className="px-3 py-2 font-mono text-primary">{secret}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{header}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl bg-card border border-border p-5 mb-4">
                <h3 className="font-heading font-semibold text-sm mb-2">Browser return URLs (front-channel)</h3>
                <p className="text-muted-foreground text-xs mb-3">
                  When a payment redirects back to the app, the global <code>PaymentReturnHandler</code> inspects the URL,
                  extracts the gateway reference and calls the matching verify function. You normally do not need to wire
                  these up — they are appended automatically by the relevant initializer.
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium">Flow</th>
                      <th className="text-left px-3 py-2 font-medium">URL markers</th>
                      <th className="text-left px-3 py-2 font-medium">Verify function</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Order payment", "?payment=success&kind=order&order_id=…", "verify-payment"],
                      ["Customer registration", "?reg_status=success or ?onboard=success", "verify-registration-payment"],
                      ["Designer subscription", "?reference=…", "verify-designer-subscription"],
                      ["AI measurement booking", "?meas=success&reference=…", "verify-measurement-payment"],
                      ["Website builder plan", "(polled after checkout)", "verify-website-payment"],
                    ].map(([flow, marker, fn]) => (
                      <tr key={flow} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{flow}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{marker}</td>
                        <td className="px-3 py-2 font-mono text-primary">{fn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-heading font-semibold text-sm mb-2">Test with curl</h3>
                <p className="text-muted-foreground text-xs mb-2">
                  Webhook calls must include a valid signature header — direct curl requests without a real PSP signature
                  will be rejected with <code>401</code>. Use the PSP dashboard's “Send test webhook” button instead.
                </p>
                <CodeBlock
                  language="bash"
                  code={`# Paystack — from the Paystack dashboard
# Settings → API Keys & Webhooks → Test Webhook

# Flutterwave — from the Flutterwave dashboard
# Settings → Webhooks → Send test`}
                />
              </div>
            </section>

            {/* API Reference */}
            <section id="api-reference" className="mb-12">
              {/* Searchable endpoint catalog with copy-curl */}
            </section>
            <EndpointReferenceSection />
            <section className="mb-12">
              <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                <Code2 size={20} className="text-primary" /> API Reference
              </h2>

              <div className="space-y-6">
                <div className="rounded-xl bg-card border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-secondary text-secondary-foreground text-[10px]">GET</Badge>
                    <code className="text-sm font-mono text-primary">/functions/v1/embed-widget</code>
                  </div>
                  <p className="text-muted-foreground text-xs mb-3">Returns the embeddable JavaScript widget for your organization.</p>
                  <h4 className="font-semibold text-xs mb-2">Query Parameters</h4>
                  <div className="space-y-1.5">
                    {[
                      ["key", "string", "Required", "Your unique widget key"],
                      ["format", "string", "Optional", '"js" (default) or "config" for JSON config'],
                    ].map(([name, type, req, desc]) => (
                      <div key={name} className="flex items-start gap-3 text-xs">
                        <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">{name}</code>
                        <span className="text-muted-foreground">{type}</span>
                        <Badge variant="outline" className="text-[9px]">{req}</Badge>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-card border border-border p-5">
                  <h4 className="font-semibold text-sm mb-2">Get Widget Config (JSON)</h4>
                  <CodeBlock language="bash" code={`curl "${widgetUrl}?key=YOUR_WIDGET_KEY&format=config"`} />
                  <h4 className="font-semibold text-xs mb-2 mt-3">Response</h4>
                  <CodeBlock language="json" code={`{
  "orgId": "uuid",
  "orgName": "My Fashion House",
  "orgSlug": "my-fashion-house",
  "features": ["measurements", "tryon", "appointments", "catalogue"],
  "theme": { "primaryColor": "#D4A853", "borderRadius": "12px", "position": "bottom-right" },
  "branding": "Powered by FYSORA FASHN (Fashion Stitches Africa)"
}`} />
                </div>

                <div className="rounded-xl bg-card border border-border p-5">
                  <h4 className="font-semibold text-sm mb-2">Error Responses</h4>
                  <div className="space-y-2">
                    {[
                      ["400", "Widget key required", "Missing ?key= parameter"],
                      ["403", "Domain not authorized", "Origin not in allowed_domains"],
                      ["404", "Invalid or disabled widget", "Key doesn't exist or widget disabled"],
                    ].map(([status, error, desc]) => (
                      <div key={status} className="flex items-center gap-3 text-xs">
                        <Badge variant="destructive" className="text-[10px]">{status}</Badge>
                        <code className="font-mono text-foreground">{error}</code>
                        <span className="text-muted-foreground">— {desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Footer CTA */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-8 text-center">
              <h3 className="font-heading font-bold text-lg mb-2">Ready to integrate?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create an organization and get your widget key in minutes.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="hero" onClick={() => navigate("/auth")}>
                  Get Started <ChevronRight size={14} />
                </Button>
                <Button variant="heroOutline" onClick={() => navigate("/browse")}>
                  Browse Organizations <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default ApiDocs;
