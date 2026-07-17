import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { chooseGateways, type Gateway } from "@/lib/paymentRouting";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ExternalLink, ShieldCheck, Landmark, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderRow {
  id: string;
  order_number: string;
  currency: string;
  customer_total: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  org_id: string;
}

interface OrgRow {
  id: string;
  country: string | null;
  currency: string | null;
  name: string | null;
}

interface BankTransfer {
  bankName: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  expiresAt?: string;
  orderNo?: string;
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState<Gateway | null>(null);
  const [bank, setBank] = useState<BankTransfer | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [activeGateway, setActiveGateway] = useState<Gateway | null>(null);

  useEffect(() => {
    (async () => {
      if (!orderId) return;
      const { data: o } = await supabase.from("orders")
        .select("id, order_number, currency, customer_total, total_amount, amount_paid, org_id")
        .eq("id", orderId).maybeSingle();
      if (!o) { setLoading(false); return; }
      setOrder(o as OrderRow);
      const { data: orgRow } = await supabase.from("organizations")
        .select("id, country, currency, name").eq("id", o.org_id).maybeSingle();
      setOrg(orgRow as OrgRow);
      setLoading(false);
    })();
  }, [orderId]);

  const routedGateways = useMemo(
    () => chooseGateways({ country: org?.country, currency: order?.currency || org?.currency }),
    [org, order],
  );

  const total = Number(order?.customer_total || order?.total_amount || 0);
  const paid = Number(order?.amount_paid || 0);
  const due = Math.max(0, total - paid);

  const startPayment = async (gateway: Gateway) => {
    if (!order || !user) return;
    setInitializing(gateway);
    setActiveGateway(gateway);
    setBank(null);
    try {
      const callback = `${window.location.origin}/receipt/pending?gateway=${gateway}`;
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: { order_id: order.id, gateway, callback_url: callback },
      });
      if (error) throw error;
      const res = data as any;
      if (res.payment_id) setPaymentId(res.payment_id);
      if (gateway === "opay" && res.bank_transfer) {
        setBank(res.bank_transfer as BankTransfer);
      } else if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err: any) {
      toast({ title: "Could not start payment", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setInitializing(null);
    }
  };

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    toast({ title: "Copied", description: v });
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-10 text-center text-muted-foreground">Order not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Order <span className="font-mono">{order.order_number}</span>
          {org?.name ? ` · ${org.name}` : ""}
        </p>
      </div>

      <Card className="p-5 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Amount due</span>
          <span className="font-heading text-3xl font-bold">
            {order.currency} {due.toLocaleString()}
          </span>
        </div>
        {paid > 0 && (
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>Already paid</span>
            <span>{order.currency} {paid.toLocaleString()} of {total.toLocaleString()}</span>
          </div>
        )}
      </Card>

      {!bank && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" /> Choose a payment method
          </h2>
          <p className="text-xs text-muted-foreground">
            Suggested methods based on your billing region
            {org?.country ? ` (${org.country})` : ""} and the order currency ({order.currency}).
          </p>
          <div className="grid gap-3">
            {routedGateways.map((g) => (
              <Card key={g.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {g.id === "opay" ? <Landmark size={16} className="text-primary" /> : <Globe size={16} className="text-primary" />}
                    <p className="font-semibold">{g.label}</p>
                    {g.id === "opay" && <Badge variant="secondary">Nigeria</Badge>}
                    {g.id === "paypal" && <Badge variant="secondary">Global</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{g.methods.join(" · ")}</p>
                </div>
                <Button size="sm" onClick={() => startPayment(g.id)} disabled={initializing !== null}>
                  {initializing === g.id ? <Loader2 size={14} className="animate-spin" /> : (
                    <>Pay <ExternalLink size={14} className="ml-1" /></>
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {bank && (
        <Card className="p-5 space-y-4 border-primary/40">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-primary" />
            <h2 className="font-heading font-semibold">Transfer to this Opay virtual account</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Send exactly {bank.currency} {bank.amount.toLocaleString()} from any Nigerian bank.
            The account is issued for this order only — payment is confirmed automatically once it lands.
          </p>
          <div className="space-y-2">
            {[
              { k: "Bank", v: bank.bankName },
              { k: "Account name", v: bank.accountName },
              { k: "Account number", v: bank.accountNumber, big: true },
              { k: "Amount", v: `${bank.currency} ${bank.amount.toLocaleString()}`, big: true },
              ...(bank.orderNo ? [{ k: "Reference", v: bank.orderNo }] : []),
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.k}</p>
                  <p className={row.big ? "font-mono text-lg font-bold" : "font-medium"}>{row.v}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copy(String(row.v).replace(/[^\w.-]/g, ""))}>
                  <Copy size={14} />
                </Button>
              </div>
            ))}
          </div>
          {bank.expiresAt && (
            <p className="text-[11px] text-muted-foreground">
              This account expires at {new Date(bank.expiresAt).toLocaleString()}.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => paymentId && navigate(`/receipt/${paymentId}`)} disabled={!paymentId}>
              I've paid — track status
            </Button>
            <Button variant="outline" onClick={() => { setBank(null); setActiveGateway(null); }}>
              Change method
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}