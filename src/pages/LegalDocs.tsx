import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, FileText, Globe, Download, Loader2, Copy, Check,
  Scale, Shield, RefreshCw, Building2, Cookie, Lock, Database
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Helmet } from "react-helmet-async";

const REGIONS = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "EU", name: "European Union", flag: "🇪🇺" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "IN", name: "India", flag: "🇮🇳" },
];

const DOC_TYPES = [
  { id: "terms", name: "Terms & Conditions", icon: FileText, desc: "Service agreement and usage terms" },
  { id: "privacy", name: "Privacy Policy", icon: Shield, desc: "Data collection and processing disclosure" },
  { id: "refund", name: "Refund Policy", icon: RefreshCw, desc: "Returns, cancellations, and refunds" },
  { id: "acceptable-use", name: "Acceptable Use Policy", icon: Scale, desc: "Permitted and prohibited platform use" },
];

const LegalDocs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [region, setRegion] = useState("");
  const [docType, setDocType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!region || !docType) {
      toast({ title: "Select a region and document type", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setContent("");

    const regionObj = REGIONS.find((r) => r.code === region);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-legal-doc`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            docType,
            region,
            orgName: orgName || undefined,
            orgCountry: regionObj?.name,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        toast({ title: err.error || "Generation failed", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setContent(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate document", variant: "destructive" });
    }

    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const regionName = REGIONS.find((r) => r.code === region)?.name || region;
    a.download = `${docType}-${regionName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRegion = REGIONS.find((r) => r.code === region);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Legal — Privacy, Terms, Cookies, GDPR | FYSORA FASHN</title>
        <meta name="description" content="Privacy Policy, Terms of Service, Cookie Policy, GDPR rights and Data Protection commitments for FYSORA FASHN (Fashion Stitches Africa)." />
        <link rel="canonical" href="https://fs-africa.org.ng/legal" />
      </Helmet>
      <Navbar />
      <div className="h-16" />
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-heading font-bold text-3xl mb-2">Legal &amp; Compliance</h1>
          <p className="text-muted-foreground">
            How FYSORA FASHN (Fashion Stitches Africa) protects your data and governs use of the platform.
            Last updated: <span className="font-medium text-foreground">May 27, 2026</span>.
          </p>
        </div>

        <Tabs defaultValue="privacy" className="mb-12">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="privacy" className="text-xs"><Shield size={12} className="mr-1.5" /> Privacy</TabsTrigger>
            <TabsTrigger value="terms" className="text-xs"><Scale size={12} className="mr-1.5" /> Terms</TabsTrigger>
            <TabsTrigger value="cookies" className="text-xs"><Cookie size={12} className="mr-1.5" /> Cookies</TabsTrigger>
            <TabsTrigger value="gdpr" className="text-xs"><Lock size={12} className="mr-1.5" /> GDPR</TabsTrigger>
            <TabsTrigger value="data" className="text-xs"><Database size={12} className="mr-1.5" /> Data Protection</TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="prose-doc">
            <LegalSection title="Privacy Policy">
              <p>FYSORA FASHN (Fashion Stitches Africa) (&ldquo;FSA&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) operates the FSA platform connecting customers, designers, tailors and organizations across Africa and globally. This Privacy Policy explains what personal data we collect, why we collect it, how we use it, and your rights.</p>
              <h3>1. Information we collect</h3>
              <ul>
                <li><strong>Account data</strong>: name, email, phone, display photo, role (customer, designer, tailor, org_admin, manager).</li>
                <li><strong>Profile &amp; KYC</strong>: identity documents and physical address coordinates submitted for verification, processed by Smile ID, YouVerify, IdentityPass or Persona.</li>
                <li><strong>Measurement data</strong>: body measurements you input or that our AI extracts from photos/video. Stored encrypted and bound to your profile.</li>
                <li><strong>Order &amp; payment data</strong>: items, prices, currencies, invoices, payment references. Card details are handled by Stripe, Paystack or Flutterwave &mdash; FSA never stores raw card numbers.</li>
                <li><strong>Communications</strong>: email, SMS, WhatsApp and in&#8209;app messages routed through Resend, Twilio, Termii and WhatChimp.</li>
                <li><strong>Device &amp; usage</strong>: IP address, user&#8209;agent, page views, performance telemetry, PWA install events.</li>
              </ul>
              <h3>2. Why we process your data</h3>
              <ul>
                <li>Providing the service: orders, measurements, video calls, AI try&#8209;on, dispute resolution.</li>
                <li>Billing &amp; tokens (100 NGN = 1 token) and platform agency fee accounting.</li>
                <li>Security, fraud prevention, abuse detection and audit logging.</li>
                <li>Improving the service through anonymised analytics.</li>
                <li>Sending transactional messages and, with your consent, marketing.</li>
              </ul>
              <h3>3. Legal bases</h3>
              <p>Performance of contract, legitimate interest, legal obligation, and explicit consent (for marketing, biometric AI measurements and identity verification).</p>
              <h3>4. Sharing</h3>
              <p>We share data only with: the organization you order from; payment processors; identity verification providers; messaging providers; logistics carriers; and authorities when legally required. We never sell personal data.</p>
              <h3>5. Retention</h3>
              <p>Account &amp; transactional data: 365 days after archival per our Account Archiving policy. Audit and tax records: as required by applicable law. Marketing data: until you opt out.</p>
              <h3>6. Security</h3>
              <p>Row&#8209;level security on every tenant table, HaveIBeenPwned SHA&#8209;1 leaked&#8209;password checks on signup, TLS in transit, encryption at rest, and a Sentinel Shield monitoring layer for platform tables.</p>
              <h3>7. Your rights</h3>
              <p>Access, rectification, erasure, portability, restriction, objection, and withdrawal of consent &mdash; see the GDPR tab for the procedure.</p>
              <h3>8. Contact</h3>
              <p>Email <a href="mailto:privacy@fs-africa.org.ng">privacy@fs-africa.org.ng</a> or write to FYSORA FASHN, Lagos, Nigeria.</p>
            </LegalSection>
          </TabsContent>

          <TabsContent value="terms">
            <LegalSection title="Terms of Service">
              <h3>1. Acceptance</h3>
              <p>By creating an account or using the FSA platform you accept these Terms. If you do not agree, do not use the service.</p>
              <h3>2. The platform</h3>
              <p>FSA is a <strong>neutral intermediary</strong> connecting customers with independent organizations, designers and tailors. FSA does not manufacture garments and is not party to any garment sale contract; the contract is between you and the organization you patronize.</p>
              <h3>3. Accounts &amp; roles</h3>
              <p>Six roles are supported: customer, designer, tailor, org_admin, manager, and FSA admins. Tailors operate exclusively through org contracts and may not transact directly with customers.</p>
              <h3>4. Payments &amp; fees</h3>
              <p>Prices are shown in the organization&rsquo;s currency, with NGN as the base. A 10% agency fee (5% platform + 5% admin) is deducted from tailor payouts. Tokens are billed at 100 NGN = 1 token for communications and video.</p>
              <h3>5. Subscriptions</h3>
              <p>Customer Premium ($10/year), Designer ($15/month), Organization Lite/Pro/Enterprise plans and Website Builder add&#8209;ons renew automatically until cancelled. Cancel any time from billing settings.</p>
              <h3>6. Acceptable use</h3>
              <p>No fraud, IP infringement, hate speech, harassment, scraping, or attempts to circumvent RLS, billing or rate limits. Violations may result in suspension and forfeiture of pending payouts.</p>
              <h3>7. AI features</h3>
              <p>AI measurements, virtual try&#8209;on and dispute classification are provided <em>as&#8209;is</em>. Always confirm measurements with a physical fitting before production.</p>
              <h3>8. Liability</h3>
              <p>FSA&rsquo;s aggregate liability is limited to the fees you paid to FSA in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
              <h3>9. Termination</h3>
              <p>You may close your account at any time. We may suspend or terminate accounts that violate these Terms.</p>
              <h3>10. Governing law</h3>
              <p>These Terms are governed by the laws of the Federal Republic of Nigeria, without prejudice to mandatory consumer protections in your country of residence.</p>
            </LegalSection>
          </TabsContent>

          <TabsContent value="cookies">
            <LegalSection title="Cookie Policy">
              <p>FSA uses cookies and similar technologies (localStorage, IndexedDB, service workers) to operate the platform, remember preferences, secure your session, and measure performance.</p>
              <h3>Categories we use</h3>
              <ul>
                <li><strong>Strictly necessary</strong>: authentication, CSRF protection, load balancing, language and currency preference. Cannot be disabled.</li>
                <li><strong>Functional</strong>: dashboard layout, recent organizations, tour progress, cached catalogue snapshots for offline PWA support.</li>
                <li><strong>Analytics</strong>: anonymised page&#8209;view and feature&#8209;usage events used to improve the product.</li>
                <li><strong>Marketing</strong>: only set after you opt in via the cookie banner or the &ldquo;promotional emails &amp; notifications&rdquo; consent.</li>
              </ul>
              <h3>Managing cookies</h3>
              <p>Use the cookie banner on first visit, or clear preferences via your browser settings. Disabling strictly&#8209;necessary cookies will break sign&#8209;in.</p>
              <h3>Third&#8209;party cookies</h3>
              <p>Payment, identity verification and embedded video providers may set their own cookies when those flows are active. Review their policies for details.</p>
            </LegalSection>
          </TabsContent>

          <TabsContent value="gdpr">
            <LegalSection title="GDPR &amp; UK Data Protection">
              <p>If you are in the EEA, the UK, or any region with equivalent data protection law, you have the following rights regarding your personal data processed by FSA as data controller for platform accounts (and as processor for data you upload on behalf of an organization).</p>
              <h3>Your rights</h3>
              <ul>
                <li><strong>Access</strong> &mdash; request a copy of the personal data we hold about you.</li>
                <li><strong>Rectification</strong> &mdash; correct inaccurate or incomplete data.</li>
                <li><strong>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) &mdash; ask us to delete your account and associated data, subject to legal retention obligations.</li>
                <li><strong>Restriction</strong> &mdash; pause processing pending review.</li>
                <li><strong>Portability</strong> &mdash; receive your data in a structured, machine&#8209;readable JSON export.</li>
                <li><strong>Objection</strong> &mdash; object to processing based on legitimate interest or for direct marketing.</li>
                <li><strong>Withdraw consent</strong> &mdash; at any time, without affecting prior lawful processing.</li>
                <li><strong>Complaint</strong> &mdash; lodge a complaint with your local supervisory authority (e.g. ICO in the UK, NDPC in Nigeria).</li>
              </ul>
              <h3>How to exercise your rights</h3>
              <p>Email <a href="mailto:dpo@fs-africa.org.ng">dpo@fs-africa.org.ng</a> from the address on file. We respond within <strong>30 days</strong> (extendable by 60 days for complex requests, with notice).</p>
              <h3>International transfers</h3>
              <p>FSA stores data primarily in EU&#8209;based Supabase regions. Cross&#8209;border transfers are governed by Standard Contractual Clauses (SCCs) and equivalent safeguards.</p>
              <h3>Data Protection Officer</h3>
              <p>FSA&rsquo;s DPO can be reached at <a href="mailto:dpo@fs-africa.org.ng">dpo@fs-africa.org.ng</a>.</p>
            </LegalSection>
          </TabsContent>

          <TabsContent value="data">
            <LegalSection title="Data Protection Commitments">
              <h3>Security architecture</h3>
              <ul>
                <li>Row&#8209;Level Security on every multi&#8209;tenant table, enforcing org isolation at the database layer.</li>
                <li>Roles are stored in a dedicated <code>user_roles</code> table guarded by a <code>SECURITY DEFINER</code> <code>has_role()</code> helper &mdash; never on the profile row.</li>
                <li>HaveIBeenPwned SHA&#8209;1 leaked&#8209;password check on signup and password change.</li>
                <li>Signed, scoped Realtime channel authorization (per&#8209;org and per&#8209;user topic gating).</li>
                <li>Path&#8209;scoped storage policies preventing cross&#8209;org file access.</li>
                <li>Sentinel Shield monitoring for platform tables; super&#8209;admin&#8209;only RPCs guarded with audit&#8209;logged role checks.</li>
              </ul>
              <h3>Encryption</h3>
              <p>TLS 1.2+ in transit; AES&#8209;256 at rest for database and storage. Payment card data is tokenised by the PSP and never touches our servers.</p>
              <h3>Backups &amp; resilience</h3>
              <p>Daily JSON snapshots of critical tables are written to a private storage bucket with 365&#8209;day retention. Point&#8209;in&#8209;time recovery is available on the managed database.</p>
              <h3>Sub&#8209;processors</h3>
              <p>Supabase (database/storage), Resend (email), Twilio &amp; Termii (SMS/WhatsApp), WhatChimp (messaging routing), Stripe / Paystack / Flutterwave (payments), Smile ID / YouVerify / IdentityPass / Persona (identity), Lovable AI Gateway (AI models). A current list is available on request.</p>
              <h3>Breach notification</h3>
              <p>In the event of a personal&#8209;data breach we will notify affected users and relevant supervisory authorities without undue delay and, where feasible, within <strong>72 hours</strong>.</p>
              <h3>Children</h3>
              <p>FSA is not directed at children under 16. Accounts found to belong to minors are removed.</p>
            </LegalSection>
          </TabsContent>
        </Tabs>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-10 text-sm">
          <p className="font-medium mb-1">Need a region&#8209;specific document?</p>
          <p className="text-muted-foreground">
            The generator below produces a fully&#8209;tailored Terms, Privacy, Refund or Acceptable Use document for any of 14 supported jurisdictions.
          </p>
        </div>

      <div className="max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="font-heading font-bold text-2xl mb-2">Region-Compliant Legal Documents</h1>
            <p className="text-muted-foreground">
              Auto-generate Terms & Conditions, Privacy Policies, and more — tailored to your region's regulations.
            </p>
          </div>

          {/* Config Panel */}
          <div className="rounded-xl bg-card border border-border p-6 mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.flag} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Organization Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Ade's Fashion House"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generating || !region || !docType}
                >
                  {generating ? (
                    <><Loader2 size={14} className="mr-1.5 animate-spin" /> Generating...</>
                  ) : (
                    <><FileText size={14} className="mr-1.5" /> Generate</>
                  )}
                </Button>
              </div>
            </div>

            {selectedRegion && docType && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Globe size={10} className="mr-1" /> {selectedRegion.flag} {selectedRegion.name}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {DOC_TYPES.find((d) => d.id === docType)?.name}
                </Badge>
                {orgName && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 size={10} className="mr-1" /> {orgName}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Document Type Cards */}
          {!content && !generating && (
            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDocType(d.id)}
                  className={`rounded-xl bg-card border p-5 text-left transition-all ${
                    docType === d.id ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <d.icon size={18} className="text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm">{d.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs">{d.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Generated Content */}
          {(content || generating) && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <span className="font-heading font-semibold text-sm">
                    {DOC_TYPES.find((d) => d.id === docType)?.name}
                  </span>
                  {generating && (
                    <Badge variant="secondary" className="text-[10px] animate-pulse">
                      <Loader2 size={10} className="mr-1 animate-spin" /> Writing...
                    </Badge>
                  )}
                </div>
                {content && !generating && (
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                      {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 text-xs">
                      <Download size={12} className="mr-1" /> Download
                    </Button>
                  </div>
                )}
              </div>
              <div
                ref={contentRef}
                className="p-6 max-h-[60vh] overflow-y-auto prose prose-sm max-w-none text-foreground
                  prose-headings:font-heading prose-headings:text-foreground
                  prose-p:text-muted-foreground prose-li:text-muted-foreground
                  prose-strong:text-foreground prose-a:text-primary"
              >
                {content.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
                  if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
                  if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-4 mb-1.5">{line.slice(4)}</h3>;
                  if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
                  if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-sm">{line.slice(2, -2)}</p>;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i} className="text-sm leading-relaxed">{line}</p>;
                })}
                {generating && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LegalDocs;
