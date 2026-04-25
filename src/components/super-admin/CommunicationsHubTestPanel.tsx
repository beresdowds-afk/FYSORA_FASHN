import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, PhoneCall, Loader2, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, Activity,
} from "lucide-react";

type Outcome = {
  ok: boolean;
  label: string;
  data?: any;
  error?: string;
  timestamp: string;
};

type WebhookRow = {
  id: string;
  provider: "twilio" | "whatchimp" | "termii";
  event_type: string;
  signature_verified: boolean;
  signature_reason: string | null;
  external_id: string | null;
  call_sid: string | null;
  message_sid: string | null;
  from_number: string | null;
  to_number: string | null;
  status: string | null;
  received_at: string;
};

/**
 * Super Admin Communications Hub — interactive test surface for the
 * smart-route-message router and twilio voice initiation, plus a real-time
 * stream of inbound provider webhooks (with signature verification status).
 */
export default function CommunicationsHubTestPanel() {
  const { toast } = useToast();

  // ── WhatsApp test state ────────────────────────────────────────────────
  const [waTo, setWaTo] = useState("+234");
  const [waMessage, setWaMessage] = useState("Test message from FSA Communications Hub");
  const [waProcessType, setWaProcessType] = useState("general");
  const [waMediaUrl, setWaMediaUrl] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waOutcome, setWaOutcome] = useState<Outcome | null>(null);

  // ── Voice call test state ──────────────────────────────────────────────
  const [callTo, setCallTo] = useState("+234");
  const [callOrgId, setCallOrgId] = useState("");
  const [callDispatching, setCallDispatching] = useState(false);
  const [callOutcome, setCallOutcome] = useState<Outcome | null>(null);

  // ── Webhook stream ────────────────────────────────────────────────────
  const [events, setEvents] = useState<WebhookRow[]>([]);
  const [streamReady, setStreamReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("webhook_event_log")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(25);
      if (!cancelled && data) setEvents(data as WebhookRow[]);
    })();

    const channel = supabase
      .channel("webhook_event_log_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "webhook_event_log" },
        (payload) => {
          setEvents((prev) => [payload.new as WebhookRow, ...prev].slice(0, 25));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setStreamReady(true);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────

  async function sendTestWhatsApp() {
    if (!waTo || !waMessage) {
      toast({ title: "Missing fields", description: "Recipient and message are required", variant: "destructive" });
      return;
    }
    setWaSending(true);
    setWaOutcome(null);
    try {
      const { data, error } = await supabase.functions.invoke("smart-route-message", {
        body: {
          to: waTo.trim(),
          message: waMessage,
          media_url: waMediaUrl || undefined,
          process_type: waProcessType,
        },
      });
      if (error) throw error;
      setWaOutcome({
        ok: !!data?.success,
        label: data?.route
          ? `Routed via ${data.route.provider} (${data.route.channel})`
          : "Sent",
        data,
        timestamp: new Date().toISOString(),
      });
      toast({
        title: data?.success ? "Message dispatched" : "Send returned an error",
        description: data?.route?.reason || "See provider response below",
      });
    } catch (e: any) {
      setWaOutcome({
        ok: false,
        label: "Send failed",
        error: e?.message || String(e),
        timestamp: new Date().toISOString(),
      });
      toast({ title: "Send failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setWaSending(false);
    }
  }

  async function initiateTestCall() {
    if (!callTo || !callOrgId) {
      toast({
        title: "Missing fields",
        description: "Destination number and the originating organization id are required",
        variant: "destructive",
      });
      return;
    }
    setCallDispatching(true);
    setCallOutcome(null);
    try {
      const projectRef = "ruplopynbimfjowhpktz";
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      if (!accessToken) throw new Error("No active session — please sign in.");

      const url = `https://${projectRef}.supabase.co/functions/v1/twilio-webhook?route=initiate-call`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ to: callTo.trim(), orgId: callOrgId.trim() }),
      });
      const data = await resp.json().catch(() => ({}));
      setCallOutcome({
        ok: resp.ok,
        label: resp.ok ? `Call SID ${data.callSid || ""}` : `HTTP ${resp.status}`,
        data,
        error: resp.ok ? undefined : data?.error,
        timestamp: new Date().toISOString(),
      });
      toast({
        title: resp.ok ? "Call initiated" : "Call failed",
        description: resp.ok
          ? `Twilio Call SID: ${data.callSid}`
          : data?.error || `HTTP ${resp.status}`,
        variant: resp.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      setCallOutcome({
        ok: false,
        label: "Dispatch failed",
        error: e?.message || String(e),
        timestamp: new Date().toISOString(),
      });
      toast({ title: "Dispatch failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setCallDispatching(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Communications Hub</h2>
        <p className="text-sm text-muted-foreground">
          Send test WhatsApp messages, initiate voice calls through the smart router, and monitor inbound provider webhooks in real time.
        </p>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">
            <MessageSquare size={14} className="mr-1.5" /> WhatsApp Test
          </TabsTrigger>
          <TabsTrigger value="voice">
            <PhoneCall size={14} className="mr-1.5" /> Voice Call Test
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Activity size={14} className="mr-1.5" /> Webhook Stream
            {streamReady && (
              <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── WhatsApp ─────────────────────────────────────────────────── */}
        <TabsContent value="whatsapp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send a test message via smart-route-message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-to">Recipient (E.164)</Label>
                  <Input id="wa-to" value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="+2348012345678" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wa-process">Process type</Label>
                  <Select value={waProcessType} onValueChange={setWaProcessType}>
                    <SelectTrigger id="wa-process"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="customer_support">Customer support</SelectItem>
                      <SelectItem value="otp_verification">OTP verification</SelectItem>
                      <SelectItem value="emergency_alert">Emergency alert</SelectItem>
                      <SelectItem value="feedback_collection">Feedback collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-message">Message</Label>
                <Textarea id="wa-message" rows={3} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-media">Media URL (optional — forces WhatsApp)</Label>
                <Input id="wa-media" value={waMediaUrl} onChange={(e) => setWaMediaUrl(e.target.value)} placeholder="https://…/image.png" />
              </div>

              <Button onClick={sendTestWhatsApp} disabled={waSending}>
                {waSending ? (<><Loader2 size={14} className="mr-2 animate-spin" /> Routing…</>)
                          : (<><MessageSquare size={14} className="mr-2" /> Send via router</>)}
              </Button>

              {waOutcome && <OutcomeCard outcome={waOutcome} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Voice ────────────────────────────────────────────────────── */}
        <TabsContent value="voice" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Initiate a test outbound call</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="call-to">Destination (E.164)</Label>
                  <Input id="call-to" value={callTo} onChange={(e) => setCallTo(e.target.value)} placeholder="+2348012345678" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="call-org">Originating organization id</Label>
                  <Input id="call-org" value={callOrgId} onChange={(e) => setCallOrgId(e.target.value)} placeholder="uuid of org with active phone number" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                The selected organization must have an active row in <code>org_phone_numbers</code>.
                The call is placed by Twilio; status updates stream into the Webhook tab.
              </p>

              <Button onClick={initiateTestCall} disabled={callDispatching}>
                {callDispatching ? (<><Loader2 size={14} className="mr-2 animate-spin" /> Dispatching…</>)
                                : (<><PhoneCall size={14} className="mr-2" /> Place call</>)}
              </Button>

              {callOutcome && <OutcomeCard outcome={callOutcome} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Webhook stream ───────────────────────────────────────────── */}
        <TabsContent value="webhooks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Inbound webhook stream (last 25)</span>
                <Badge variant={streamReady ? "default" : "secondary"}>
                  {streamReady ? "Live" : "Connecting…"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No webhook events received yet. Trigger a test send/call above and watch them appear here in real time.
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div key={ev.id} className="border rounded-md p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{ev.provider}</Badge>
                          <span className="font-medium">{ev.event_type}</span>
                          {ev.signature_verified ? (
                            <span className="inline-flex items-center text-emerald-600 text-xs gap-1">
                              <ShieldCheck size={12} /> verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-amber-600 text-xs gap-1" title={ev.signature_reason || ""}>
                              <ShieldAlert size={12} /> unverified
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.received_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="grid gap-1 grid-cols-2 text-xs text-muted-foreground">
                        {ev.from_number && <span>From: {ev.from_number}</span>}
                        {ev.to_number && <span>To: {ev.to_number}</span>}
                        {ev.status && <span>Status: {ev.status}</span>}
                        {(ev.call_sid || ev.message_sid) && (
                          <span className="truncate">SID: {ev.call_sid || ev.message_sid}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  return (
    <div className="border rounded-md p-3 bg-muted/30 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {outcome.ok ? (
          <CheckCircle2 size={16} className="text-emerald-600" />
        ) : (
          <XCircle size={16} className="text-destructive" />
        )}
        {outcome.label}
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(outcome.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {outcome.error && (
        <p className="text-xs text-destructive">{outcome.error}</p>
      )}
      {outcome.data && (
        <pre className="text-[11px] bg-background border rounded p-2 max-h-48 overflow-auto">
{JSON.stringify(outcome.data, null, 2)}
        </pre>
      )}
    </div>
  );
}