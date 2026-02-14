import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, StickyNote, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatPanelProps {
  bookingId: string;
  userId: string;
  userName: string;
  onNotesChange?: (notes: string) => void;
  initialNotes?: string;
}

const ChatPanel = ({ bookingId, userId, userName, onNotesChange, initialNotes }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState(initialNotes || "");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatRoom = `chat-${bookingId}`;

  useEffect(() => {
    const channel = supabase.channel(chatRoom, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        if (payload.senderId === userId) return;
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            sender: payload.senderName,
            text: payload.text,
            timestamp: new Date(payload.timestamp),
            isOwn: false,
          },
        ]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [bookingId, userId, chatRoom]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: `${Date.now()}`,
      sender: userName,
      text: input.trim(),
      timestamp: new Date(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, msg]);

    supabase.channel(chatRoom).send({
      type: "broadcast",
      event: "chat-message",
      payload: {
        senderId: userId,
        senderName: userName,
        text: input.trim(),
        timestamp: new Date().toISOString(),
      },
    });

    setInput("");
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onNotesChange?.(value);
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="chat" className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-0">
          <TabsList className="w-full grid grid-cols-2 h-8">
            <TabsTrigger value="chat" className="text-xs gap-1">
              <MessageSquare size={12} /> Chat
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1">
              <StickyNote size={12} /> Notes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No messages yet. Start the conversation.
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] text-muted-foreground mb-0.5">
                    {msg.sender} · {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div
                    className={`px-3 py-2 rounded-xl text-xs max-w-[85%] ${
                      msg.isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="h-9 text-xs"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={!input.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 m-0 p-4 overflow-hidden">
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Session notes — measurements taken, fabric discussed, special requests..."
            className="h-full min-h-[200px] text-xs resize-none"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatPanel;
