import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, AlertTriangle } from "lucide-react";
import ShipmentsPanel from "./ShipmentsPanel";
import DeliveryFlagsPanel from "./DeliveryFlagsPanel";
import CarrierSettingsPanel from "./CarrierSettingsPanel";

interface LogisticsTabProps {
  orgId: string;
  role: string | null;
  currency?: string;
}

const LogisticsTab = ({ orgId, role, currency = "NGN" }: LogisticsTabProps) => {
  return (
    <div>
      <h2 className="font-heading font-bold text-2xl mb-6">Logistics & Shipping</h2>
      <Tabs defaultValue="shipments" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="shipments" className="gap-1.5 text-xs">
            <Package size={14} /> Shipments
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-1.5 text-xs">
            <AlertTriangle size={14} /> Exceptions
          </TabsTrigger>
          <TabsTrigger value="carriers" className="gap-1.5 text-xs">
            <Truck size={14} /> Carriers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments">
          <ShipmentsPanel orgId={orgId} role={role} currency={currency} />
        </TabsContent>
        <TabsContent value="flags">
          <DeliveryFlagsPanel orgId={orgId} />
        </TabsContent>
        <TabsContent value="carriers">
          <CarrierSettingsPanel orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogisticsTab;
