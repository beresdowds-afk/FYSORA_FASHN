import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail, ShieldOff, Users, Shield, Loader2, AlertTriangle, Clock, Bot, HeartHandshake, Cloud, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import SentinelAddonsMarketplace from "@/components/sentinel/SentinelAddonsMarketplace";

interface PlatformSub {
  client_name: string;
  contact_email: string;
  billing_tier: string;
  is_active: boolean;
  cascades_to_users: boolean;
  notes: string | null;
  subscribed_at: string;
}

interface ShieldActivation {
  status: string;
  requested_at: string | null;
  activated_at: string | null;
  last_error: string | null;
  attempt_count?: number;
  max_attempts?: number;
  last_attempt_at?: string | null;
  next_retry_at?: string | null;
  stuck_after_minutes?: number;
}

interface PlatformAgent {
  agent_key: string;
  agent_name: string;
  service_category: string;
  description: string | null;
  plan_key: string;
  status: string;
  requested_at: string | null;
  activated_at: string | null;
  last_error: string | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_attempt_at?: string | null;
  stuck_after_minutes?: number | null;
}

interface AlertSettings {
  agent_stuck_after_minutes: number;
  shield_stuck_after_minutes: number;
  agent_failure_alert_enabled: boolean;
}

const AGENT_ICON: Record<string, React.ElementType> = {
  steven_ai: Bot,
  rachel_crm: HeartHandshake,
};

