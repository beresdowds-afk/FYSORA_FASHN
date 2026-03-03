import { useState } from "react";
import { useDeliveryFlags } from "@/hooks/useShipments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

const DeliveryFlagsPanel = ({ orgId }: { orgId: string }) => {
  const { flags, loading, resolveFlag } = useDeliveryFlags(orgId);
  const { toast } = useToast();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const handleResolve = async (id: string) => {
    const { error } = await resolveFlag(id, notes);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Flag resolved" }); setResolvingId(null); setNotes(""); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const openFlags = flags.filter(f => f.status === "open");
  const resolvedFlags = flags.filter(f => f.status !== "open");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-destructive" />
        <span className="text-sm font-medium">{openFlags.length} open exception(s)</span>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <CheckCircle size={32} className="mx-auto text-green-500 mb-3" />
          <p className="text-muted-foreground">No delivery exceptions. All shipments on track!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...openFlags, ...resolvedFlags].map((flag) => (
            <div key={flag.id} className={`rounded-xl border p-4 ${flag.status === "open" ? "bg-card border-border" : "bg-muted/30 border-border/50"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{flag.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${severityColors[flag.severity] || ""}`}>
                      {flag.severity}
                    </Badge>
                    {flag.status !== "open" && (
                      <Badge variant="outline" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        resolved
                      </Badge>
                    )}
                  </div>
                  {flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}
                  {flag.resolution_notes && <p className="text-xs text-muted-foreground mt-1 italic">Resolution: {flag.resolution_notes}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(flag.created_at).toLocaleDateString()}</span>
              </div>
              {flag.status === "open" && (
                <div className="mt-3">
                  {resolvingId === flag.id ? (
                    <div className="space-y-2">
                      <Textarea placeholder="Resolution notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="hero" onClick={() => handleResolve(flag.id)}>Resolve</Button>
                        <Button size="sm" variant="outline" onClick={() => setResolvingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setResolvingId(flag.id)}>Resolve Flag</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default DeliveryFlagsPanel;
