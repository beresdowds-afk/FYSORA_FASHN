import { useCarriers } from "@/hooks/useShipments";
import { Badge } from "@/components/ui/badge";
import { Truck, Globe, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const typeIcons: Record<string, typeof Globe> = {
  international: Globe,
  regional: MapPin,
  local: Truck,
};

const CarrierSettingsPanel = ({ orgId }: { orgId: string }) => {
  const { carriers, loading } = useCarriers();

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <p className="text-sm text-muted-foreground mb-4">
        Available shipping carriers. Connect API keys via Settings to enable rate quotes and label generation.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {carriers.map((carrier) => {
          const Icon = typeIcons[carrier.carrier_type] || Truck;
          return (
            <div key={carrier.id} className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{carrier.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{carrier.carrier_type}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {carrier.supported_regions.map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                  API Key Required
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CarrierSettingsPanel;
