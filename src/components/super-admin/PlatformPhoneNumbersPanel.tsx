import { useState } from "react";
import { usePlatformPhoneNumbers } from "@/hooks/useCommsArchitecture";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Plus, Edit2, Trash2, Signal, Globe, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const providerColors: Record<string, string> = {
  termii: "bg-emerald-500/10 text-emerald-600",
  twilio: "bg-red-500/10 text-red-600",
  whatchimp: "bg-green-500/10 text-green-600",
  carrier: "bg-blue-500/10 text-blue-600",
};

const providerIcons: Record<string, typeof Phone> = {
  termii: Signal,
  twilio: Globe,
  whatchimp: Wifi,
  carrier: Phone,
};

const PlatformPhoneNumbersPanel = () => {
  const { numbers, updateNumber, addNumber, deleteNumber } = usePlatformPhoneNumbers();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    number_label: "", phone_number: "", provider: "termii",
    number_type: "sms", country_code: "NG", is_primary: false, notes: "",
  });

  const resetForm = () => setForm({
    number_label: "", phone_number: "", provider: "termii",
    number_type: "sms", country_code: "NG", is_primary: false, notes: "",
  });

  const handleSave = async () => {
    if (editId) {
      await updateNumber.mutateAsync({ id: editId, ...form } as any);
      setEditId(null);
    } else {
      await addNumber.mutateAsync(form as any);
    }
    resetForm();
    setAddOpen(false);
  };

  const startEdit = (num: any) => {
    setForm({
      number_label: num.number_label,
      phone_number: num.phone_number,
      provider: num.provider,
      number_type: num.number_type,
      country_code: num.country_code || "NG",
      is_primary: num.is_primary,
      notes: num.notes || "",
    });
    setEditId(num.id);
    setAddOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl">Platform Phone Numbers</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage bridge numbers and public-facing lines. Update placeholders with actual numbers.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) { resetForm(); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus size={14} className="mr-1" /> Add Number</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Phone Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Label</Label>
                <Input value={form.number_label} onChange={e => setForm(p => ({ ...p, number_label: e.target.value }))} placeholder="e.g. Primary SMS Line" />
              </div>
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="+234 XX XXX XXXX" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Provider</Label>
                  <Select value={form.provider} onValueChange={v => setForm(p => ({ ...p, provider: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="termii">Termii</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="whatchimp">WhatChimp</SelectItem>
                      <SelectItem value="carrier">Carrier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.number_type} onValueChange={v => setForm(p => ({ ...p, number_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Country Code</Label>
                <Input value={form.country_code} onChange={e => setForm(p => ({ ...p, country_code: e.target.value }))} placeholder="NG" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_primary} onCheckedChange={v => setForm(p => ({ ...p, is_primary: v }))} />
                <Label className="text-xs">Primary Number</Label>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Purpose and configuration notes" />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={!form.number_label || !form.phone_number}>
                {editId ? "Update" : "Add"} Number
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {numbers.isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {(numbers.data || []).map((num: any) => {
            const Icon = providerIcons[num.provider] || Phone;
            const isPlaceholder = num.phone_number.includes("XX");
            return (
              <Card key={num.id} className={`p-4 ${isPlaceholder ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${providerColors[num.provider] || "bg-muted text-muted-foreground"}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{num.number_label}</h4>
                        {num.is_primary && <Badge variant="default" className="text-[10px]">Primary</Badge>}
                        {isPlaceholder && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Placeholder</Badge>}
                      </div>
                      <p className="text-lg font-mono font-semibold mt-0.5">{num.phone_number}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${providerColors[num.provider]}`}>
                          {num.provider}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{num.number_type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{num.country_code}</Badge>
                        <Badge variant={num.is_active ? "default" : "secondary"} className="text-[10px]">
                          {num.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {num.notes && <p className="text-xs text-muted-foreground mt-2">{num.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(num)}>
                      <Edit2 size={14} />
                    </Button>
                    <Switch
                      checked={num.is_active}
                      onCheckedChange={v => updateNumber.mutate({ id: num.id, is_active: v } as any)}
                      className="scale-75"
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Phone Number?</AlertDialogTitle>
                          <AlertDialogDescription>Remove "{num.number_label}" from platform assets.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteNumber.mutate(num.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default PlatformPhoneNumbersPanel;
