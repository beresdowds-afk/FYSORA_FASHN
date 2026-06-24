import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateOrganization from "./pages/CreateOrganization";
import TailorDashboard from "./pages/TailorDashboard";
import DesignerPortal from "./pages/DesignerPortal";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CustomerPortal from "./pages/CustomerPortal";
import VideoCall from "./pages/VideoCall";
import OrgWebsite from "./pages/OrgWebsite";
import Install from "./pages/Install";
import AdminInstall from "./pages/AdminInstall";
import BrowseOrganizations from "./pages/BrowseOrganizations";
import CataloguePage from "./pages/CataloguePage";
import TailorCataloguePage from "./pages/TailorCataloguePage";
import ResetPassword from "./pages/ResetPassword";
import OrgTailorPage from "./pages/OrgTailorPage";
import ApiDocs from "./pages/ApiDocs";
import LegalDocs from "./pages/LegalDocs";
import DemoOrgWebsite from "./pages/DemoOrgWebsite";
import PlatformCataloguePage from "./pages/PlatformCataloguePage";
import PlatformTour from "./pages/PlatformTour";
import PaymentsPortal from "./pages/PaymentsPortal";
import OrgCustomerInstall from "./pages/OrgCustomerInstall";
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import AboutPage from "./pages/AboutPage";
import SubscriptionStatus from "./pages/SubscriptionStatus";
import HelpCatalogue from "./pages/HelpCatalogue";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import FysoraEcosystemDocs from "./pages/FysoraEcosystemDocs";
import ClaimTrackingPage from "./pages/ClaimTrackingPage";
import AdminClaimsReviewPage from "./pages/AdminClaimsReviewPage";
import TemplatePreviewPage from "./pages/TemplatePreviewPage";
import PlatformUpdateWatcher from "@/components/platform/PlatformUpdateWatcher";
import TourSyncWorker from "@/components/platform/TourSyncWorker";
import PaymentReturnHandler from "@/components/payments/PaymentReturnHandler";
import CookieConsent from "@/components/landing/CookieConsent";
import PersistentChrome from "@/components/layout/PersistentChrome";
import { useCustomHostname } from "@/hooks/useCustomHostname";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TENANT_HOSTNAMES, lookupTenantHost } from "@/config/tenantHostnames";

const queryClient = new QueryClient();

/**
 * When the user lands on a custom hostname (e.g. gabulkfashionstudio.org.ng),
 * forward `/` to that org's `/site/:slug` automatically — so the branded
 * domain mounts the org's website without the registrar having to handle
 * a path-aware redirect.
 */
const CustomHostnameRouter = () => {
  const { resolved, loading, resolveError } = useCustomHostname();
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isPlatformHost =
    !host ||
    host === "localhost" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "fs-africa.org.ng" ||
    host === "www.fs-africa.org.ng" ||
    host === "fashionstitchesafrica.lovable.app";

  useEffect(() => {
    if (!resolved) return;
    // Only auto-route from the root; respect any deep links the visitor used.
    if (location.pathname === "/" || location.pathname === "/platform-catalogue") {
      navigate(`/site/${resolved.slug}`, { replace: true });
    }
  }, [resolved, location.pathname, navigate]);

  // Fallback UI: tenant host known to us but DB resolver returned nothing
  // (or errored). Show a countdown that auto-forwards to the platform site
  // for the tenant slug, so the visitor is never stranded on a blank page.
  const staticHit = lookupTenantHost(host);
  const shouldShowFallback =
    !isPlatformHost &&
    !loading &&
    !resolved &&
    (resolveError !== null || staticHit !== null) &&
    (location.pathname === "/" || location.pathname === "/platform-catalogue");

  useEffect(() => {
    if (!shouldShowFallback) return;
    if (countdown <= 0) {
      const fallbackSlug = staticHit?.slug ?? TENANT_HOSTNAMES[0]?.slug;
      if (fallbackSlug) {
        window.location.href = `https://www.fs-africa.org.ng/site/${fallbackSlug}`;
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [shouldShowFallback, countdown, staticHit]);

  if (!shouldShowFallback) return null;

  const fallbackSlug = staticHit?.slug;
  const fallbackName = staticHit?.name ?? "this organisation";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-6">
      <div className="max-w-md w-full rounded-xl border bg-card p-6 shadow-lg text-center">
        <h1 className="text-xl font-semibold mb-2">Redirecting to {fallbackName}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          The custom domain <code className="font-mono">{host}</code> is being routed through
          FYSORA FASHN. You will be forwarded in <strong>{countdown}s</strong>.
        </p>
        {fallbackSlug && (
          <a
            href={`https://www.fs-africa.org.ng/site/${fallbackSlug}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Continue now
          </a>
        )}
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CustomHostnameRouter />
          <PlatformUpdateWatcher audience="all" />
          <TourSyncWorker />
          <PaymentReturnHandler />
          <PersistentChrome>
          <Routes>
            {/* Single canonical mount of the platform catalogue at /platform-catalogue.
                `/` redirects to avoid two duplicate platform-catalogue pages. */}
            <Route path="/" element={<Navigate to="/platform-catalogue" replace />} />
            <Route path="/landing" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-organization" element={<CreateOrganization />} />
            <Route path="/tailor-dashboard" element={<TailorDashboard />} />
            <Route path="/designer-portal" element={<DesignerPortal />} />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/video-call" element={<VideoCall />} />
            <Route path="/site/:slug" element={<OrgWebsite />} />
            <Route path="/site/:slug/tailor/:tailorId" element={<OrgTailorPage />} />
            <Route path="/site/:slug/install" element={<OrgCustomerInstall />} />
            <Route path="/install" element={<Install />} />
            <Route path="/admin-install" element={<AdminInstall />} />
            <Route path="/browse" element={<BrowseOrganizations />} />
            <Route path="/catalogue/tailor/:tailorId" element={<TailorCataloguePage />} />
            <Route path="/catalogue/:orgId" element={<CataloguePage />} />
            <Route path="/platform-catalogue" element={<PlatformCataloguePage />} />
            <Route path="/platform-tour" element={<PlatformTour />} />
            <Route path="/payments" element={<PaymentsPortal />} />
            <Route path="/docs/api" element={<ApiDocs />} />
            <Route path="/api-docs" element={<Navigate to="/docs/api" replace />} />
            <Route path="/preview/template/:token" element={<TemplatePreviewPage />} />
            <Route path="/legal" element={<LegalDocs />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/subscription" element={<SubscriptionStatus />} />
            <Route path="/demo-org" element={<DemoOrgWebsite />} />
            <Route path="/help/catalogue" element={<HelpCatalogue />} />
            <Route path="/fysora-ecosystem" element={<FysoraEcosystemDocs />} />
            <Route path="/fysora-ecosystem/:doc" element={<FysoraEcosystemDocs />} />
            <Route path="/claims/:id" element={<ClaimTrackingPage />} />
            <Route path="/super-admin/claims" element={<AdminClaimsReviewPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PersistentChrome>
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
