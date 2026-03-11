import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, Phone, Wifi, Signal, Globe, Shield, Activity,
  TrendingUp, AlertTriangle, CheckCircle2, Loader2, BarChart3,
  Send, ArrowDownToLine, Settings, Coins, Edit2, Save, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const channelIcons: Record<string, typeof Phone> = {
  whatsapp: MessageSquare,
  sms: Signal,
  voip: Phone,
};

const providerBadges: Record<string, { label: string; color: string }> = {
  whatchimp: { label: "WhatChimp", color: "bg-green-500/10 text-green-600" },
  termii: { label: "Termii", color: "bg-emerald-500/10 text-emerald-600" },
  twilio: { label: "Twilio", color: "bg-red-500/10 text-red-600" },
};

interface RoutingConfig {
  id: string;
  channel: string;
  provider: string;
  phone_number_id: string | null;
  notes: string | null;
  is_active: boolean;
}

interface TokenRate {
  id: string;
  channel: string;
  provider: string | null;
  tokens_per_unit: number;
  unit_label: string;
  description: string | null;
  is_active: boolean;
}

const CommsOversightPanel = () => {
  const qc = useQueryClient();

  const { data: routing, isLoading: routingLoading } = useQuery({
    queryKey: ["provider-routing"],
    queryFn: async () => {
      const { data } = await supabase.from("provider_routing_config").select("*").order("channel");
      return (data || []) as RoutingConfig[];
    },
  });

  const { data: tokenRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["comms-token-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("comms_token_rates").select("*").order("channel");
      return (data || []) as TokenRate[];
    },
  });

  const { data: phoneNumbers } = useQuery({
    queryKey: ["platform-phone-numbers"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_phone_numbers").select("*").order("number_label");
      return data || [];
    },
  });

  const { data: providerStatus } = useQuery({
    queryKey: ["comms-provider-status"],
    queryFn: async () => {
      const { data } = await supabase.from("comms_provider_status").select("*");
      return data || [];
    },
  });

  const { data: usageStats } = useQuery({
    queryKey: ["comms-usage-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("comms_token_usage")
        .select("channel, tokens_consumed")
        .order("created_at", { ascending: false })
        .limit(500);
      const stats: Record<string, number> = {};
      (data || []).forEach((u: any) => {
        stats[u.channel] = (stats[u.channel] || 0) + Number(u.tokens_consumed);
      });
      return stats;
    },
  });

  const updateRouting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoutingConfig> & { id: string }) => {
      await supabase.from("provider_routing_config").update(updates as any).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-routing"] });
      toast({ title: "Routing updated" });
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ id, tokens_per_unit }: { id: string; tokens_per_unit: number }) => {
      await supabase.from("comms_token_rates").update({ tokens_per_unit } as any).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comms-token-rates"] });
      toast({ title: "Token rate updated" });
    },
  });

  const isLoading = routingLoading || ratesLoading;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Shield size={24} /> Communications Oversight
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Full platform oversight of all communication channels, provider routing, and token billing.
        </p>
      </div>

      <Tabs defaultValue="routing">
        <TabsList className="mb-4">
          <TabsTrigger value="routing" className="gap-2"><Settings size={14} /> Provider Routing</TabsTrigger>
          <TabsTrigger value="rates" className="gap-2"><Coins size={14} /> Token Rates</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Activity size={14} /> Health Status</TabsTrigger>
          <TabsTrigger value="usage" className="gap-2"><BarChart3 size={14} /> Usage Overview</TabsTrigger>
        </TabsList>

        {/* Provider Routing */}
        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings size={18} /> Channel → Provider Configuration
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Map each communication channel to its provider and assigned phone number.
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {(routing || []).map((r) => {
                    const Icon = channelIcons[r.channel] || Globe;
                    const badge = providerBadges[r.provider] || { label: r.provider, color: "bg-muted text-muted-foreground" };
                    const linkedNumber = (phoneNumbers || []).find((n: any) => n.id === r.phone_number_id);
                    return (
                      <div key={r.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon size={20} className="text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm capitalize">{r.channel}</h4>
                              <p className="text-xs text-muted-foreground">{r.notes || "No notes"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>
                            <Switch
                              checked={r.is_active}
                              onCheckedChange={v => updateRouting.mutate({ id: r.id, is_active: v })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Provider</Label>
                            <Select
                              value={r.provider}
                              onValueChange={v => updateRouting.mutate({ id: r.id, provider: v })}
                            >
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="whatchimp">WhatChimp</SelectItem>
                                <SelectItem value="termii">Termii</SelectItem>
                                <SelectItem value="twilio">Twilio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Linked Number</Label>
                            <Select
                              value={r.phone_number_id || "none"}
                              onValueChange={v => updateRouting.mutate({ id: r.id, phone_number_id: v === "none" ? null : v } as any)}
                            >
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select number" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No number linked</SelectItem>
                                {(phoneNumbers || []).map((n: any) => (
                                  <SelectItem key={n.id} value={n.id}>
                                    {n.number_label} ({n.phone_number})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {linkedNumber && (
                          <p className="text-xs text-muted-foreground mt-2">
                            📞 {(linkedNumber as any).phone_number} — {(linkedNumber as any).number_label}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Token Rates */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Coins size={18} /> Tiered Token Rates
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure how many tokens each communication channel consumes per unit.
              </p>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {(tokenRates || []).map((rate) => (
                    <RateRow key={rate.id} rate={rate} onSave={(id, val) => updateRate.mutate({ id, tokens_per_unit: val })} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Status */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity size={18} /> Provider Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["termii", "twilio", "whatchimp"].map((provider) => {
                  const status = (providerStatus || []).find((s: any) => s.provider === provider);
                  const badge = providerBadges[provider] || { label: provider, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={provider} className="flex items-center justify-between p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>
                        <div>
                          <p className="text-sm font-medium capitalize">{provider}</p>
                          {status && (
                            <p className="text-xs text-muted-foreground">
                              Latency: {(status as any).latency_ms || "—"}ms
                              {(status as any).balance_amount != null && (
                                <> · Balance: {(status as any).balance_currency} {(status as any).balance_amount}</>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status ? (
                          <Badge variant={(status as any).status === "active" ? "default" : "destructive"} className="text-[10px]">
                            {(status as any).status === "active" ? "✓ Connected" : "⚠ " + (status as any).status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Not Configured</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Overview */}
        <TabsContent value="usage">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { channel: "sms", icon: Signal, label: "SMS Tokens", color: "text-emerald-600" },
              { channel: "whatsapp", icon: MessageSquare, label: "WhatsApp Tokens", color: "text-green-600" },
              { channel: "voip", icon: Phone, label: "VoIP Tokens", color: "text-red-600" },
              { channel: "video_upload", icon: Activity, label: "Video Tokens", color: "text-purple-600" },
            ].map(({ channel, icon: Icon, label, color }) => (
              <Card key={channel}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon size={18} className={color} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{usageStats?.[channel]?.toFixed(0) || 0}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

// Editable rate row
const RateRow = ({ rate, onSave }: { rate: TokenRate; onSave: (id: string, val: number) => void }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(rate.tokens_per_unit));

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Coins size={14} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium capitalize">{rate.channel.replace("_", " ")} {rate.provider ? `(${rate.provider})` : ""}</p>
          <p className="text-xs text-muted-foreground">{rate.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              type="number"
              value={val}
              onChange={e => setVal(e.target.value)}
              className="w-20 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">/{rate.unit_label}</span>
            <Button size="icon" className="h-7 w-7" onClick={() => { onSave(rate.id, parseFloat(val)); setEditing(false); }}>
              <Save size={12} />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
              <X size={12} />
            </Button>
          </>
        ) : (
          <>
            <Badge variant="outline" className="font-mono text-sm">
              {rate.tokens_per_unit} tokens/{rate.unit_label}
            </Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Edit2 size={12} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CommsOversightPanel;
