import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeaturedSlots } from "@/hooks/useFeaturedSlots";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Star, Plus, Trash2, DollarSign, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface FeaturedProductsPanelProps {
  orgId: string;
  userRole: string;
}

export default function FeaturedProductsPanel({ orgId, userRole }: FeaturedProductsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { slots, config, loading, freeSlotsRemaining, weekStart, weekEnd, addSlot, removeSlot } = useFeaturedSlots(orgId, user?.id, userRole);
  const [catalogueItems, setCatalogueItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("org_catalogue_items")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_available", true)
      .order("name")
      .then(({ data }) => {
        setCatalogueItems(data || []);
        setLoadingItems(false);
      });
  }, [orgId]);

  const currentWeekSlots = slots.filter(s => s.week_start === weekStart);
  const featuredItemIds = new Set(currentWeekSlots.map(s => s.catalogue_item_id));
  const availableItems = catalogueItems.filter(i => !featuredItemIds.has(i.id));

  const handleAdd = async (itemId: string) => {
    const isPaid = freeSlotsRemaining <= 0;
    setAdding(itemId);
    const { error } = await addSlot(itemId, isPaid);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: isPaid ? `Paid slot added ($${config?.paid_slot_price || 8})` : "Free slot used!",
        description: `Product featured for this week.`,
      });
    }
    setAdding(null);
  };

  const handleRemove = async (slotId: string) => {
    const { error } = await removeSlot(slotId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Slot removed" });
  };

  if (loading || loadingItems) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <Star size={20} className="text-primary" /> Featured Products
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Curate products to feature on the platform this week ({weekStart} → {weekEnd}).
        </p>
      </div>

      {/* Slot Info */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <Sparkles size={14} className="text-secondary" /> {freeSlotsRemaining} free slot{freeSlotsRemaining !== 1 ? "s" : ""} remaining
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <DollarSign size={14} className="text-primary" /> ${config?.paid_slot_price || 8}/slot for additional
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
          <Star size={14} className="text-accent" /> {currentWeekSlots.length} featured this week
        </Badge>
      </div>

      {/* Current Featured */}
      {currentWeekSlots.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3">This Week's Featured</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentWeekSlots.map((slot, i) => {
              const item = catalogueItems.find(c => c.id === slot.catalogue_item_id);
              return (
                <motion.div key={slot.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 border-primary/20">
                    {item?.image_url && (
                      <img src={item.image_url} alt={item?.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{item?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{item?.category}</p>
                        <Badge className={`mt-1 text-[10px] ${slot.slot_type === "free" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary"}`}>
                          {slot.slot_type === "free" ? "Free Slot" : `Paid $${slot.amount_paid}`}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleRemove(slot.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available to Feature */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3">Available Products</h3>
        {availableItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">All catalogue items are already featured this week.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableItems.map((item) => (
              <Card key={item.id} className="p-4 hover:border-primary/30 transition-colors">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground mb-3">{item.category} · {item.currency} {item.price}</p>
                <Button
                  variant={freeSlotsRemaining > 0 ? "hero" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={adding === item.id}
                  onClick={() => handleAdd(item.id)}
                >
                  {adding === item.id ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : (
                    <Plus size={14} className="mr-1" />
                  )}
                  {freeSlotsRemaining > 0 ? "Feature (Free)" : `Feature ($${config?.paid_slot_price || 8})`}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
