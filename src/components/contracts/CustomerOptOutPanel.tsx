import { useState } from "react";
import { useCustomerOptOuts } from "@/hooks/useCustomerOptOuts";
import { useOrgMembers } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserX, Plus, RotateCcw, Trash2 } from "lucide-react";

const OPT_OUT_FEATURES = [
  { key: "marketing_emails", label: "Marketing Emails" },
  { key: "sms_notifications", label: "SMS Notifications" },
  { key: "whatsapp_messages", label: "WhatsApp Messages" },
  { key: "promotional_offers", label: "Promotional Offers" },
  { key: "order_updates", label: "Order Status Updates" },
  { key: "measurement_reminders", label: "Measurement Reminders" },
  { key: "newsletter", label: "Newsletter" },
];

const CustomerOptOutPanel = ({ orgId }: { orgId: string }) => {
  const { optOuts, loading, createOptOut, optBackIn, deleteOptOut } = useCustomerOptOuts(orgId);
  const { members } = useOrgMembers(orgId);
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    opt_out_type: "selective",
    opted_out_features: [] as string[],
    reason: "",
  });

  const customers = members?.filter(m => m.role === "customer") || [];

  const handleCreate = async () => {
    if (!form.customer_id) { toast({ title: "Select a customer", variant: "destructive" }); return; }
    const { error } = await createOptOut({
      customer_id: form.customer_id,
      opt_out_type: form.opt_out_type,
      opted_out_features: form.opted_out_features,
      reason: form.reason || undefined,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Opt-out recorded" });
      setShowCreate(false);
      setForm({ customer_id: "", opt_out_type: "selective", opted_out_features: [], reason: "" });
    }
  };

  const toggleFeature = (key: string, checked: boolean) => {
    setForm(f => ({
      ...f,
      opted_out_features: checked ? [...f.opted_out_features, key] : f.opted_out_features.filter(k => k !== key),
    }));
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><UserX size={20} /> Customer Opt-Outs</CardTitle>
              <CardDescription>Manage selective communication preferences per customer.</CardDescription>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus size={14} className="mr-1" /> Add Opt-Out</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Customer Opt-Out</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Customer</Label>
                    <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.user_id} value={c.user_id}>{c.profile?.display_name || c.user_id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.opt_out_type} onValueChange={v => setForm({ ...form, opt_out_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Communications</SelectItem>
                        <SelectItem value="selective">Selective Features</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.opt_out_type === "selective" && (
                    <div className="space-y-2">
                      <Label>Opt Out From</Label>
                      {OPT_OUT_FEATURES.map(f => (
                        <div key={f.key} className="flex items-center gap-2">
                          <Checkbox
                            checked={form.opted_out_features.includes(f.key)}
                            onCheckedChange={(c) => toggleFeature(f.key, !!c)}
                          />
                          <span className="text-sm">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <Label>Reason (optional)</Label>
                    <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                  </div>
                  <Button onClick={handleCreate} className="w-full">Record Opt-Out</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {optOuts.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No opt-outs recorded.</p>
          ) : (
            <div className="space-y-3">
              {optOuts.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{o.customer_profile?.display_name || "Customer"}</span>
                      <Badge variant={o.status === "opted_out" ? "destructive" : "secondary"}>
                        {o.status === "opted_out" ? "Opted Out" : "Opted In"}
                      </Badge>
                      <Badge variant="outline">{o.opt_out_type}</Badge>
                    </div>
                    {o.opted_out_features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {o.opted_out_features.map(f => (
                          <Badge key={f} variant="secondary" className="text-[10px]">{f.replace("_", " ")}</Badge>
                        ))}
                      </div>
                    )}
                    {o.reason && <p className="text-xs text-muted-foreground">{o.reason}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      Since: {new Date(o.opted_out_at).toLocaleDateString()}
                      {o.opted_back_in_at && ` | Opted back: ${new Date(o.opted_back_in_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {o.status === "opted_out" && (
                      <Button size="sm" variant="outline" onClick={() => optBackIn(o.id)}>
                        <RotateCcw size={12} className="mr-1" /> Opt In
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteOptOut(o.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerOptOutPanel;
