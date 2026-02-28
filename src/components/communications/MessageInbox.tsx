import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Phone,
  Send,
  Search,
  ArrowLeft,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface MessageInboxProps {
  orgId: string;
}

interface Thread {
  id: string;
  org_id: string;
  customer_number: string;
  channel: string;
  message_count: number;
  status: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

interface InboundMessage {
  id: string;
  thread_id: string;
  from_number: string;
  to_number: string;
  body: string;
  channel: string;
  is_read: boolean;
  created_at: string;
  direction: "inbound";
}

interface OutboundMessage {
  id: string;
  thread_id: string;
  to_number: string;
  body: string;
  channel: string;
  status: string;
  is_auto_reply: boolean;
  created_at: string;
  direction: "outbound";
}

type Message = InboundMessage | OutboundMessage;

const channelIcons: Record<string, typeof Phone> = {
  sms: Phone,
  whatsapp: MessageSquare,
};

const channelColors: Record<string, string> = {
  sms: "bg-emerald-500/10 text-emerald-600",
  whatsapp: "bg-green-500/10 text-green-600",
};

const MessageInbox = ({ orgId }: MessageInboxProps) => {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  // Fetch threads
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["message-threads", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_threads")
        .select("*")
        .eq("org_id", orgId)
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Thread[];
    },
    enabled: !!orgId,
  });

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["thread-messages", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return [];

      const [inboundRes, outboundRes] = await Promise.all([
        supabase
          .from("inbound_messages")
          .select("*")
          .eq("thread_id", selectedThread.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("outbound_messages")
          .select("*")
          .eq("thread_id", selectedThread.id)
          .order("created_at", { ascending: true }),
      ]);

      if (inboundRes.error) throw inboundRes.error;
      if (outboundRes.error) throw outboundRes.error;

      const inbound: Message[] = (inboundRes.data || []).map((m: any) => ({
        ...m,
        direction: "inbound" as const,
      }));
      const outbound: Message[] = (outboundRes.data || []).map((m: any) => ({
        ...m,
        direction: "outbound" as const,
      }));

      return [...inbound, ...outbound].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    },
    enabled: !!selectedThread,
  });

  // Realtime subscription for new inbound messages
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inbound_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["message-threads", orgId] });
          if (selectedThread) {
            queryClient.invalidateQueries({ queryKey: ["thread-messages", selectedThread.id] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_threads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["message-threads", orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, selectedThread, queryClient]);

  // Send reply mutation
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedThread || !replyText.trim()) return;

      // Call the existing send-sms or send-whatsapp edge function
      const functionName =
        selectedThread.channel === "whatsapp" ? "send-whatsapp" : "send-sms";

      const payload: any = {
        to: selectedThread.customer_number,
        message: replyText.trim(),
        org_id: orgId,
        event_type: "manual_reply",
        recipient_type: "customer",
        recipient_id: "00000000-0000-0000-0000-000000000000",
      };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Also insert into outbound_messages for thread view
      await supabase.from("outbound_messages").insert({
        org_id: orgId,
        thread_id: selectedThread.id,
        to_number: selectedThread.customer_number,
        body: replyText.trim(),
        channel: selectedThread.channel,
        status: "sent",
        sent_at: new Date().toISOString(),
        twilio_sid: data?.sid || null,
      });

      return data;
    },
    onSuccess: () => {
      setReplyText("");
      toast.success("Reply sent successfully");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", selectedThread?.id] });
      queryClient.invalidateQueries({ queryKey: ["message-threads", orgId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to send: ${err.message}`);
    },
  });

  const filteredThreads = threads?.filter(
    (t) =>
      !searchQuery ||
      t.customer_number.includes(searchQuery) ||
      t.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Thread list view
  if (!selectedThread) {
    return (
      <div className="rounded-xl bg-card border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-lg">Message Inbox</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Inbound SMS & WhatsApp conversations
          </p>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by number or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {threadsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !filteredThreads || filteredThreads.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={40} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground">
              Inbound messages from customers will appear here once your Twilio webhook is configured.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y divide-border">
              {filteredThreads.map((thread) => {
                const Icon = channelIcons[thread.channel] || Phone;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className="w-full px-6 py-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          channelColors[thread.channel] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {thread.customer_number}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                            {thread.channel}
                          </Badge>
                        </div>
                        {thread.last_message_preview && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {thread.last_message_preview}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(thread.last_message_at).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {thread.message_count} msg{thread.message_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  // Thread detail view
  return (
    <div className="rounded-xl bg-card border border-border flex flex-col" style={{ height: "600px" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${
              channelColors[selectedThread.channel] || "bg-muted"
            }`}
          >
            <User size={14} />
          </div>
          <div>
            <p className="text-sm font-medium">{selectedThread.customer_number}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {selectedThread.channel} · {selectedThread.message_count} messages
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 ${
                    msg.direction === "outbound"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                    {msg.direction === "outbound" && "status" in msg && (
                      <span className="text-[10px] opacity-70 capitalize">{msg.status}</span>
                    )}
                    {msg.direction === "outbound" && "is_auto_reply" in msg && msg.is_auto_reply && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0">
                        Auto
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder={`Reply via ${selectedThread.channel.toUpperCase()}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="min-h-[40px] max-h-[100px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (replyText.trim()) sendReply.mutate();
              }
            }}
          />
          <Button
            size="icon"
            onClick={() => sendReply.mutate()}
            disabled={!replyText.trim() || sendReply.isPending}
          >
            {sendReply.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInbox;
