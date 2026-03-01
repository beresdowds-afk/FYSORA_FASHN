import { useState } from "react";
import { useCallLogs, CallLog } from "@/hooks/useCallLogs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, Search, PhoneCall } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CallHistoryPanelProps {
  orgId: string;
}

const CallHistoryPanel = ({ orgId }: CallHistoryPanelProps) => {
  const { data: calls = [], isLoading } = useCallLogs(orgId);
  const [search, setSearch] = useState("");
  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);

  const filtered = calls.filter(
    (c) =>
      c.from_number.includes(search) ||
      c.to_number.includes(search) ||
      (c.caller_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleInitiateCall = async () => {
    if (!dialNumber.trim()) return;
    setCalling(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/twilio-webhook?route=initiate-call`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ to: dialNumber.trim(), orgId }),
        }
      );

      const result = await res.json();

      if (result.success) {
        toast.success("Call initiated successfully");
        setDialNumber("");
      } else {
        toast.error(result.error || "Failed to initiate call");
      }
    } catch {
      toast.error("Failed to initiate call");
    } finally {
      setCalling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      "in-progress": "secondary",
      ringing: "secondary",
      initiated: "outline",
      busy: "destructive",
      "no-answer": "destructive",
      canceled: "destructive",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getDirectionIcon = (call: CallLog) => {
    if (call.direction === "outbound") return <PhoneOutgoing size={14} className="text-primary" />;
    if (["no-answer", "busy", "failed", "canceled"].includes(call.status)) {
      return <PhoneMissed size={14} className="text-destructive" />;
    }
    return <PhoneIncoming size={14} className="text-accent-foreground" />;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Click-to-Call Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PhoneCall size={18} /> Click-to-Call
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter phone number (e.g. +1234567890)"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleInitiateCall} disabled={calling || !dialNumber.trim()}>
              <Phone size={14} className="mr-2" />
              {calling ? "Calling…" : "Call"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone size={18} /> Call History
            </CardTitle>
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by number or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading call logs…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No calls found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-16">Rec.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{getDirectionIcon(call)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {call.caller_name ? (
                        <span>
                          {call.caller_name}{" "}
                          <span className="text-muted-foreground">({call.from_number})</span>
                        </span>
                      ) : (
                        call.from_number
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{call.to_number}</TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                    <TableCell className="text-sm">{formatDuration(call.duration_seconds)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {call.started_at
                        ? format(new Date(call.started_at), "MMM d, h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {call.recording_url ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Play size={14} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Call Recording</DialogTitle>
                            </DialogHeader>
                            <audio controls className="w-full mt-4">
                              <source src={call.recording_url} type="audio/wav" />
                              Your browser does not support the audio element.
                            </audio>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallHistoryPanel;
