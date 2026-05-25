import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Lock, CheckCircle, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface SecretStatus {
  name: string;
  provider: string;
  description: string;
  category: "payments" | "messaging" | "logistics" | "ai" | "platform";
  configured: boolean;
}

const REQUIRED_SECRETS: Omit<SecretStatus, "configured">[] = [
  { name: "secret_key", provider: "paystack", description: "Paystack Secret Key for payment processing & DVA", category: "payments" },
  { name: "public_key", provider: "paystack", description: "Paystack Public Key for client-side checkout", category: "payments" },
  { name: "secret_key", provider: "stripe", description: "Stripe Secret Key for international payments", category: "payments" },
  { name: "publishable_key", provider: "stripe", description: "Stripe Publishable Key for client-side", category: "payments" },
  { name: "secret_key", provider: "flutterwave", description: "Flutterwave Secret Key for African payments", category: "payments" },
  { name: "webhook_secret", provider: "paystack", description: "Paystack Webhook Secret for signed payment events", category: "payments" },
  { name: "webhook_hash", provider: "flutterwave", description: "Flutterwave verif-hash for signed webhook events", category: "payments" },
  { name: "api_key", provider: "resend", description: "Resend API Key for transactional emails", category: "messaging" },
  { name: "api_key", provider: "termii", description: "Termii API Key for SMS & WhatsApp", category: "messaging" },
  { name: "account_sid", provider: "twilio", description: "Twilio Account SID for VoIP calls", category: "messaging" },
  { name: "auth_token", provider: "twilio", description: "Twilio Auth Token for call authentication", category: "messaging" },
  { name: "secret_key", provider: "terminal_africa", description: "Terminal Africa key for shipment tracking", category: "logistics" },
  { name: "api_key", provider: "exchange_rate", description: "Exchange Rate API for currency conversion", category: "platform" },
  { name: "api_key", provider: "fashn", description: "FASHN API for virtual try-on", category: "ai" },
  { name: "api_key", provider: "photoroom", description: "PhotoRoom API for image enhancement", category: "ai" },
];

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  payments: { label: "Payments", icon: "💳" },
  messaging: { label: "Messaging", icon: "📨" },
  logistics: { label: "Logistics", icon: "🚚" },
  ai: { label: "AI Services", icon: "🤖" },
  platform: { label: "Platform", icon: "⚙️" },
};

const SecretsManagementCard = () => {
  const [statuses, setStatuses] = useState<SecretStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_api_keys")
      .select("provider, key_name, is_active");

    const configuredSet = new Set(
      (data || [])
        .filter((k: any) => k.is_active)
        .map((k: any) => `${k.provider}::${k.key_name}`)
    );

    setStatuses(
      REQUIRED_SECRETS.map((s) => ({
        ...s,
        configured: configuredSet.has(`${s.provider}::${s.name}`),
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchStatuses(); }, []);

  const configuredCount = statuses.filter((s) => s.configured).length;
  const totalCount = statuses.length;
  const percentage = totalCount > 0 ? Math.round((configuredCount / totalCount) * 100) : 0;

  const grouped = statuses.reduce<Record<string, SecretStatus[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
              <Lock size={20} className="text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Secrets Management</CardTitle>
              <CardDescription className="text-xs">
                Deployment readiness — {configuredCount}/{totalCount} secrets configured
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={percentage === 100 ? "default" : "destructive"}
              className="text-xs"
            >
              {percentage}% Ready
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchStatuses}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, secrets]) => {
              const meta = CATEGORY_META[category] || { label: category, icon: "🔑" };
              const catConfigured = secrets.filter((s) => s.configured).length;
              return (
                <div key={category} className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2 flex items-center gap-2">
                    <span className="text-sm">{meta.icon}</span>
                    <span className="font-heading font-semibold text-sm">{meta.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {catConfigured}/{secrets.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {secrets.map((s) => (
                      <div
                        key={`${s.provider}-${s.name}`}
                        className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                      >
                        {s.configured ? (
                          <CheckCircle size={16} className="text-primary shrink-0" />
                        ) : (
                          <AlertTriangle size={16} className="text-destructive shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {s.provider.replace(/_/g, " ")} — {s.name.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                        </div>
                        <Badge
                          variant={s.configured ? "default" : "outline"}
                          className="text-xs shrink-0"
                        >
                          {s.configured ? "Active" : "Missing"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {percentage === 100 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <ShieldCheck size={18} className="text-primary" />
                <p className="text-xs text-primary font-medium">All platform secrets are configured. Deployment ready.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecretsManagementCard;
