import { useCommsProviderStatus } from "@/hooks/useCommsArchitecture";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Activity, DollarSign } from "lucide-react";

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

const CommsMonitoringPanel = () => {
  const { status, checkTermiiBalance } = useCommsProviderStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-lg">Provider Health & Monitoring</h3>
          <p className="text-xs text-muted-foreground mt-1">Real-time status of all communication providers.</p>
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

      {/* Channel Routing Rules */}
      <Card className="p-5">
        <h4 className="font-heading font-semibold text-sm mb-3">Channel Routing Optimizer</h4>
        <div className="space-y-2 text-xs">
          {[
            { rule: "Message length < 160 chars", action: "→ SMS via Termii", color: "text-emerald-600" },
            { rule: "Media/image content needed", action: "→ WhatsApp via WhatChimp", color: "text-green-600" },
            { rule: "Urgent/priority messages", action: "→ Both SMS + WhatsApp", color: "text-amber-600" },
            { rule: "International recipients", action: "→ WhatsApp (free) or Twilio SMS", color: "text-blue-600" },
            { rule: "Bulk marketing campaigns", action: "→ Termii Bulk SMS", color: "text-primary" },
            { rule: "Voice/video calls", action: "→ Twilio VoIP / WebRTC", color: "text-red-600" },
            { rule: "Social media posting", action: "→ WhatChimp Social API", color: "text-green-600" },
          ].map(r => (
            <div key={r.rule} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-muted-foreground">{r.rule}</span>
              <span className={`font-medium ${r.color}`}>{r.action}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default CommsMonitoringPanel;
