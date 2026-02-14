import { useMessageLogs } from "@/hooks/useMessageLogs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Phone, MessageSquare, Bell, Clock } from "lucide-react";

const channelIcons = {
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

const MessageLogViewer = ({ orgId }: { orgId: string }) => {
  const { data: logs, isLoading } = useMessageLogs(orgId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-12 text-center">
        <Mail size={40} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="font-heading font-semibold text-lg mb-2">No messages sent yet</h3>
        <p className="text-sm text-muted-foreground">
          Once you enable communication channels and trigger events, message logs will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-heading font-semibold text-lg">Message Log</h3>
        <p className="text-xs text-muted-foreground mt-1">Recent notifications sent across all channels</p>
      </div>
      <ScrollArea className="max-h-[500px]">
        <div className="divide-y divide-border">
          {logs.map((log) => {
            const Icon = channelIcons[log.channel] || Mail;
            return (
              <div key={log.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${channelColors[log.channel] || "bg-muted text-muted-foreground"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.subject || log.event_type.replace(/_/g, " ")}</p>
                      {log.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.body}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground capitalize">{log.recipient_type}</span>
                        {log.recipient_contact && (
                          <span className="text-[10px] text-muted-foreground">{log.recipient_contact}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariant[log.status] || "outline"} className="text-[10px] shrink-0">
                    {log.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageLogViewer;
