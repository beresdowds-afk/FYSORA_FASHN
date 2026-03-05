import { useState } from "react";
import { useOrderDelegations } from "@/hooks/useTailorContracts";
import { useTailorContracts } from "@/hooks/useTailorContracts";
import { useOrders } from "@/hooks/useOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRight, Star, Clock } from "lucide-react";

const delegationStatusColors: Record<string, string> = {
  assigned: "bg-muted text-muted-foreground",
  accepted: "bg-primary/15 text-primary",
  in_progress: "bg-secondary/15 text-secondary",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-destructive/15 text-destructive",
};

const OrderDelegationPanel = ({ orgId }: { orgId: string }) => {
  const { delegations, loading, delegateOrder, updateDelegation } = useOrderDelegations(orgId);
  const { contracts } = useTailorContracts(orgId);
  const { orders } = useOrders(orgId);
  const { toast } = useToast();
  const [showDelegate, setShowDelegate] = useState(false);
  const [form, setForm] = useState({
    order_id: "",
    tailor_id: "",
    contract_id: "",
    priority: "normal",
    deadline: "",
    admin_notes: "",
  });

  const activeContracts = contracts.filter(c => c.status === "active");
  const unassignedOrders = orders.filter(o => !o.assigned_tailor_id && o.status !== "cancelled" && o.status !== "delivered");

  const handleDelegate = async () => {
    if (!form.order_id || !form.tailor_id) { toast({ title: "Select order and tailor", variant: "destructive" }); return; }
    const { error } = await delegateOrder({
      order_id: form.order_id,
      tailor_id: form.tailor_id,
      contract_id: form.contract_id || undefined,
      priority: form.priority,
      deadline: form.deadline || undefined,
      admin_notes: form.admin_notes || undefined,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Order delegated to tailor" });
      setShowDelegate(false);
      setForm({ order_id: "", tailor_id: "", contract_id: "", priority: "normal", deadline: "", admin_notes: "" });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "accepted") updates.accepted_at = new Date().toISOString();
    if (status === "in_progress") updates.started_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    await updateDelegation(id, updates);
    toast({ title: `Status updated to ${status}` });
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Delegations", value: delegations.length },
          { label: "In Progress", value: delegations.filter(d => d.status === "in_progress").length },
          { label: "Completed", value: delegations.filter(d => d.status === "completed").length },
          { label: "Unassigned Orders", value: unassignedOrders.length },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-heading font-bold text-xl">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Dialog open={showDelegate} onOpenChange={setShowDelegate}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Delegate Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Delegate Order to Tailor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Order</Label>
                <Select value={form.order_id} onValueChange={v => setForm({ ...form, order_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                  <SelectContent>
                    {unassignedOrders.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.order_number} - {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contract (Tailor)</Label>
                <Select value={form.contract_id} onValueChange={v => {
                  const contract = activeContracts.find(c => c.id === v);
                  setForm({ ...form, contract_id: v, tailor_id: contract?.tailor_id || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                  <SelectContent>
                    {activeContracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_number} - {c.tailor_profile?.display_name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.admin_notes} onChange={e => setForm({ ...form, admin_notes: e.target.value })} placeholder="Instructions for tailor..." />
              </div>
              <Button onClick={handleDelegate} className="w-full">Delegate Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delegation List */}
      {delegations.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No order delegations yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {delegations.map(d => {
            const order = orders.find(o => o.id === d.order_id);
            return (
              <Card key={d.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{order?.order_number || "—"}</span>
                        <ArrowRight size={14} className="text-muted-foreground" />
                        <span className="font-medium text-sm">{d.tailor_profile?.display_name || "Unknown"}</span>
                        <Badge className={delegationStatusColors[d.status] || "bg-muted"}>{d.status}</Badge>
                        {d.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                        {d.priority === "high" && <Badge className="bg-accent/15 text-accent-foreground">High</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{order?.title || "Order"}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {d.deadline && <span className="flex items-center gap-1"><Clock size={10} /> Due: {new Date(d.deadline).toLocaleDateString()}</span>}
                        {d.quality_rating && <span className="flex items-center gap-1"><Star size={10} /> {d.quality_rating}/5</span>}
                        <span>Delegated: {new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                      {d.admin_notes && <p className="text-xs text-muted-foreground mt-1">📝 {d.admin_notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      {d.status === "assigned" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(d.id, "accepted")}>Accept</Button>
                      )}
                      {d.status === "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(d.id, "in_progress")}>Start</Button>
                      )}
                      {d.status === "in_progress" && (
                        <Button size="sm" onClick={() => handleStatusUpdate(d.id, "completed")}>Complete</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderDelegationPanel;
