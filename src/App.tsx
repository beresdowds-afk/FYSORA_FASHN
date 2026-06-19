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
import PlatformUpdateWatcher from "@/components/platform/PlatformUpdateWatcher";
import TourSyncWorker from "@/components/platform/TourSyncWorker";
import PaymentReturnHandler from "@/components/payments/PaymentReturnHandler";
import CookieConsent from "@/components/landing/CookieConsent";
import PersistentChrome from "@/components/layout/PersistentChrome";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
