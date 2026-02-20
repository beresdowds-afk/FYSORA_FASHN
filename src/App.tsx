import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateOrganization from "./pages/CreateOrganization";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CustomerPortal from "./pages/CustomerPortal";
import VideoCall from "./pages/VideoCall";
import OrgWebsite from "./pages/OrgWebsite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-organization" element={<CreateOrganization />} />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/video-call" element={<VideoCall />} />
            <Route path="/site/:slug" element={<OrgWebsite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
