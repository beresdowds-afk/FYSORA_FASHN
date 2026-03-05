import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Camera, Ruler, Video, BarChart3 } from "lucide-react";
import VirtualTryOnPanel from "./VirtualTryOnPanel";
import PremiumUsagePanel from "./PremiumUsagePanel";
import EnhancedMeasurementsPanel from "./EnhancedMeasurementsPanel";
import FeatureGate from "@/components/shared/FeatureGate";

interface PremiumFeaturesTabProps {
  orgId: string;
  role: string | null;
}

const PremiumFeaturesTab = ({ orgId, role }: PremiumFeaturesTabProps) => {
  const isAdmin = role === "org_admin" || role === "super_admin";

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={22} className="text-primary" />
        <h2 className="font-heading font-bold text-2xl">Premium Features</h2>
      </div>

      <Tabs defaultValue="tryon">
        <TabsList className="mb-6">
          <TabsTrigger value="tryon" className="gap-2">
            <Camera size={14} /> FASHN Try-On
          </TabsTrigger>
          <TabsTrigger value="measurements" className="gap-2">
            <Ruler size={14} /> 360° Measurements
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 size={14} /> Usage & Billing
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tryon">
          <FeatureGate featureKey="virtual_tryon" showLocked>
            <VirtualTryOnPanel orgId={orgId} />
          </FeatureGate>
        </TabsContent>
        <TabsContent value="measurements">
          <FeatureGate featureKey="basic_measurement" showLocked>
            <EnhancedMeasurementsPanel orgId={orgId} role={role} />
          </FeatureGate>
        </TabsContent>
        {isAdmin && (
          <TabsContent value="usage">
            <PremiumUsagePanel orgId={orgId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default PremiumFeaturesTab;
