import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send, Key, Users, Phone, Megaphone, BookOpen,
  Plus, Loader2, CheckCircle, XCircle, Search
} from "lucide-react";
import { useTermiiCampaigns, useTermiiPhonebooks, useTermiiOTP } from "@/hooks/useCommsArchitecture";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TermiiServicesPanelProps {
  orgId: string;
  role: string | null;
}

const TermiiServicesPanel = ({ orgId, role }: TermiiServicesPanelProps) => {
  const { toast } = useToast();
  const isAdmin = role === "org_admin" || role === "manager" || role === "super_admin";
  const { campaigns, createCampaign, sendCampaign } = useTermiiCampaigns(orgId);
  const { phonebooks, createPhonebook } = useTermiiPhonebooks(orgId);
  const { sendOTP, verifyOTP } = useTermiiOTP();

  // OTP test state
  const [otpPhone, setOtpPhone] = useState("");
  const [otpPinId, setOtpPinId] = useState("");
  const [otpPin, setOtpPin] = useState("");
  const [otpResult, setOtpResult] = useState<string | null>(null);

  // Campaign form
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    campaign_name: "", campaign_type: "sms", message_template: "", sender_id: "", phonebook_id: "",
  });

  // Phonebook form
  const [pbOpen, setPbOpen] = useState(false);
  const [pbForm, setPbForm] = useState({ phonebook_name: "", description: "" });

  // Balance check
  const [balance, setBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Sender ID
  const [senderIds, setSenderIds] = useState<any[]>([]);
  const [senderLoading, setSenderLoading] = useState(false);

  const checkBalance = async () => {
    setBalanceLoading(true);
    try {
      const { data } = await supabase.functions.invoke("termii-api", {
        body: { action: "get_balance" },
      });
      setBalance(data?.data);
    } catch (err) {
      toast({ title: "Failed to fetch balance", variant: "destructive" });
    }
    setBalanceLoading(false);
  };

  const fetchSenderIds = async () => {
    setSenderLoading(true);
    try {
      const { data } = await supabase.functions.invoke("termii-api", {
        body: { action: "list_sender_ids" },
      });
      setSenderIds(data?.data?.data || []);
    } catch {
      toast({ title: "Failed to fetch sender IDs", variant: "destructive" });
    }
    setSenderLoading(false);
  };

  const handleSendOTP = async () => {
    if (!otpPhone) return;
    try {
      const result = await sendOTP.mutateAsync({ to: otpPhone });
      setOtpPinId(result?.data?.pinId || result?.data?.pin_id || "");
      setOtpResult("OTP sent successfully");
      toast({ title: "OTP sent" });
    } catch (err: any) {
      setOtpResult(`Failed: ${err.message}`);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpPinId || !otpPin) return;
    try {
      const result = await verifyOTP.mutateAsync({ pin_id: otpPinId, pin: otpPin });
      setOtpResult(result?.data?.verified ? "✅ Verified!" : "❌ Invalid OTP");
    } catch (err: any) {
      setOtpResult(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={role === "super_admin" ? "otp" : "campaigns"}>
        <TabsList className="flex-wrap">
          {role === "super_admin" && (
            <TabsTrigger value="otp" className="gap-1.5"><Key size={14} /> OTP</TabsTrigger>
          )}
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone size={14} /> Campaigns</TabsTrigger>
          <TabsTrigger value="phonebooks" className="gap-1.5"><BookOpen size={14} /> Phonebooks</TabsTrigger>
          <TabsTrigger value="sender-ids" className="gap-1.5"><Send size={14} /> Sender IDs</TabsTrigger>
          {isAdmin && role === "super_admin" && (
            <TabsTrigger value="balance" className="gap-1.5"><Search size={14} /> Balance & Insights</TabsTrigger>
          )}
        </TabsList>

        {/* OTP Tab — super admin only */}
        {role === "super_admin" && (
          <TabsContent value="otp">
            <Card className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">OTP Service</h3>
              <p className="text-xs text-muted-foreground mb-4">Send and verify one-time passwords via Termii.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Send OTP</h4>
                  <div>
                    <Label className="text-xs">Phone Number</Label>
                    <Input placeholder="+234XXXXXXXXXX" value={otpPhone} onChange={e => setOtpPhone(e.target.value)} />
                  </div>
                  <Button onClick={handleSendOTP} disabled={sendOTP.isPending || !otpPhone} className="w-full">
                    {sendOTP.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                    Send OTP
                  </Button>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Verify OTP</h4>
                  <div>
                    <Label className="text-xs">Pin ID</Label>
                    <Input placeholder="From send response" value={otpPinId} onChange={e => setOtpPinId(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">OTP Code</Label>
                    <Input placeholder="Enter code" value={otpPin} onChange={e => setOtpPin(e.target.value)} />
                  </div>
                  <Button onClick={handleVerifyOTP} disabled={verifyOTP.isPending || !otpPinId || !otpPin} className="w-full" variant="outline">
                    {verifyOTP.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle size={14} className="mr-1" />}
                    Verify OTP
                  </Button>
                </div>
              </div>
              {otpResult && (
                <div className="mt-4 p-3 rounded-lg bg-muted text-sm font-medium">
                  {otpResult}
                </div>
              )}
            </Card>
          </TabsContent>
        )}

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">SMS/Voice Campaigns</h3>
              {isAdmin && (
                <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus size={14} className="mr-1" /> New Campaign</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2">
                      <Input placeholder="Campaign name" value={campaignForm.campaign_name} onChange={e => setCampaignForm(p => ({ ...p, campaign_name: e.target.value }))} />
                      <Select value={campaignForm.campaign_type} onValueChange={v => setCampaignForm(p => ({ ...p, campaign_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="voice">Voice</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea placeholder="Message template" value={campaignForm.message_template} onChange={e => setCampaignForm(p => ({ ...p, message_template: e.target.value }))} rows={4} />
                      <Input placeholder="Sender ID" value={campaignForm.sender_id} onChange={e => setCampaignForm(p => ({ ...p, sender_id: e.target.value }))} />
                      <Select value={campaignForm.phonebook_id} onValueChange={v => setCampaignForm(p => ({ ...p, phonebook_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select phonebook" /></SelectTrigger>
                        <SelectContent>
                          {(phonebooks.data || []).map((pb: any) => (
                            <SelectItem key={pb.id} value={pb.termii_phonebook_id || pb.id}>{pb.phonebook_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button className="w-full" onClick={async () => {
                        await createCampaign.mutateAsync(campaignForm);
                        setCampaignOpen(false);
                        setCampaignForm({ campaign_name: "", campaign_type: "sms", message_template: "", sender_id: "", phonebook_id: "" });
                      }} disabled={createCampaign.isPending}>
                        Create Campaign
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {campaigns.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (campaigns.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No campaigns yet.</p>
            ) : (
              <div className="space-y-3">
                {(campaigns.data || []).map((c: any) => (
                  <div key={c.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{c.campaign_name}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.campaign_type}</Badge>
                        <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-[10px] capitalize">{c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.message_template}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Recipients: {c.total_recipients} · Delivered: {c.delivered_count} · Failed: {c.failed_count}
                      </p>
                    </div>
                    {isAdmin && c.status === "draft" && (
                      <Button size="sm" variant="hero" onClick={() => sendCampaign.mutate(c.id)} disabled={sendCampaign.isPending}>
                        <Send size={14} className="mr-1" /> Send
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Phonebooks Tab */}
        <TabsContent value="phonebooks">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Contact Phonebooks</h3>
              {isAdmin && (
                <Dialog open={pbOpen} onOpenChange={setPbOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus size={14} className="mr-1" /> New Phonebook</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Phonebook</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2">
                      <Input placeholder="Phonebook name" value={pbForm.phonebook_name} onChange={e => setPbForm(p => ({ ...p, phonebook_name: e.target.value }))} />
                      <Textarea placeholder="Description" value={pbForm.description} onChange={e => setPbForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                      <Button className="w-full" onClick={async () => {
                        await createPhonebook.mutateAsync(pbForm);
                        setPbOpen(false);
                        setPbForm({ phonebook_name: "", description: "" });
                      }}>
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {phonebooks.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (phonebooks.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No phonebooks yet.</p>
            ) : (
              <div className="space-y-3">
                {(phonebooks.data || []).map((pb: any) => (
                  <div key={pb.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-primary" />
                      <h4 className="text-sm font-semibold">{pb.phonebook_name}</h4>
                      <Badge variant="outline" className="text-[10px]">{pb.contact_count} contacts</Badge>
                    </div>
                    {pb.description && <p className="text-xs text-muted-foreground mt-1">{pb.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Sender IDs */}
        <TabsContent value="sender-ids">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Sender IDs</h3>
              <Button size="sm" variant="outline" onClick={fetchSenderIds} disabled={senderLoading}>
                {senderLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="mr-1" />}
                Fetch from Termii
              </Button>
            </div>
            {senderIds.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Click "Fetch from Termii" to load your registered sender IDs.
              </p>
            ) : (
              <div className="space-y-2">
                {senderIds.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.sender_id}</p>
                      <p className="text-xs text-muted-foreground">{s.company || "N/A"}</p>
                    </div>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">
                      {s.status || "pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Balance & Insights — super admin only */}
        {isAdmin && role === "super_admin" && (
          <TabsContent value="balance">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg">Balance & Insights</h3>
                <Button size="sm" variant="outline" onClick={checkBalance} disabled={balanceLoading}>
                  {balanceLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} className="mr-1" />}
                  Check Balance
                </Button>
              </div>
              {balance ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold mt-1">{balance.balance || balance.available_balance || "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">Currency</p>
                    <p className="text-2xl font-bold mt-1">{balance.currency || "NGN"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">Wallet ID</p>
                    <p className="text-sm font-mono mt-2">{balance.user?.id || balance.wallet_id || "N/A"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">Click "Check Balance" to view your Termii account status.</p>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default TermiiServicesPanel;
