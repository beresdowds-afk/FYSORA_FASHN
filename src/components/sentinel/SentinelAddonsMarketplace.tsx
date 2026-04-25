import { useSentinelMcpAddons, type SentinelAddon } from "@/hooks/useSentinelMcpAddons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck, Activity, Search, Globe2, Check } from "lucide-react";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  growth: Sparkles,
  security: ShieldCheck,
  reliability: Activity,
};

const KEY_ICON: Record<string, React.ElementType> = {
  seo_optimization: Search,
  domain_reputation: Globe2,
};

interface Props {
  orgId?: string;
  title?: string;
  showHeader?: boolean;
}

const SentinelAddonsMarketplace = ({ orgId, title = "Sentinel MCP Add-Ons", showHeader = true }: Props) => {
  const { addons, loading, subscribe, isSubscribed } = useSentinelMcpAddons(orgId);

  return (
    <section className="space-y-4">
      {showHeader && (
        <div>
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Sparkles size={22} className="text-primary" /> {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Premium services powered by Sentinel MCP — billed independently of your FYSORA subscription.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading add-ons…</div>
      ) : addons.length === 0 ? (
        <div className="text-sm text-muted-foreground">No add-ons available right now.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addons.map((addon: SentinelAddon) => {
            const Icon = KEY_ICON[addon.addon_key] ?? CATEGORY_ICON[addon.category] ?? Sparkles;
            const subscribed = isSubscribed(addon.id);
            return (
              <Card key={addon.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{addon.name}</h3>
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">{addon.category}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex-1">{addon.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-heading font-bold">${addon.monthly_price_usd.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                  {addon.per_request_price_usd ? (
                    <span className="text-[11px] text-muted-foreground ml-2">
                      + ${addon.per_request_price_usd.toFixed(2)}/request
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant={subscribed ? "outline" : "default"}
                  disabled={subscribed}
                  onClick={() => subscribe(addon)}
                >
                  {subscribed ? (<><Check size={14} className="mr-1" /> Subscribed</>) : "Subscribe"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SentinelAddonsMarketplace;