const SentinelMcpSubscriptionPanel = () => {
  const [sub, setSub] = useState<PlatformSub | null>(null);
  const [stats, setStats] = useState({ totalSubs: 0, totalSeoRequests: 0 });
  const [shield, setShield] = useState<ShieldActivation | null>(null);
  const [activating, setActivating] = useState(false);
  const [agents, setAgents] = useState<PlatformAgent[]>([]);
  const [activatingAgent, setActivatingAgent] = useState<string | null>(null);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    agent_stuck_after_minutes: 30,
    shield_stuck_after_minutes: 30,
    agent_failure_alert_enabled: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadAll = async () => {
    const [{ data }, { count: subCount }, { count: seoCount }, { data: shieldRow }, { data: agentRows }, { data: settingsRow }] =
      await Promise.all([
        supabase.from("sentinel_mcp_platform_subscription" as any).select("*").eq("id", 1).maybeSingle(),
        supabase.from("sentinel_mcp_user_subscriptions" as any).select("*", { count: "exact", head: true }),
        supabase.from("seo_optimization_requests" as any).select("*", { count: "exact", head: true }),
        supabase.from("sentinel_shield_activation" as any).select("*").eq("id", 1).maybeSingle(),
        supabase.from("sentinel_platform_agents" as any).select("*").order("agent_name"),
        supabase.from("sentinel_alert_settings" as any).select("*").eq("id", 1).maybeSingle(),
      ]);
    setSub(data as unknown as PlatformSub);
    setStats({ totalSubs: subCount ?? 0, totalSeoRequests: seoCount ?? 0 });
    setShield(shieldRow as unknown as ShieldActivation);
    setAgents((agentRows as unknown as PlatformAgent[]) ?? []);
    if (settingsRow) setAlertSettings(settingsRow as unknown as AlertSettings);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const requestShield = async () => {
    setActivating(true);
    try {
      // Idempotency key prevents duplicate billing on double-clicks / webhook retries
      const idemKey = `shield-${Date.now()}-${crypto.randomUUID()}`;
      const { data, error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: { action: "activate-shield", force: true, idempotency_key: idemKey },
      });
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === "active") toast.success("SENTINEL-SHIELD activated for FYSORA (free tier).");
      else if (status === "retrying")
        toast.info(
          `Sentinel MCP unreachable; retrying in ${(data as any)?.retry_in_seconds ?? "?"}s (attempt ${(data as any)?.activation?.attempt_count}/${(data as any)?.activation?.max_attempts}).`
        );
      else if (status === "requested") toast.info("Activation request queued — awaiting Sentinel MCP server.");
      else toast.error(`Activation failed: ${(data as any)?.activation?.last_error || "unknown error"}`);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to contact Sentinel MCP");
    } finally {
      setActivating(false);
    }
  };

  const activateAgent = async (agentKey: string) => {
    setActivatingAgent(agentKey);
    try {
      const idemKey = `agent-${agentKey}-${Date.now()}-${crypto.randomUUID()}`;
      const { data, error } = await supabase.functions.invoke("sentinel-mcp-worker", {
        body: { action: "activate-agent", agent_key: agentKey, force: true, idempotency_key: idemKey },
      });
      if (error) throw error;
      const status = (data as any)?.status;
      const name = agents.find((a) => a.agent_key === agentKey)?.agent_name || agentKey;
      if (status === "active") toast.success(`${name} engaged for FYSORA (non-fee tier).`);
      else if (status === "retrying")
        toast.info(`${name}: Sentinel MCP unreachable; retrying in ${(data as any)?.retry_in_seconds ?? "?"}s.`);
      else if (status === "requested") toast.info(`${name} request queued.`);
      else toast.error(`${name} activation failed: ${(data as any)?.agent?.last_error || "unknown"}`);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to contact Sentinel MCP");
    } finally {
      setActivatingAgent(null);
    }
  };

  // Derive an alert state for stuck / failed / retry activations
  const alertState = useMemo(() => {
    if (!shield) return null;
    const stuckMins = shield.stuck_after_minutes ?? 30;
    const lastAttempt = shield.last_attempt_at ? new Date(shield.last_attempt_at) : null;
    const ageMins = lastAttempt ? (Date.now() - lastAttempt.getTime()) / 60000 : null;

    if (shield.status === "failed") {
      return {
        kind: "destructive" as const,
        title: "SENTINEL-SHIELD activation failed",
        body: `${shield.last_error ?? "Unknown error."} Click "Retry now" to force a fresh attempt.`,
      };
    }
    if (shield.status === "retrying") {
      return {
        kind: "default" as const,
        title: "Activation retrying",
        body: `Attempt ${shield.attempt_count}/${shield.max_attempts}. Next retry at ${shield.next_retry_at ? new Date(shield.next_retry_at).toLocaleTimeString() : "—"}.`,
      };
    }
    if (
      shield.status === "requested" &&
      ageMins !== null &&
      ageMins > stuckMins
    ) {
      return {
        kind: "destructive" as const,
        title: "Activation appears stuck",
        body: `No response from Sentinel MCP for ${Math.round(ageMins)} minutes (threshold ${stuckMins}m).`,
      };
    }
    return null;
  }, [shield]);

  // Auto-refresh activation status every 30s while retrying / requested
  useEffect(() => {
    if (!shield) return;
    if (shield.status !== "retrying" && shield.status !== "requested") return;
    const id = setInterval(loadAll, 30_000);
    return () => clearInterval(id);
  }, [shield?.status]);

  // Per-agent alerts (failed / retrying / stuck) using configurable timeout
  const agentAlerts = useMemo(() => {
    const stuckMins = alertSettings.agent_stuck_after_minutes ?? 30;
    return agents
      .map((a) => {
        const lastAttempt = a.last_attempt_at ? new Date(a.last_attempt_at) : null;
        const ageMins = lastAttempt ? (Date.now() - lastAttempt.getTime()) / 60000 : null;
        if (a.status === "failed") {
          return { agent: a, kind: "destructive" as const, title: `${a.agent_name} activation failed`, body: a.last_error ?? "Unknown error." };
        }
        if (a.status === "retrying") {
          return { agent: a, kind: "default" as const, title: `${a.agent_name} retrying`, body: `Attempt ${a.attempt_count}/${a.max_attempts}. Next retry at ${a.next_retry_at ? new Date(a.next_retry_at).toLocaleTimeString() : "—"}.` };
        }
        if ((a.status === "requested" || a.status === "not_requested") && ageMins !== null && ageMins > stuckMins) {
          return { agent: a, kind: "destructive" as const, title: `${a.agent_name} engagement stuck`, body: `No response for ${Math.round(ageMins)}m (threshold ${stuckMins}m).` };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [agents, alertSettings.agent_stuck_after_minutes]);

  // Auto-poll while any agent is in a non-terminal state
  useEffect(() => {
    const needsPoll = agents.some((a) => ["retrying", "requested"].includes(a.status));
    if (!needsPoll) return;
    const id = setInterval(loadAll, 30_000);
    return () => clearInterval(id);
  }, [agents]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("sentinel_alert_settings" as any)
        .update({
          agent_stuck_after_minutes: alertSettings.agent_stuck_after_minutes,
          shield_stuck_after_minutes: alertSettings.shield_stuck_after_minutes,
          agent_failure_alert_enabled: alertSettings.agent_failure_alert_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
      toast.success("Alert thresholds saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Sparkles size={22} className="text-primary" /> Sentinel MCP Subscription
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-level integration with the Sentinel MCP service.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        {sub ? (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">{sub.client_name}</h3>
              <Badge variant="default" className="capitalize">
                {sub.billing_tier.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2"><Mail size={14} /> {sub.contact_email}</div>
              <div className="flex items-center gap-2">
                <ShieldOff size={14} />
                Non-fee status <strong>does not</strong> cascade to users (Tailors, Designers, Organizations).
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} /> Active user add-on subscriptions: <strong>{stats.totalSubs}</strong>
              </div>
              <div>SEO requests routed to Sentinel MCP: <strong>{stats.totalSeoRequests}</strong></div>
              {sub.notes && <p className="text-foreground/80 pt-2 border-t border-border">{sub.notes}</p>}
              <p className="pt-1">Subscribed since {new Date(sub.subscribed_at).toLocaleDateString()}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading subscription…</p>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield size={18} className="text-primary" /> SENTINEL-SHIELD (Free Platform Plan)
          </h3>
          <Badge
            variant={shield?.status === "active" ? "default" : "secondary"}
            className="capitalize"
          >
            {shield?.status?.replace(/_/g, " ") || "not requested"}
          </Badge>
        </div>

        {alertState && (
          <Alert variant={alertState.kind}>
            {alertState.kind === "destructive" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <AlertTitle>{alertState.title}</AlertTitle>
            <AlertDescription>{alertState.body}</AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          Includes WAF baseline, DDoS shielding, abuse detection, audit forwarding and uptime probes
          for the FYSORA platform. <strong>Does not</strong> extend to organization, designer or
          tailor users — they must subscribe to paid Security/Observability add-ons individually.
        </p>
        {shield?.requested_at && (
          <p className="text-xs text-muted-foreground">
            Last requested: {new Date(shield.requested_at).toLocaleString()}
          </p>
        )}
        {shield?.activated_at && (
          <p className="text-xs text-muted-foreground">
            Activated: {new Date(shield.activated_at).toLocaleString()}
          </p>
        )}
        {shield?.last_error && shield.status !== "active" && (
          <p className="text-xs text-destructive">{shield.last_error}</p>
        )}
        {(shield?.attempt_count ?? 0) > 0 && shield?.status !== "active" && (
          <p className="text-xs text-muted-foreground">
            Attempts: {shield?.attempt_count}/{shield?.max_attempts}
            {shield?.next_retry_at && (
              <> · next retry {new Date(shield.next_retry_at).toLocaleTimeString()}</>
            )}
          </p>
        )}
        <div className="pt-1">
          <Button onClick={requestShield} disabled={activating} size="sm">
            {activating ? (
              <><Loader2 size={14} className="mr-2 animate-spin" /> Requesting…</>
            ) : shield?.status === "active" ? (
              <><Shield size={14} className="mr-2" /> Re-confirm activation</>
            ) : shield?.status === "failed" || shield?.status === "retrying" ? (
              <><Shield size={14} className="mr-2" /> Retry now</>
            ) : (
              <><Shield size={14} className="mr-2" /> Request free SENTINEL-SHIELD</>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Bot size={18} className="text-primary" /> Platform Agents (Non-Fee Tier)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Engage Sentinel MCP platform agents for FYSORA FASHN as a non-fee-paying client.
            <strong> These engagements do not extend to organizations, designers, tailors or customers</strong> —
            they remain platform-scoped only.
          </p>
        </div>

        {alertSettings.agent_failure_alert_enabled && agentAlerts.length > 0 && (
          <div className="space-y-2">
            {agentAlerts.map((a) => (
              <Alert key={a.agent.agent_key} variant={a.kind}>
                {a.kind === "destructive" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <AlertTitle>{a.title}</AlertTitle>
                <AlertDescription>{a.body}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((agent) => {
            const Icon = AGENT_ICON[agent.agent_key] ?? Bot;
            const isBusy = activatingAgent === agent.agent_key;
            return (
              <div key={agent.agent_key} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agent.agent_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {agent.service_category.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={agent.status === "active" ? "default" : "secondary"}
                    className="capitalize text-[10px]"
                  >
                    {agent.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {agent.description && (
                  <p className="text-xs text-muted-foreground">{agent.description}</p>
                )}
                {agent.last_error && agent.status !== "active" && (
                  <p className="text-xs text-destructive">{agent.last_error}</p>
                )}
                {agent.attempt_count > 0 && agent.status !== "active" && (
                  <p className="text-xs text-muted-foreground">
                    Attempts: {agent.attempt_count}/{agent.max_attempts}
                    {agent.next_retry_at && (
                      <> · next retry {new Date(agent.next_retry_at).toLocaleTimeString()}</>
                    )}
                  </p>
                )}
                <Button
                  size="sm"
                  variant={agent.status === "active" ? "outline" : "default"}
                  disabled={isBusy}
                  onClick={() => activateAgent(agent.agent_key)}
                  className="w-full"
                >
                  {isBusy ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" /> Engaging…</>
                  ) : agent.status === "active" ? (
                    <>Re-confirm engagement</>
                  ) : agent.status === "failed" || agent.status === "retrying" ? (
                    <>Retry engagement</>
                  ) : (
                    <>Engage {agent.agent_name}</>
                  )}
                </Button>
              </div>
            );
          })}
          {agents.length === 0 && (
            <p className="text-xs text-muted-foreground">No platform agents configured.</p>
          )}
        </div>
      </Card>

      <Alert>
        <Cloud className="h-4 w-4" />
        <AlertTitle>Multi-Cloud Storage now available to organizations & designers</AlertTitle>
        <AlertDescription>
          Organizations and designers can subscribe to Sentinel MCP Multi-Cloud Storage
          (AWS S3 + GCP GCS + Cloudflare R2) from the add-ons marketplace below — billed
          independently from the FYSORA platform plan.
        </AlertDescription>
      </Alert>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings size={18} className="text-primary" /> Alert Thresholds
        </h3>
        <p className="text-xs text-muted-foreground">
          Configure how long an activation can sit without a response before raising a
          critical "stuck" alert.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Agent stuck threshold (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={alertSettings.agent_stuck_after_minutes}
              onChange={(e) =>
                setAlertSettings((s) => ({
                  ...s,
                  agent_stuck_after_minutes: Math.max(1, Number(e.target.value) || 30),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">SHIELD stuck threshold (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={alertSettings.shield_stuck_after_minutes}
              onChange={(e) =>
                setAlertSettings((s) => ({
                  ...s,
                  shield_stuck_after_minutes: Math.max(1, Number(e.target.value) || 30),
                }))
              }
            />
          </div>
        </div>
        <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
          {savingSettings ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            "Save thresholds"
          )}
        </Button>
      </Card>

      <SentinelAddonsMarketplace title="Available Sentinel MCP Add-Ons (User Pricing)" />
    </div>
  );
};

export default SentinelMcpSubscriptionPanel;
