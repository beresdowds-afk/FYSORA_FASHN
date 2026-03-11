import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, AlertTriangle, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AutoTopupPanelProps {
  walletId: string | undefined;
}

interface AutoTopupConfig {
  id: string;
  wallet_id: string;
  is_enabled: boolean;
  threshold_balance: number;
  topup_amount: number;
  max_monthly_topups: number;
  topups_this_month: number;
}

const AutoTopupPanel = ({ walletId }: AutoTopupPanelProps) => {
  const [config, setConfig] = useState<AutoTopupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!walletId) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("wallet_auto_topup")
        .select("*")
        .eq("wallet_id", walletId)
        .maybeSingle();
      setConfig(data as AutoTopupConfig | null);
      setLoading(false);
    };
    fetch();
  }, [walletId]);

  const save = async (updates: Partial<AutoTopupConfig>) => {
    if (!walletId) return;
    setSaving(true);
    if (config) {
      await supabase.from("wallet_auto_topup").update(updates as any).eq("id", config.id);
      setConfig(prev => prev ? { ...prev, ...updates } : prev);
    } else {
      const { data } = await supabase.from("wallet_auto_topup").insert({
        wallet_id: walletId,
        ...updates,
      } as any).select().single();
      setConfig(data as AutoTopupConfig);
    }
    setSaving(false);
    toast({ title: "Auto top-up settings saved" });
  };

  if (loading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const isEnabled = config?.is_enabled || false;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-primary" />
          <h4 className="font-heading font-semibold text-sm">Auto Top-Up</h4>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={v => save({ is_enabled: v })}
        />
      </div>

      {isEnabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Threshold (tokens)</Label>
              <Input
                type="number"
                defaultValue={config?.threshold_balance || 50}
                onBlur={e => save({ threshold_balance: parseFloat(e.target.value) })}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Top up when balance falls below this</p>
            </div>
            <div>
              <Label className="text-xs">Top-up Amount (tokens)</Label>
              <Input
                type="number"
                defaultValue={config?.topup_amount || 200}
                onBlur={e => save({ topup_amount: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Max Monthly Top-ups</Label>
              <Input
                type="number"
                defaultValue={config?.max_monthly_topups || 5}
                onBlur={e => save({ max_monthly_topups: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Used This Month</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-sm font-mono">
                  {config?.topups_this_month || 0} / {config?.max_monthly_topups || 5}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              When your balance drops below {config?.threshold_balance || 50} tokens,
              {config?.topup_amount || 200} tokens will be purchased automatically via your default payment method.
              Max {config?.max_monthly_topups || 5} auto top-ups per month.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AutoTopupPanel;
