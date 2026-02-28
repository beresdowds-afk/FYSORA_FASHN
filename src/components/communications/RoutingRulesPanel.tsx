import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Route,
  Clock,
  MessageSquare,
  Zap,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface RoutingRulesPanelProps {
  orgId: string;
}

interface RoutingRule {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  condition_type: string;
  action_type: string;
  priority: number;
  enabled: boolean;
  keywords: string[] | null;
  time_type: string | null;
  start_time: string | null;
  end_time: string | null;
  channel: string | null;
  auto_response: string | null;
  forward_to: string | null;
  webhook_url: string | null;
}

const RULE_TEMPLATES = [
  {
    name: "Auto-Reply (All Messages)",
    condition_type: "always",
    action_type: "auto_reply",
    priority: 999,
    auto_response: "Thank you for your message. We will get back to you shortly.",
  },
  {
    name: "After Hours Auto-Reply",
    condition_type: "time_based",
    time_type: "range",
    start_time: "17:00",
    end_time: "09:00",
    action_type: "auto_reply",
    priority: 200,
    auto_response: "Our office is currently closed. We will respond during business hours (9 AM - 5 PM).",
  },
  {
    name: "Support Keyword Router",
    condition_type: "keyword",
    keywords: ["help", "support", "problem", "issue"],
    action_type: "auto_reply",
    priority: 50,
    auto_response: "We've received your support request. A team member will reach out shortly.",
  },
  {
    name: "New Customer Welcome",
    condition_type: "customer_history",
    history_type: "new_customer",
    action_type: "auto_reply",
    priority: 100,
    auto_response: "Welcome! Thank you for reaching out. How can we help you today?",
  },
];

const conditionLabels: Record<string, string> = {
  always: "Always",
  keyword: "Keyword Match",
  time_based: "Time-Based",
  channel: "Channel",
  customer_history: "Customer History",
};

const actionLabels: Record<string, string> = {
  dashboard: "Deliver to Dashboard",
  auto_reply: "Auto-Reply",
  forward: "Forward",
  webhook: "Trigger Webhook",
};

const RoutingRulesPanel = ({ orgId }: RoutingRulesPanelProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<RoutingRule>>({});
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["routing-rules", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_routing_rules")
        .select("*")
        .eq("org_id", orgId)
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as RoutingRule[];
    },
    enabled: !!orgId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<RoutingRule>) => {
      const { error } = await supabase.from("message_routing_rules").insert({
        org_id: orgId,
        name: rule.name || "New Rule",
        condition_type: rule.condition_type || "always",
        action_type: rule.action_type || "dashboard",
        priority: rule.priority || 100,
        enabled: true,
        keywords: rule.keywords || [],
        time_type: rule.time_type || null,
        start_time: rule.start_time || null,
        end_time: rule.end_time || null,
        channel: rule.channel || null,
        auto_response: rule.auto_response || null,
        forward_to: rule.forward_to || null,
        webhook_url: rule.webhook_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule created");
      setDialogOpen(false);
      setEditingRule({});
      queryClient.invalidateQueries({ queryKey: ["routing-rules", orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("message_routing_rules")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routing-rules", orgId] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("message_routing_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      queryClient.invalidateQueries({ queryKey: ["routing-rules", orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const applyTemplate = (template: (typeof RULE_TEMPLATES)[0]) => {
    setEditingRule({
      ...template,
      keywords: template.keywords || [],
    } as any);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Route size={18} /> Routing Rules
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Configure how inbound messages are processed and routed
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus size={14} /> Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Routing Rule</DialogTitle>
              </DialogHeader>

              {/* Templates */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {RULE_TEMPLATES.map((t, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => applyTemplate(t)}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mt-2">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={editingRule.name || ""}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="e.g. After Hours Reply"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Condition</Label>
                    <Select
                      value={editingRule.condition_type || "always"}
                      onValueChange={(v) => setEditingRule({ ...editingRule, condition_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(conditionLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Action</Label>
                    <Select
                      value={editingRule.action_type || "dashboard"}
                      onValueChange={(v) => setEditingRule({ ...editingRule, action_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(actionLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editingRule.condition_type === "keyword" && (
                  <div>
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      value={(editingRule.keywords || []).join(", ")}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="help, support, order"
                    />
                  </div>
                )}

                {editingRule.condition_type === "time_based" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={editingRule.start_time || "17:00"}
                        onChange={(e) => setEditingRule({ ...editingRule, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={editingRule.end_time || "09:00"}
                        onChange={(e) => setEditingRule({ ...editingRule, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {editingRule.action_type === "auto_reply" && (
                  <div>
                    <Label>Auto-Reply Message</Label>
                    <Textarea
                      value={editingRule.auto_response || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, auto_response: e.target.value })}
                      placeholder="Thank you for your message..."
                      rows={3}
                    />
                  </div>
                )}

                {editingRule.action_type === "forward" && (
                  <div>
                    <Label>Forward To (Phone Number)</Label>
                    <Input
                      value={editingRule.forward_to || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, forward_to: e.target.value })}
                      placeholder="+234..."
                    />
                  </div>
                )}

                {editingRule.action_type === "webhook" && (
                  <div>
                    <Label>Webhook URL</Label>
                    <Input
                      value={editingRule.webhook_url || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, webhook_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div>
                  <Label>Priority (lower = higher priority)</Label>
                  <Input
                    type="number"
                    value={editingRule.priority || 100}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 100 })
                    }
                  />
                </div>

                <Button
                  onClick={() => createRule.mutate(editingRule)}
                  disabled={!editingRule.name || createRule.isPending}
                  className="w-full"
                >
                  {createRule.isPending ? (
                    <Loader2 size={14} className="animate-spin mr-2" />
                  ) : null}
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!rules || rules.length === 0 ? (
          <div className="p-12 text-center">
            <Zap size={40} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">No routing rules</h3>
            <p className="text-sm text-muted-foreground">
              Add rules to auto-reply, forward, or route inbound messages.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div key={rule.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => toggleRule.mutate({ id: rule.id, enabled: v })}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {conditionLabels[rule.condition_type] || rule.condition_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {actionLabels[rule.action_type] || rule.action_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Priority: {rule.priority}
                      </span>
                    </div>
                    {rule.auto_response && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate italic">
                        "{rule.auto_response}"
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRule.mutate(rule.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutingRulesPanel;
