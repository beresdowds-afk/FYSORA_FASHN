import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { useOrders } from "@/hooks/useOrders";

interface OrderItemInput {
  name: string;
  quantity: number;
  unit_price: number;
  fabric_details: string;
}

interface CreateOrderDialogProps {
  orgId: string;
  currency: string;
  userId: string;
  createOrder: ReturnType<typeof useOrders>["createOrder"];
  children: React.ReactNode;
}

const CreateOrderDialog = ({ orgId, currency, userId, createOrder, children }: CreateOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<OrderItemInput[]>([{ name: "", quantity: 1, unit_price: 0, fabric_details: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const addItem = () => setItems([...items, { name: "", quantity: 1, unit_price: 0, fabric_details: "" }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItemInput, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || items.some((i) => !i.name.trim())) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await createOrder({
      title,
      description,
      customer_id: userId,
      due_date: dueDate || undefined,
      currency,
      items: items.map((i) => ({ ...i, unit_price: Number(i.unit_price), quantity: Number(i.quantity) })),
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error creating order", description: (error as any).message, variant: "destructive" });
    } else {
      toast({ title: "Order created successfully!" });
      setOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setItems([{ name: "", quantity: 1, unit_price: 0, fabric_details: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create New Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wedding Dress" required />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Order details..." rows={2} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-heading font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={14} className="mr-1" /> Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input placeholder="Item name *" value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} required />
                  <Input type="number" placeholder="Qty" min={1} value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)} />
                  <Input type="number" placeholder="Unit price" min={0} step={0.01} value={item.unit_price || ""} onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} />
                </div>
                <Input placeholder="Fabric details (optional)" value={item.fabric_details} onChange={(e) => updateItem(index, "fabric_details", e.target.value)} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <span className="text-sm text-muted-foreground">Total: </span>
              <span className="font-heading font-bold text-lg">
                {total.toLocaleString()} {currency}
              </span>
            </div>
            <Button variant="hero" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderDialog;
