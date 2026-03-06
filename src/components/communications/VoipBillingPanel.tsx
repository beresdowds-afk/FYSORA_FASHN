import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone, Wallet, Clock, TrendingDown, FileText, Archive,
  Plus, RefreshCw, DollarSign, PhoneCall, Video, Users,
  Star, Download, Search
} from "lucide-react";
import { useCallBilling } from "@/hooks/useCallBilling";
import { useToast } from "@/hooks/use-toast";

interface VoipBillingPanelProps {
  orgId: string;
  role: string | null;
}

const callTypeIcons: Record<string, any> = { voip: PhoneCall, video: Video, conference: Users };
const statusColors: Record<string, string> = {
  charged: "text-green-500", failed: "text-destructive", pending: "text-muted-foreground", refunded: "text-blue-500",
};

const VoipBillingPanel = ({ orgId, role }: VoipBillingPanelProps) => {
  const {
    billingRecords, meetingDocs, archives,
    createMeetingDoc, archiveMeetingDoc,
    totalCreditsCharged, totalCallMinutes,
  } = useCallBilling(orgId);
  const { toast } = useToast();
  const isAdmin = role === "org_admin" || role === "super_admin";

  const [docOpen, setDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", doc_type: "summary", content: "", tags: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreateDoc = async () => {
    if (!docForm.title || !docForm.content) return;
    await createMeetingDoc.mutateAsync({
      title: docForm.title,
      doc_type: docForm.doc_type,
      content: docForm.content,
      tags: docForm.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    toast({ title: "Meeting document created" });
    setDocForm({ title: "", doc_type: "summary", content: "", tags: "" });
    setDocOpen(false);
  };

  const filteredArchives = (archives.data || []).filter(a =>
    !searchTerm || a.call_type.includes(searchTerm.toLowerCase()) || a.caller_type.includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Credits Charged", value: totalCreditsCharged.toFixed(2), color: "text-primary" },
          { icon: Clock, label: "Total Minutes", value: String(totalCallMinutes), color: "text-secondary" },
          { icon: FileText, label: "Meeting Docs", value: String(meetingDocs.data?.length || 0), color: "text-accent" },
          { icon: Archive, label: "Archived Calls", value: String(archives.data?.length || 0), color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={16} className={s.color} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="font-heading font-bold text-2xl">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="billing">
        <TabsList>
          <TabsTrigger value="billing" className="gap-1.5"><Wallet size={14} /> Billing</TabsTrigger>
          <TabsTrigger value="meeting-docs" className="gap-1.5"><FileText size={14} /> Meeting Docs</TabsTrigger>
          <TabsTrigger value="archives" className="gap-1.5"><Archive size={14} /> Archives</TabsTrigger>
        </TabsList>

        {/* Billing Records */}
        <TabsContent value="billing">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Call Billing Records</h3>
              <Button variant="ghost" size="sm" onClick={() => billingRecords.refetch()}>
                <RefreshCw size={14} />
              </Button>
            </div>
            {billingRecords.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (billingRecords.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No call billing records yet.</p>
            ) : (
              <div className="space-y-2">
                {(billingRecords.data || []).map(rec => {
                  const Icon = callTypeIcons[rec.call_type] || PhoneCall;
                  const mins = Math.ceil(rec.duration_seconds / 60);
                  return (
                    <div key={rec.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {rec.call_type.toUpperCase()} Call · {mins} min{mins > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rec.caller_type} · {new Date(rec.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <Badge variant={rec.billing_status === "charged" ? "default" : "secondary"}>
                          {rec.billing_status}
                        </Badge>
                        <span className={`text-sm font-semibold ${statusColors[rec.billing_status] || ""}`}>
                          {rec.total_credits_charged.toFixed(2)} cr
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-4">
              Rate: $0.50/min for VoIP · $1.00/min for Video · $1.50/min for Conference
            </p>
          </Card>
        </TabsContent>

        {/* Meeting Documents */}
        <TabsContent value="meeting-docs">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Meeting Documentation</h3>
              <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus size={14} className="mr-1" /> New Document</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Meeting Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Input placeholder="Document title" value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))} />
                    <Select value={docForm.doc_type} onValueChange={v => setDocForm(p => ({ ...p, doc_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transcript">Transcript</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="action_items">Action Items</SelectItem>
                        <SelectItem value="notes">Notes</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="Content..." rows={6} value={docForm.content} onChange={e => setDocForm(p => ({ ...p, content: e.target.value }))} />
                    <Input placeholder="Tags (comma-separated)" value={docForm.tags} onChange={e => setDocForm(p => ({ ...p, tags: e.target.value }))} />
                    <Button className="w-full" onClick={handleCreateDoc} disabled={createMeetingDoc.isPending}>
                      Save Document
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {meetingDocs.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (meetingDocs.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No meeting documents yet.</p>
            ) : (
              <div className="space-y-3">
                {(meetingDocs.data || []).map(doc => (
                  <div key={doc.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{doc.title}</h4>
                          <Badge variant="outline" className="text-[10px]">{doc.doc_type}</Badge>
                          {doc.ai_generated && <Badge variant="secondary" className="text-[10px]">AI</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{doc.content}</p>
                        <div className="flex gap-1 mt-2">
                          {(doc.tags || []).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5">{tag}</Badge>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(doc.created_at).toLocaleString()}</p>
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          archiveMeetingDoc.mutate(doc.id);
                          toast({ title: "Document archived" });
                        }}>
                          <Archive size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Archives */}
        <TabsContent value="archives">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Platform Call Archives</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 w-48"
                    placeholder="Filter..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => archives.refetch()}>
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            {archives.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredArchives.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No archived calls yet.</p>
            ) : (
              <div className="space-y-2">
                {filteredArchives.map(arc => {
                  const Icon = callTypeIcons[arc.call_type] || PhoneCall;
                  const mins = Math.ceil((arc.duration_seconds || 0) / 60);
                  return (
                    <div key={arc.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {arc.direction} · {arc.call_type} · {mins} min{mins > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {arc.caller_type} · {new Date(arc.archived_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {arc.quality_score && (
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-primary" />
                            <span className="text-xs">{arc.quality_score}/5</span>
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground">{arc.credits_charged?.toFixed(2)} cr</span>
                        {arc.recording_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={arc.recording_url} target="_blank" rel="noopener noreferrer">
                              <Download size={14} />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VoipBillingPanel;
