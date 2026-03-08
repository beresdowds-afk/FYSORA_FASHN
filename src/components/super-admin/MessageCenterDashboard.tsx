import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail, Phone, MessageSquare, Bell, Search, Clock, Archive,
  TrendingUp, AlertTriangle, CheckCircle2, Loader2, BarChart3,
  Send, ArrowDownToLine, Filter,
} from "lucide-react";

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
  in_app: Bell,
};

const channelColors: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-600",
  sms: "bg-green-500/10 text-green-600",
  whatsapp: "bg-emerald-500/10 text-emerald-600",
  in_app: "bg-primary/10 text-primary",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  sent: "secondary",
  delivered: "default",
  failed: "destructive",
};

const directionColors: Record<string, string> = {
  inbound: "bg-amber-500/10 text-amber-600",
  outbound: "bg-sky-500/10 text-sky-600",
};

interface ArchiveRow {
  id: string;
  org_id: string | null;
  channel: string;
  direction: string;
  sender_type: string;
  sender_id: string | null;
  recipient_type: string;
  recipient_contact: string | null;
  event_type: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  error_message: string | null;
  provider: string | null;
  sent_at: string | null;
  created_at: string;
}

const MessageCenterDashboard = () => {
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"overview" | "archives">("overview");

  // Fetch archive stats
  const { data: archives, isLoading } = useQuery({
    queryKey: ["message-archives", channelFilter, directionFilter, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("message_archives")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (channelFilter !== "all") query = query.eq("channel", channelFilter);
      if (directionFilter !== "all") query = query.eq("direction", directionFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (searchQuery) {
        query = query.or(`recipient_contact.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ArchiveRow[];
    },
  });

  // Channel stats
  const channelStats = archives?.reduce((acc, msg) => {
    acc[msg.channel] = (acc[msg.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const directionStats = archives?.reduce((acc, msg) => {
    acc[msg.direction] = (acc[msg.direction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusStats = archives?.reduce((acc, msg) => {
    acc[msg.status] = (acc[msg.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalMessages = archives?.length || 0;
  const failedCount = statusStats["failed"] || 0;
  const sentCount = statusStats["sent"] || 0;
  const deliveredCount = statusStats["delivered"] || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
            <MessageSquare size={24} /> Message Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of all platform communications — SMS, Email, WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("overview")}
            className="gap-1"
          >
            <BarChart3 size={14} /> Overview
          </Button>
          <Button
            variant={viewMode === "archives" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("archives")}
            className="gap-1"
          >
            <Archive size={14} /> Archives
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMessages}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentCount + deliveredCount}</p>
                <p className="text-xs text-muted-foreground">Sent / Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ArrowDownToLine size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{directionStats["inbound"] || 0}</p>
                <p className="text-xs text-muted-foreground">Inbound</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      {viewMode === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp size={16} /> Channel Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["email", "sms", "whatsapp", "in_app"].map((ch) => {
                  const Icon = channelIcons[ch] || Mail;
                  const count = channelStats[ch] || 0;
                  const pct = totalMessages > 0 ? Math.round((count / totalMessages) * 100) : 0;
                  return (
                    <div key={ch} className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${channelColors[ch]}`}>
                        <Icon size={14} />
                      </div>
                      <span className="text-sm capitalize w-20">{ch === "in_app" ? "In-App" : ch.toUpperCase()}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter size={16} /> Provider Routing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">Termii</span>
                    <span className="text-xs text-muted-foreground">Nigeria & Africa</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    SMS & WhatsApp for NG, GH, KE, ZA, UG, TZ, RW, SN, CI, TG, BJ, CM
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">Twilio</span>
                    <span className="text-xs text-muted-foreground">International</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    SMS, WhatsApp & VoIP for all non-African numbers
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">Resend</span>
                    <span className="text-xs text-muted-foreground">Global</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All transactional & notification emails
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Archives View */}
      {viewMode === "archives" && (
        <div className="rounded-xl bg-card border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by contact, subject, or body..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                </SelectContent>
              </Select>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !archives || archives.length === 0 ? (
            <div className="p-12 text-center">
              <Archive size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-heading font-semibold text-lg mb-2">No archived messages</h3>
              <p className="text-sm text-muted-foreground">
                Messages will be auto-archived as they are sent and received across all channels.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y divide-border">
                {archives.map((msg) => {
                  const Icon = channelIcons[msg.channel] || Mail;
                  return (
                    <div key={msg.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${channelColors[msg.channel] || "bg-muted"}`}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">
                                {msg.subject || msg.event_type?.replace(/_/g, " ") || "Message"}
                              </p>
                              <Badge variant="outline" className={`text-[10px] shrink-0 ${directionColors[msg.direction]}`}>
                                {msg.direction === "inbound" ? "↓ IN" : "↑ OUT"}
                              </Badge>
                            </div>
                            {msg.body && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.body}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {msg.sender_type} → {msg.recipient_type}
                              </span>
                              {msg.recipient_contact && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {msg.recipient_contact}
                                </span>
                              )}
                              {msg.provider && (
                                <Badge variant="outline" className="text-[10px]">
                                  {msg.provider}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            {msg.error_message && (
                              <p className="text-[11px] text-destructive mt-1 truncate">
                                ⚠ {msg.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={statusVariant[msg.status] || "outline"} className="text-[10px] shrink-0">
                          {msg.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageCenterDashboard;
