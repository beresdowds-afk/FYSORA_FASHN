import { useState } from "react";
import { useShipments, useCarriers } from "@/hooks/useShipments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MapPin, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  booked: "bg-primary/10 text-primary",
  picked_up: "bg-secondary/10 text-secondary-foreground",
  in_transit: "bg-accent/10 text-accent-foreground",
  out_for_delivery: "bg-primary/20 text-primary",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  exception: "bg-destructive/10 text-destructive",
  returned: "bg-muted text-muted-foreground",
};

interface ShipmentsPanelProps {
  orgId: string;
  role: string | null;
  currency?: string;
}

const ShipmentsPanel = ({ orgId, role, currency = "NGN" }: ShipmentsPanelProps) => {
  const { shipments, loading, createShipment } = useShipments(orgId);
  const { carriers } = useCarriers();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    carrier_id: "",
    recipient_name: "",
    recipient_phone: "",
    recipient_email: "",
    recipient_address: { street: "", city: "", state: "", country: "", postal_code: "" },
    package_weight: "",
    package_description: "",
    declared_value: "",
    notes: "",
  });

  const handleCreate = async () => {
    const { error } = await createShipment({
      carrier_id: form.carrier_id || null,
      recipient_name: form.recipient_name,
      recipient_phone: form.recipient_phone,
      recipient_email: form.recipient_email,
      recipient_address: form.recipient_address,
      package_weight: form.package_weight ? Number(form.package_weight) : null,
      package_description: form.package_description,
      declared_value: form.declared_value ? Number(form.declared_value) : null,
      notes: form.notes,
      currency,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Shipment created" });
      setOpen(false);
      setForm({ carrier_id: "", recipient_name: "", recipient_phone: "", recipient_email: "", recipient_address: { street: "", city: "", state: "", country: "", postal_code: "" }, package_weight: "", package_description: "", declared_value: "", notes: "" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{shipments.length} shipment(s)</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus size={14} className="mr-1" /> New Shipment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Shipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Carrier</label>
                <Select value={form.carrier_id} onValueChange={(v) => setForm(f => ({ ...f, carrier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                  <SelectContent>
                    {carriers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Recipient Name</label>
                  <Input value={form.recipient_name} onChange={(e) => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <Input value={form.recipient_phone} onChange={(e) => setForm(f => ({ ...f, recipient_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <Input value={form.recipient_email} onChange={(e) => setForm(f => ({ ...f, recipient_email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Street</label>
                  <Input value={form.recipient_address.street} onChange={(e) => setForm(f => ({ ...f, recipient_address: { ...f.recipient_address, street: e.target.value } }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">City</label>
                  <Input value={form.recipient_address.city} onChange={(e) => setForm(f => ({ ...f, recipient_address: { ...f.recipient_address, city: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium">State</label>
                  <Input value={form.recipient_address.state} onChange={(e) => setForm(f => ({ ...f, recipient_address: { ...f.recipient_address, state: e.target.value } }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Country</label>
                  <Input value={form.recipient_address.country} onChange={(e) => setForm(f => ({ ...f, recipient_address: { ...f.recipient_address, country: e.target.value } }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Postal Code</label>
                  <Input value={form.recipient_address.postal_code} onChange={(e) => setForm(f => ({ ...f, recipient_address: { ...f.recipient_address, postal_code: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Weight (kg)</label>
                  <Input type="number" value={form.package_weight} onChange={(e) => setForm(f => ({ ...f, package_weight: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Declared Value ({currency})</label>
                  <Input type="number" value={form.declared_value} onChange={(e) => setForm(f => ({ ...f, declared_value: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Package Description</label>
                <Textarea value={form.package_description} onChange={(e) => setForm(f => ({ ...f, package_description: e.target.value }))} rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <Button variant="hero" className="w-full" onClick={handleCreate}>Create Shipment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {shipments.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <MapPin size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No shipments yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((s) => (
            <div key={s.id} className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{s.recipient_name || "Unknown Recipient"}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[s.status] || ""}`}>
                      {s.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.carrier?.name || "No carrier"} · {s.tracking_number || "No tracking #"}
                  </p>
                  {s.recipient_address && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[s.recipient_address.city, s.recipient_address.state, s.recipient_address.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{(s.shipping_cost || 0).toLocaleString()} {s.currency}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                  {s.tracking_number && s.carrier?.tracking_url_template && (
                    <a
                      href={s.carrier.tracking_url_template.replace("{tracking_number}", s.tracking_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-1"
                    >
                      Track <ExternalLink size={8} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ShipmentsPanel;
