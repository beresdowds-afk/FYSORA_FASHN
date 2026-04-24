import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Book, ChevronDown, ChevronRight, Globe, ShoppingCart, Palette, Share2, Smartphone, HelpCircle, Crown, Zap, Link2 } from "lucide-react";

interface ManualProps {
  userRole: "org_admin" | "manager" | "designer" | string;
  currentPlan: "lite" | "pro" | "pro-lite" | "none";
  orgName?: string;
}

interface PlatformDetails {
  platformName: string;
  platformUrl: string;
  supportEmail: string;
  appDownloadNote: string;
}

const DEFAULT_DETAILS: PlatformDetails = {
  platformName: "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)",
  platformUrl: "fs-africa.org.ng",
  supportEmail: "support@fs-africa.org.ng",
  appDownloadNote: "App download from Google Play and other app stores is coming soon.",
};

const WebsiteBuilderManual = ({ userRole, currentPlan, orgName }: ManualProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<PlatformDetails>(DEFAULT_DETAILS);

  useEffect(() => {
    const fetchDetails = async () => {
      const { data } = await (supabase
        .from("platform_settings")
        .select("key, value") as any)
        .in("key", ["platform_name", "platform_url", "support_email", "app_download_note"]);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { map[d.key] = d.value; });
        setDetails({
          platformName: map.platform_name || DEFAULT_DETAILS.platformName,
          platformUrl: map.platform_url || DEFAULT_DETAILS.platformUrl,
          supportEmail: map.support_email || DEFAULT_DETAILS.supportEmail,
          appDownloadNote: map.app_download_note || DEFAULT_DETAILS.appDownloadNote,
        });
      }
    };
    fetchDetails();
  }, []);

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  const isDesigner = userRole === "designer";
  const roleLabel = isDesigner ? "Designer" : "Organization";

  const planIcon = currentPlan === "pro" ? Crown : currentPlan === "pro-lite" ? Link2 : Zap;
  const planLabel = currentPlan === "pro" ? "Website Builder Pro" : currentPlan === "pro-lite" ? "Website Builder Pro-Lite" : "Website Builder Lite";

  const sections = [
    {
      id: "overview",
      icon: Globe,
      title: "Getting Started with Your Website",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to the {details.platformName} Website Builder! As {isDesigner ? "a Designer" : "an Organization"}, 
            you can create a professional fashion website to showcase your work and connect with customers.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="font-medium text-foreground text-xs mb-1">Your Current Plan</p>
            <div className="flex items-center gap-2">
              {(() => { const Icon = planIcon; return <Icon size={14} className="text-primary" />; })()}
              <span className="font-semibold text-foreground">{planLabel}</span>
            </div>
          </div>
          <p className="font-medium text-foreground">How to Get Started:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Go to the <strong>Website Builder</strong> tab in your dashboard</li>
            <li>Select your preferred website builder plan (Lite, Pro, or Pro-Lite)</li>
            <li>Choose a native subdomain (e.g., yourname.{details.platformUrl}) or a custom domain</li>
            <li>Complete payment through the platform (fee waivers apply for eligible accounts)</li>
            <li>Your payment is confirmed and logged automatically</li>
            <li>Your website activation request is submitted for processing</li>
            <li>For native websites: DNS and email are auto-verified and the build is auto-initiated</li>
            <li>For custom domain websites: DNS verification and build are manually initiated by the admin team</li>
            <li>All websites are automatically pushed to GitHub for version control</li>
            <li>Once approved, your website goes live!</li>
          </ol>
        </div>
      ),
    },
    {
      id: "plans",
      icon: Crown,
      title: "Website Builder Plans",
      content: (
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div className="grid gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-primary" />
                <span className="font-semibold text-foreground">Lite Plan — $17/month</span>
              </div>
              <p>Native subdomain on {details.platformUrl}. Includes auto-generated branded website, product catalogue, appointment booking, mobile responsive design, SSL & hosting. 6-month free trial included.</p>
            </div>
          <div className="rounded-lg bg-accent/5 border border-accent/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={14} className="text-accent" />
                <span className="font-semibold text-foreground">Pro Plan — $339 one-time + $7/month</span>
              </div>
              <p>Everything in Lite plus: custom domain support, full e-commerce module, SEO tools, analytics, priority 24/7 support, 20+ premium templates, dedicated setup by our team, social media integrations.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Link2 size={14} className="text-primary" />
                <span className="font-semibold text-foreground">Pro-Lite Plan — $149 one-time + $5/month</span>
              </div>
              <p>Link your existing external website to {details.platformName}. We integrate AI Measurements, Virtual Try-On, Appointment Booking, and more. Includes platform evaluation and ongoing sync.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "homepage",
      icon: Globe,
      title: "Managing Your Home Page & Hero Section",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Your website's home page features a customizable hero section that creates the first impression for visitors.</p>
          <p className="font-medium text-foreground">What you can customize (from your Dashboard only):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Tagline</strong> — A short, catchy phrase that represents your brand</li>
            <li><strong>Hero Description</strong> — A brief description displayed on the homepage</li>
            <li><strong>Hero Image</strong> — The main banner image for your homepage</li>
            <li><strong>Brand Colors</strong> — Primary and accent colors for your website</li>
            <li><strong>Logo & Favicon</strong> — Your brand identity elements</li>
          </ul>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="text-xs font-medium text-foreground mb-1">How to update:</p>
            <p className="text-xs">Navigate to Website Builder → General tab to edit content, or Branding tab for visual identity. Changes require saving and re-publishing by the admin team.</p>
          </div>
          <p className="text-xs italic">Note: Hero and header customization is available from your dashboard only, not from the mobile app.</p>
        </div>
      ),
    },
    {
      id: "catalogue",
      icon: ShoppingCart,
      title: "Catalogue & Cart Management",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Your catalogue showcases your products and services to website visitors. Items in the catalogue are displayed on your website automatically.</p>
          <p className="font-medium text-foreground">Managing your Catalogue:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>From Dashboard</strong> — Full control: add, edit, delete items. Manage images, pricing, descriptions, categories, and availability.</li>
            <li><strong>From Mobile App</strong> — Quick catalogue updates on the go: add/edit items, update pricing and availability.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">Cart & Orders:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customers can browse your catalogue and add items to their cart</li>
            <li>Cart submissions are automatically sent to your {details.platformName} dashboard and app</li>
            <li>You receive notifications for new orders via your preferred channels (email, SMS, WhatsApp)</li>
            <li>Manage all orders from the Orders tab in your dashboard</li>
          </ul>
          {currentPlan === "lite" && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs">
              <p className="font-medium text-foreground">Lite Plan Note:</p>
              <p>Catalogue items are display-only on the Lite plan. Upgrade to Pro for full e-commerce with cart functionality and up to 100 product slots.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "branding",
      icon: Palette,
      title: "Branding & Footer Customization",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Make your website uniquely yours with comprehensive branding controls.</p>
          <p className="font-medium text-foreground">Branding Elements (Dashboard only):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Color Palette</strong> — 6-color palette builder (brand, accent, tertiary, background, text, surface)</li>
            <li><strong>Typography</strong> — Choose from premium Google Fonts for headings and body text</li>
            <li><strong>Logo & Favicon</strong> — Upload your brand logo and browser icon</li>
            <li><strong>Vision & Mission</strong> — Share your brand's purpose and aspirations</li>
            <li><strong>Company Details</strong> — Description, email, phone, and address</li>
          </ul>
          <p className="font-medium text-foreground mt-2">Footer (Dashboard only):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your organization name and copyright information</li>
            <li>Links to social media profiles</li>
            <li>"Powered by {details.platformName}" attribution</li>
            <li>Contact information from your company details</li>
          </ul>
          <p className="text-xs italic">Note: Header, landing page, and footer management is available from your dashboard only, not from the mobile app.</p>
        </div>
      ),
    },
    {
      id: "social",
      icon: Share2,
      title: "Social Media Integration",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Connect your social media accounts to automatically share catalogue items with your followers.</p>
          <p className="font-medium text-foreground">Supported Platforms:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Instagram</li>
            <li>Facebook</li>
            <li>X (Twitter)</li>
            <li>TikTok</li>
            <li>YouTube</li>
            <li>LinkedIn</li>
            <li>WhatsApp</li>
          </ul>
          <p className="font-medium text-foreground mt-2">How it works:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to Website Builder → General tab in your dashboard</li>
            <li>Add your social media URLs</li>
            <li>Enable Social Sync from the sync panel</li>
            <li>When activated, new catalogue items are automatically posted to your connected accounts</li>
          </ol>
        </div>
      ),
    },
    {
      id: "app",
      icon: Smartphone,
      title: "Mobile App",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Access your dashboard on the go with the {details.platformName} mobile app.</p>
          <p className="font-medium text-foreground">App Capabilities:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Catalogue Management</strong> — Add, edit, and manage product items</li>
            <li><strong>Order Notifications</strong> — Receive real-time alerts for new orders</li>
            <li><strong>Quick Updates</strong> — Update pricing and availability instantly</li>
          </ul>
          <p className="font-medium text-foreground mt-2">What's Dashboard-only:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hero section and header customization</li>
            <li>Footer editing</li>
            <li>Branding controls (colors, fonts, logos)</li>
            <li>Company information management</li>
            <li>Social media URL configuration</li>
          </ul>
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
            <p>{details.appDownloadNote}</p>
            <p className="mt-1">In the meantime, you can install the web app from your browser for a mobile-optimized experience. Visit <strong>{details.platformUrl}</strong> and look for the "Install App" option.</p>
          </div>
        </div>
      ),
    },
    {
      id: "faq",
      icon: HelpCircle,
      title: "Frequently Asked Questions",
      content: (
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          {[
            { q: "How long does it take for my website to go live?", a: "Native websites (Lite plan) are typically live within 24–48 hours after payment. Pro websites with custom domains may take 3–5 business days for DNS propagation and setup." },
            { q: "Can I change my plan later?", a: "Yes! You can upgrade from Lite to Pro at any time. A prorated discount applies for unused trial time." },
            { q: "How do customers place orders?", a: "Customers browse your catalogue on your website, add items to their cart, and submit. The order appears in your dashboard and app automatically." },
            { q: "Can I use my own domain name?", a: "Yes, with the Pro plan. Custom domains require DNS configuration which our team handles for you." },
            { q: "How do I update my website content?", a: "Log in to your dashboard, go to the Website Builder tab, and make changes. After saving, the admin team will re-publish your updated website." },
            { q: `How do I contact support?`, a: `Email ${details.supportEmail} or use the support request feature in your dashboard.` },
          ].map((faq, i) => (
            <div key={i}>
              <p className="font-medium text-foreground">{faq.q}</p>
              <p className="mt-0.5">{faq.a}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Book size={20} className="text-primary" />
        <div>
          <h3 className="font-heading font-semibold text-lg">Website Builder User Guide</h3>
          <p className="text-xs text-muted-foreground">
            {roleLabel} guide for {orgName || "your organization"} · {planLabel}
          </p>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => toggle(section.id)}
            className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
          >
            <section.icon size={16} className="text-primary shrink-0" />
            <span className="font-medium text-sm flex-1">{section.title}</span>
            {expanded === section.id ? (
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground shrink-0" />
            )}
          </button>
          {expanded === section.id && (
            <div className="px-4 pb-4 pt-1 border-t border-border/50">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WebsiteBuilderManual;
