import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface Req {
  id: string;
  org_id: string;
  packs_requested: number;
  status: string;
  price_total: number | null;
  currency: string | null;
  invoice_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}
interface Org { id: string; name: string; slug: string }

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-600",
  approved: "bg-blue-500/20 text-blue-600",
  awaiting_payment: "bg-orange-500/20 text-orange-600",
  active: "bg-emerald-500/20 text-emerald-600",
  rejected: "bg-rose-500/20 text-rose-600",
  cancelled: "bg-muted text-muted-foreground",
};

const CapacityRequestsPanel = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Req[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [packPriceNgn, setPackPriceNgn] = useState<number>(5000);
  const [packPriceUsd, setPackPriceUsd] = useState<number>(5);

  const refresh = async () => {
    const [{ data: r }, { data: o }, { data: cfg }] = await Promise.all([
      supabase.from("image_capacity_requests" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name, slug"),
      supabase.from("website_pricing_config").select("image_pack_price_ngn, image_pack_price_usd").limit(1).maybeSingle(),
    ]);
    setRows((r as any) || []);
    setOrgs((o as any) || []);
    if (cfg) {
      setPackPriceNgn(Number((cfg as any).image_pack_price_ngn || 5000));
      setPackPriceUsd(Number((cfg as any).image_pack_price_usd || 5));
    }
  };
  useEffect(() => { refresh(); }, []);

  const approve = async (req: Req) => {
    const total = packPriceNgn * req.packs_requested;
    const { error } = await supabase.from("image_capacity_requests" as any).update({
      status: "awaiting_payment",
      price_total: total,
      currency: "NGN",
      approved_at: new Date().toISOString(),
    }).eq("id", req.id);
    if (error) toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Approved — invoice issued" }); refresh(); }
  };
  const markPaid = async (req: Req) => {
    const { error } = await supabase.from("image_capacity_requests" as any).update({
      status: "active",
    }).eq("id", req.id);
    if (error) toast({ title: "Activation failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Capacity granted" }); refresh(); }
  };
  const reject = async (req: Req) => {
    const reason = prompt("Reason for rejection?") || "";
    const { error } = await supabase.from("image_capacity_requests" as any).update({
      status: "rejected",
      rejection_reason: reason,
    }).eq("id", req.id);
    if (error) toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Request rejected" }); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ImageIcon size={20} className="text-primary" />
        <h2 className="font-heading font-bold text-2xl">Image Capacity Requests</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Organizations request extra image capacity in packs of 50.
        Current pack price: <strong>₦{packPriceNgn.toLocaleString()}</strong> / ${packPriceUsd}.
        Approval issues an invoice; capacity activates automatically once payment is verified.
      </p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Org</th>
              <th className="px-4 py-2">Packs</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Requested</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No requests yet.</td></tr>
            )}
            {rows.map(r => {
              const org = orgs.find(o => o.id === r.org_id);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">{org?.name || r.org_id}</td>
                  <td className="px-4 py-3">{r.packs_requested} × 50</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLOR[r.status] || ""}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.price_total ? `${r.currency || "NGN"} ${Number(r.price_total).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => approve(r)}><DollarSign size={12} className="mr-1" />Approve & Invoice</Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(r)}><XCircle size={12} /></Button>
                      </>
                    )}
                    {r.status === "awaiting_payment" && (
                      <Button size="sm" variant="default" onClick={() => markPaid(r)}>
                        <CheckCircle2 size={12} className="mr-1" />Mark Paid & Activate
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CapacityRequestsPanel;
