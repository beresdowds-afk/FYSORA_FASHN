import { useCommsProviderStatus } from "@/hooks/useCommsArchitecture";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Wifi, WifiOff, AlertTriangle, Activity, DollarSign,
  BarChart3, Route, Phone, MessageSquare, Send
} from "lucide-react";

const statusConfig: Record<string, { icon: typeof Wifi; color: string; bg: string }> = {
  connected: { icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  disconnected: { icon: WifiOff, color: "text-destructive", bg: "bg-destructive/10" },
  degraded: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10" },
  unknown: { icon: Activity, color: "text-muted-foreground", bg: "bg-muted" },
};

const providerLabels: Record<string, { name: string; desc: string }> = {
  termii: { name: "Termii", desc: "SMS, OTP, Voice, Campaigns (Africa)" },
  twilio: { name: "Twilio", desc: "VoIP, WebRTC, Video, International" },
  whatchimp: { name: "WhatChimp", desc: "WhatsApp, Social Media Integration" },
  carrier: { name: "Nigerian Carrier", desc: "WhatsApp Business, Backup SMS" },
};

const BUSINESS_PROCESSES = [
  { process: "Order Confirmation", primary: "SMS", secondary: "WhatsApp", provider: "Termii", fallback: "Email", icon: Send },
  { process: "Delivery Updates", primary: "SMS", secondary: "Voice Call", provider: "Termii", fallback: "WhatsApp", icon: Send },
  { process: "Customer Support", primary: "WhatsApp", secondary: "Voice", provider: "WhatChimp/Twilio", fallback: "SMS", icon: MessageSquare },
  { process: "Marketing Broadcasts", primary: "SMS", secondary: "WhatsApp", provider: "Termii", fallback: "—", icon: Send },
  { process: "OTP Verification", primary: "SMS", secondary: "Voice OTP", provider: "Termii", fallback: "WhatsApp", icon: Phone },
  { process: "Designer Consultations", primary: "Video Call", secondary: "Voice", provider: "Twilio", fallback: "WhatsApp Video", icon: Phone },
  { process: "Payment Receipts", primary: "SMS", secondary: "WhatsApp", provider: "Termii", fallback: "Email", icon: DollarSign },
  { process: "Abandoned Cart", primary: "SMS", secondary: "WhatsApp", provider: "Termii", fallback: "—", icon: Send },
  { process: "Feedback Collection", primary: "WhatsApp", secondary: "SMS", provider: "WhatChimp", fallback: "—", icon: MessageSquare },
  { process: "Emergency Alerts", primary: "Voice + SMS", secondary: "WhatsApp", provider: "Both", fallback: "All Channels", icon: AlertTriangle },
];

const ROUTING_RULES = [
  { rule: "Message length < 160 chars", action: "→ SMS via Termii", color: "text-emerald-600" },
  { rule: "Media/image content needed", action: "→ WhatsApp via WhatChimp", color: "text-green-600" },
  { rule: "Urgent/priority messages", action: "→ Both SMS + WhatsApp", color: "text-amber-600" },
  { rule: "International recipients", action: "→ WhatsApp (free) or Twilio SMS", color: "text-blue-600" },
  { rule: "Bulk marketing campaigns", action: "→ Termii Bulk SMS", color: "text-primary" },
  { rule: "Voice/video calls", action: "→ Twilio VoIP / WebRTC", color: "text-red-600" },
  { rule: "Social media posting", action: "→ WhatChimp Social API", color: "text-green-600" },
  { rule: "African recipients (SMS/WhatsApp)", action: "→ Termii (cost-optimized)", color: "text-emerald-600" },
  { rule: "OTP verification (all regions)", action: "→ Termii with voice fallback", color: "text-primary" },
  { rule: "Carrier WhatsApp Business", action: "→ Nigerian Carrier Number", color: "text-blue-600" },
];

const CommsMonitoringPanel = () => {
  const { status, checkTermiiBalance } = useCommsProviderStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-lg">Communications Architecture Monitor</h3>
          <p className="text-xs text-muted-foreground mt-1">Real-time health, routing, and usage across all providers.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            checkTermiiBalance.mutate();
            status.refetch();
          }}
          disabled={checkTermiiBalance.isPending}
          className="gap-1.5"
        >
          <RefreshCw size={14} className={checkTermiiBalance.isPending ? "animate-spin" : ""} />
          Refresh All
        </Button>
      </div>

      <Tabs defaultValue="health">
        <TabsList className="flex-wrap">
          <TabsTrigger value="health" className="gap-1.5"><Activity size={14} /> Provider Health</TabsTrigger>
          <TabsTrigger value="routing" className="gap-1.5"><Route size={14} /> Channel Routing</TabsTrigger>
          <TabsTrigger value="processes" className="gap-1.5"><BarChart3 size={14} /> Business Processes</TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5"><DollarSign size={14} /> Cost Optimization</TabsTrigger>
        </TabsList>

        {/* Provider Health */}
        <TabsContent value="health">
          {status.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(status.data || []).map((provider: any) => {
                const cfg = statusConfig[provider.status] || statusConfig.unknown;
                const info = providerLabels[provider.provider] || { name: provider.provider, desc: "" };
                const Icon = cfg.icon;

                return (
                  <Card key={provider.id} className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${cfg.bg}`}>
                          <Icon size={18} className={cfg.color} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{info.name}</h4>
                          <p className="text-[11px] text-muted-foreground">{info.desc}</p>
                        </div>
                      </div>
                      <Badge
                        variant={provider.status === "connected" ? "default" : "secondary"}
                        className={`text-[10px] capitalize ${cfg.color}`}
                      >
                        {provider.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border">
                      {provider.latency_ms && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Latency</span>
                          <span className="font-medium">{provider.latency_ms}ms</span>
                        </div>
                      )}
                      {provider.balance_amount !== null && provider.balance_amount !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <DollarSign size={10} /> Balance
                          </span>
                          <span className={`font-semibold ${Number(provider.balance_amount) < 5000 ? "text-destructive" : "text-emerald-600"}`}>
                            {provider.balance_currency} {Number(provider.balance_amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {provider.last_checked_at && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Last Checked</span>
                          <span>{new Date(provider.last_checked_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Architecture Summary */}
          <Card className="p-5 mt-4">
            <h4 className="font-heading font-semibold text-sm mb-3">Architecture Advantages</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { title: "No Single Point of Failure", desc: "If Termii goes down, WhatsApp via carrier still works" },
                { title: "Cost Optimization", desc: "SMS for short alerts, WhatsApp for rich media, Voice for urgent" },
                { title: "Local Presence", desc: "Nigerian number builds trust with local customers" },
                { title: "Global Reach", desc: "Twilio enables international voice/video when needed" },
                { title: "WhatsApp Integration", desc: "Meet customers where they already chat" },
                { title: "Programmable", desc: "All channels feed into central business logic" },
                { title: "Scalable", desc: "Add more numbers as you grow to different regions" },
              ].map(a => (
                <div key={a.title} className="p-2.5 rounded-lg bg-muted/30">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-muted-foreground">{a.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Channel Routing */}
        <TabsContent value="routing">
          <Card className="p-5">
            <h4 className="font-heading font-semibold text-sm mb-3">Channel Routing Optimizer</h4>
            <p className="text-xs text-muted-foreground mb-4">Smart routing rules that determine the optimal channel and provider for each message.</p>
            <div className="space-y-2">
              {ROUTING_RULES.map(r => (
                <div key={r.rule} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{r.rule}</span>
                  <span className={`text-xs font-medium ${r.color}`}>{r.action}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Data Flow Scenarios */}
          <Card className="p-5 mt-4">
            <h4 className="font-heading font-semibold text-sm mb-3">Communication Flow Scenarios</h4>
            <div className="space-y-4">
              {[
                { title: "SMS Inquiry", flow: ["Customer SMS → Termii Number", "Termii API Webhook → FSA CRM", "Auto-response → Termii API → Customer"] },
                { title: "Voice Support", flow: ["Customer dials Nigerian Carrier", "Call Forwarding → Twilio Voice API", "IVR → Route to Agent → FSA Softphone"] },
                { title: "WhatsApp Chat", flow: ["Customer WhatsApp → WA Business Number", "WhatsApp Business API → WhatChimp", "WhatChimp → FSA Agent → Reply via WhatChimp"] },
              ].map(s => (
                <div key={s.title} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-semibold mb-2">{s.title}</p>
                  <div className="space-y-1">
                    {s.flow.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Business Processes */}
        <TabsContent value="processes">
          <Card className="p-5">
            <h4 className="font-heading font-semibold text-sm mb-3">Business Process Channel Mapping</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Each business process is mapped to primary, secondary, and fallback channels for maximum deliverability.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Process</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Primary</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Secondary</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Provider</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {BUSINESS_PROCESSES.map(bp => {
                    const Icon = bp.icon;
                    return (
                      <tr key={bp.process} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium flex items-center gap-1.5">
                          <Icon size={12} className="text-primary" /> {bp.process}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="default" className="text-[10px]">{bp.primary}</Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">{bp.secondary}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{bp.provider}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{bp.fallback}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Cost Optimization */}
        <TabsContent value="costs">
          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="font-heading font-semibold text-sm mb-3">Cost Management Layer</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-semibold mb-2">Channel Routing Optimizer</p>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <p>• Message length &lt; 160 chars → Use SMS (Termii) — cheapest for short text</p>
                    <p>• Media/image needed → Route to WhatsApp (Carrier) — free media support</p>
                    <p>• Urgent/priority → Use both channels simultaneously</p>
                    <p>• International customer → Route to WhatsApp (free for recipient)</p>
                    <p>• Bulk marketing → Use Termii bulk SMS (volume discount)</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-semibold mb-2">Usage Monitoring & Alerts</p>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <p>• Termii SMS balance &lt; ₦10,000 → Alert admin</p>
                    <p>• Carrier voice minutes &gt; 80% → Alert</p>
                    <p>• WhatsApp message volume &gt; 10K/month → Review plan</p>
                    <p>• Cost per customer interaction tracked in real-time</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-heading font-semibold text-sm mb-3">Rate Card</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Channel</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Provider</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Rate</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { channel: "SMS (Africa)", provider: "Termii", rate: "$0.02", unit: "per message" },
                      { channel: "SMS (International)", provider: "Twilio", rate: "$0.05", unit: "per message" },
                      { channel: "WhatsApp (Africa)", provider: "WhatChimp", rate: "$0.03", unit: "per message" },
                      { channel: "WhatsApp (Intl)", provider: "WhatChimp", rate: "$0.06", unit: "per message" },
                      { channel: "Email", provider: "Resend", rate: "$0.01", unit: "per message" },
                      { channel: "VoIP Call", provider: "Twilio", rate: "$0.50", unit: "per minute" },
                      { channel: "Video Call", provider: "Twilio", rate: "$1.00", unit: "per minute" },
                      { channel: "Conference", provider: "Twilio", rate: "$1.50", unit: "per minute" },
                    ].map(r => (
                      <tr key={r.channel} className="border-b border-border last:border-0">
                        <td className="py-2 px-3 font-medium">{r.channel}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.provider}</td>
                        <td className="py-2 px-3 font-semibold text-primary">{r.rate}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommsMonitoringPanel;
