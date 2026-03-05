import { useState } from "react";
import { useTailorContracts, useContractPayments } from "@/hooks/useTailorContracts";
import { useOrgMembers, type AppRole } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Ban, CheckCircle, DollarSign, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  paused: "bg-accent/15 text-accent-foreground",
  terminated: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

const ContractManagementPanel = ({ orgId, role }: { orgId: string; role: AppRole | null }) => {
  const { contracts, loading, createContract, updateContract, terminateContract, activateContract } = useTailorContracts(orgId);
  const { payments } = useContractPayments(orgId);
  const { members } = useOrgMembers(orgId);
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showTerminate, setShowTerminate] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [filter, setFilter] = useState("all");

  // Form state
  const [form, setForm] = useState({
    tailor_id: "",
    contract_type: "per_order",
    payment_terms: "per_completion",
    tailor_rate_type: "percentage",
    tailor_rate_value: 70,
    agency_fee_percent: 10,
    max_concurrent_orders: 5,
    auto_renew: false,
    notes: "",
    end_date: "",
  });

  const tailors = members?.filter(m => m.role === "tailor") || [];
  const isAdmin = role === "org_admin" || role === "super_admin";

  const handleCreate = async () => {
    if (!form.tailor_id) { toast({ title: "Select a tailor", variant: "destructive" }); return; }
    const { error } = await createContract({
      ...form,
      end_date: form.end_date || undefined,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Contract created" });
      setShowCreate(false);
      setForm({ tailor_id: "", contract_type: "per_order", payment_terms: "per_completion", tailor_rate_type: "percentage", tailor_rate_value: 70, agency_fee_percent: 10, max_concurrent_orders: 5, auto_renew: false, notes: "", end_date: "" });
    }
  };

  const handleTerminate = async () => {
    if (!showTerminate || !terminationReason.trim()) return;
    const { error } = await terminateContract(showTerminate, terminationReason);
    if (!error) { toast({ title: "Contract terminated" }); setShowTerminate(null); setTerminationReason(""); }
  };

  const filtered = filter === "all" ? contracts : contracts.filter(c => c.status === filter);

  // Summary stats
  const active = contracts.filter(c => c.status === "active").length;
  const totalPayouts = payments.reduce((s, p) => s + p.tailor_payout_amount, 0);
  const totalFees = payments.reduce((s, p) => s + p.agency_fee_amount, 0);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Contracts", value: contracts.length, icon: FileText, color: "text-primary" },
          { label: "Active", value: active, icon: CheckCircle, color: "text-green-600" },
          { label: "Total Payouts", value: `₦${totalPayouts.toLocaleString()}`, icon: DollarSign, color: "text-secondary" },
          { label: "Agency Fees Earned", value: `₦${totalFees.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={16} className={s.color} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="font-heading font-bold text-xl">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-1" /> New Contract</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Subcontract Agreement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tailor</Label>
                  <Select value={form.tailor_id} onValueChange={v => setForm({ ...form, tailor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tailor" /></SelectTrigger>
                    <SelectContent>
                      {tailors.map(t => (
                        <SelectItem key={t.user_id} value={t.user_id}>{t.profile?.display_name || t.user_id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contract Type</Label>
                    <Select value={form.contract_type} onValueChange={v => setForm({ ...form, contract_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_order">Per Order</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="fixed_term">Fixed Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Select value={form.payment_terms} onValueChange={v => setForm({ ...form, payment_terms: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_completion">Per Completion</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Rate Type</Label>
                    <Select value={form.tailor_rate_type} onValueChange={v => setForm({ ...form, tailor_rate_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tailor Rate {form.tailor_rate_type === "percentage" ? "(%)" : ""}</Label>
                    <Input type="number" value={form.tailor_rate_value} onChange={e => setForm({ ...form, tailor_rate_value: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Agency Fee (%)</Label>
                    <Input type="number" value={form.agency_fee_percent} onChange={e => setForm({ ...form, agency_fee_percent: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Max Concurrent Orders</Label>
                    <Input type="number" value={form.max_concurrent_orders} onChange={e => setForm({ ...form, max_concurrent_orders: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>End Date (optional)</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Contract terms, special conditions..." />
                </div>
                <div className="bg-muted p-3 rounded-lg text-xs space-y-1">
                  <p className="font-medium">Fee Breakdown (per ₦10,000 order):</p>
                  <p>• Customer pays: ₦10,000</p>
                  <p>• Tailor receives: ₦{form.tailor_rate_type === "percentage" ? (10000 * form.tailor_rate_value / 100).toLocaleString() : form.tailor_rate_value.toLocaleString()}</p>
                  <p>• FSA Agency Fee: ₦{(10000 * form.agency_fee_percent / 100).toLocaleString()}</p>
                  <p>• Org retains: ₦{(10000 - (form.tailor_rate_type === "percentage" ? 10000 * form.tailor_rate_value / 100 : form.tailor_rate_value) - 10000 * form.agency_fee_percent / 100).toLocaleString()}</p>
                </div>
                <Button onClick={handleCreate} className="w-full">Create Contract</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Contract List */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No contracts found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{c.contract_number}</span>
                      <Badge className={statusColors[c.status] || "bg-muted text-muted-foreground"}>{c.status}</Badge>
                    </div>
                    <p className="text-sm">Tailor: <span className="font-medium">{c.tailor_profile?.display_name || "Unknown"}</span></p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Rate: {c.tailor_rate_value}{c.tailor_rate_type === "percentage" ? "%" : " fixed"}</span>
                      <span>Agency Fee: {c.agency_fee_percent}%</span>
                      <span>Terms: {c.payment_terms.replace("_", " ")}</span>
                      <span>Max Orders: {c.max_concurrent_orders || "∞"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.start_date).toLocaleDateString()} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "Ongoing"}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {c.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => activateContract(c.id)}>
                          <CheckCircle size={14} className="mr-1" /> Activate
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="destructive" onClick={() => setShowTerminate(c.id)}>
                          <Ban size={14} className="mr-1" /> Terminate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {c.termination_reason && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle size={12} /> {c.termination_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Terminate Dialog */}
      <Dialog open={!!showTerminate} onOpenChange={() => { setShowTerminate(null); setTerminationReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Terminate Contract</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This action will end the subcontract agreement. The tailor will be notified.</p>
            <div>
              <Label>Reason for Termination</Label>
              <Textarea value={terminationReason} onChange={e => setTerminationReason(e.target.value)} placeholder="Provide reason..." />
            </div>
            <Button variant="destructive" onClick={handleTerminate} disabled={!terminationReason.trim()} className="w-full">Confirm Termination</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractManagementPanel;
