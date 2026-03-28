import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceFormData {
  id?: string;
  recipient_type: string;
  recipient_name: string;
  recipient_email: string;
  recipient_org_id?: string;
  currency: string;
  due_date: string;
  notes: string;
  payment_terms: string;
  tax_rate: number;
  discount_amount: number;
  items: LineItem[];
}

interface InvoiceCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId?: string;
  orgName?: string;
  currency?: string;
  editInvoice?: InvoiceFormData | null;
  onSaved: () => void;
  isSuperAdmin?: boolean;
}

const emptyItem = (): LineItem => ({ description: "", quantity: 1, unit_price: 0, total: 0 });

const InvoiceCreatorDialog = ({
  open,
  onOpenChange,
  orgId,
  orgName,
  currency = "NGN",
  editInvoice,
  onSaved,
  isSuperAdmin = false,
}: InvoiceCreatorDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(orgId || "");

  const [form, setForm] = useState<InvoiceFormData>({
    recipient_type: "organization",
    recipient_name: "",
    recipient_email: "",
    currency,
    due_date: "",
    notes: "",
    payment_terms: "Due within 30 days of invoice date.",
    tax_rate: 0,
    discount_amount: 0,
    items: [emptyItem()],
  });

  useEffect(() => {
    if (editInvoice) {
      setForm(editInvoice);
      if (editInvoice.recipient_org_id) setSelectedOrgId(editInvoice.recipient_org_id);
    } else {
      setForm({
        recipient_type: "organization",
        recipient_name: "",
        recipient_email: "",
        currency,
        due_date: "",
        notes: "",
        payment_terms: "Due within 30 days of invoice date.",
        tax_rate: 0,
        discount_amount: 0,
        items: [emptyItem()],
      });
    }
  }, [editInvoice, currency, open]);

  // Load orgs for super admin
  useEffect(() => {
    if (!isSuperAdmin || !open) return;
    supabase
      .from("organizations")
      .select("id, name")
      .order("name")
      .then(({ data }) => setOrgs(data || []));
  }, [isSuperAdmin, open]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.total = Number(item.quantity) * Number(item.unit_price);
      }
      items[index] = item;
      return { ...prev, items };
    });
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (i: number) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0);
  const taxAmount = subtotal * (Number(form.tax_rate) / 100);
  const totalAmount = subtotal + taxAmount - Number(form.discount_amount);

  const handleSave = async (status: "draft" | "sent") => {
    if (!form.recipient_name.trim()) {
      toast({ title: "Recipient name required", variant: "destructive" });
      return;
    }
    if (form.items.length === 0 || form.items.every((i) => !i.description.trim())) {
      toast({ title: "At least one line item required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setSaving(false);
      return;
    }

    const invoiceOrgId = isSuperAdmin ? (selectedOrgId || null) : orgId;
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    const invoiceData = {
      org_id: invoiceOrgId,
      created_by: user.id,
      recipient_type: form.recipient_type,
      recipient_name: form.recipient_name.trim(),
      recipient_email: form.recipient_email.trim() || null,
      recipient_org_id: form.recipient_org_id || null,
      invoice_number: editInvoice?.id ? undefined : invoiceNumber,
      status,
      subtotal,
      tax_rate: Number(form.tax_rate),
      tax_amount: taxAmount,
      discount_amount: Number(form.discount_amount),
      total_amount: totalAmount,
      currency: form.currency,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      notes: form.notes || null,
      payment_terms: form.payment_terms || null,
      issued_at: status === "sent" ? new Date().toISOString() : null,
    };

    let invoiceId: string;

    if (editInvoice?.id) {
      const { error } = await supabase
        .from("custom_invoices")
        .update(invoiceData as any)
        .eq("id", editInvoice.id);
      if (error) {
        toast({ title: "Error updating invoice", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      invoiceId = editInvoice.id;

      // Delete old items and re-insert
      await supabase.from("custom_invoice_items").delete().eq("invoice_id", invoiceId);
    } else {
      const { data, error } = await supabase
        .from("custom_invoices")
        .insert(invoiceData as any)
        .select("id")
        .single();
      if (error || !data) {
        toast({ title: "Error creating invoice", description: error?.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      invoiceId = data.id;
    }

    // Insert line items
    const itemsToInsert = form.items
      .filter((i) => i.description.trim())
      .map((item, idx) => ({
        invoice_id: invoiceId,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.quantity) * Number(item.unit_price),
        sort_order: idx,
      }));

    if (itemsToInsert.length > 0) {
      await supabase.from("custom_invoice_items").insert(itemsToInsert);
    }

    toast({ title: editInvoice?.id ? "Invoice updated" : "Invoice created", description: `${invoiceNumber || "Invoice"} saved as ${status}.` });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editInvoice?.id ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
          <DialogDescription>
            {isSuperAdmin
              ? "Create an invoice for any organization, tailor, or designer on the platform."
              : `Create an invoice for ${orgName || "your organization"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Recipient */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Recipient Type</Label>
              <Select
                value={form.recipient_type}
                onValueChange={(v) => setForm((p) => ({ ...p, recipient_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="tailor">Tailor</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="KES">KES (KSh)</SelectItem>
                  <SelectItem value="GHS">GHS (₵)</SelectItem>
                  <SelectItem value="ZAR">ZAR (R)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSuperAdmin && (
            <div>
              <Label>Billing Organization (optional)</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger><SelectValue placeholder="Platform-level invoice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Platform-level (no org)</SelectItem>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={form.recipient_name}
                onChange={(e) => setForm((p) => ({ ...p, recipient_name: e.target.value }))}
                placeholder="e.g., GABULK FASHION STUDIO"
              />
            </div>
            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={form.recipient_email}
                onChange={(e) => setForm((p) => ({ ...p, recipient_email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input
                value={form.payment_terms}
                onChange={(e) => setForm((p) => ({ ...p, payment_terms: e.target.value }))}
                placeholder="Due within 30 days"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="text-xs h-7">
                <Plus size={12} className="mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase px-1">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Total</span>
                <span />
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="Item description"
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm"
                    min={0}
                  />
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm"
                    min={0}
                    step={0.01}
                  />
                  <div className="text-sm font-medium px-2">
                    {(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                  </div>
                  {form.items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{form.currency} {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground">Tax Rate (%)</span>
              <Input
                type="number"
                value={form.tax_rate}
                onChange={(e) => setForm((p) => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))}
                className="w-20 h-7 text-sm text-right"
                min={0}
                step={0.5}
              />
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{form.currency} {taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                value={form.discount_amount}
                onChange={(e) => setForm((p) => ({ ...p, discount_amount: parseFloat(e.target.value) || 0 }))}
                className="w-24 h-7 text-sm text-right"
                min={0}
              />
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
              <span>Total</span>
              <span>{form.currency} {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes for the invoice..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button onClick={() => handleSave("sent")} disabled={saving}>
            {saving ? "Saving..." : "Save & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceCreatorDialog;
