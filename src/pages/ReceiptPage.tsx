import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Clock, XCircle, Printer } from "lucide-react";

interface PaymentRow {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_gateway: string;
  gateway_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  metadata: any;
}

export default function ReceiptPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [search] = useSearchParams();
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [order, setOrder] = useState<{ order_number: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  // If arriving from PayPal, capture the order first
  useEffect(() => {
    const paypalToken = search.get("token") || search.get("reference");
    const gateway = search.get("gateway");
    if (gateway === "paypal" && paypalToken && !capturing) {
      setCapturing(true);
      supabase.functions.invoke("paypal-capture-order", { body: { order_id: paypalToken } })
        .finally(() => setCapturing(false));
    }
  }, [search, capturing]);

  useEffect(() => {
    if (!paymentId || paymentId === "pending") { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.from("payments").select("*").eq("id", paymentId).maybeSingle();
      if (cancelled) return;
      setPayment(data as PaymentRow | null);
      if (data?.order_id) {
        const { data: o } = await supabase.from("orders").select("order_number").eq("id", data.order_id).maybeSingle();
        if (!cancelled) setOrder(o as any);
      }
      setLoading(false);
    };
    load();

    // Realtime status updates
    const channel = supabase
      .channel(`payment-${paymentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${paymentId}` },
        (p) => setPayment(p.new as PaymentRow),
      )
      .subscribe();

    // Fallback polling every 5s while pending
    const iv = setInterval(load, 5000);

    return () => {
      cancelled = true;
      clearInterval(iv);
      supabase.removeChannel(channel);
    };
  }, [paymentId]);

  if (loading || capturing) {
    return (
      <div className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" />
        <p>{capturing ? "Confirming PayPal payment…" : "Loading receipt…"}</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Receipt not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/payments">Back to payments</Link></Button>
      </div>
    );
  }

  const status = payment.status;
  const isPaid = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6 print:p-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Receipt</h1>
          <p className="text-xs text-muted-foreground">Payment #{payment.id.slice(0, 8)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer size={14} className="mr-1" /> Print
        </Button>
      </div>

      <Card className="p-6 text-center space-y-3">
        {isPaid ? (
          <>
            <CheckCircle2 size={56} className="text-emerald-500 mx-auto" />
            <h2 className="font-heading text-xl font-bold">Payment received</h2>
            <p className="text-sm text-muted-foreground">
              Confirmed on {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "—"}
            </p>
          </>
        ) : isFailed ? (
          <>
            <XCircle size={56} className="text-destructive mx-auto" />
            <h2 className="font-heading text-xl font-bold">Payment failed</h2>
            <p className="text-sm text-muted-foreground">You can retry from the checkout page.</p>
          </>
        ) : (
          <>
            <Clock size={56} className="text-amber-500 mx-auto animate-pulse" />
            <h2 className="font-heading text-xl font-bold">Awaiting confirmation</h2>
            <p className="text-sm text-muted-foreground">
              We'll update this page automatically once {payment.payment_gateway.toUpperCase()} confirms the transfer.
            </p>
          </>
        )}
        <Badge variant={isPaid ? "default" : isFailed ? "destructive" : "secondary"} className="capitalize">
          {status}
        </Badge>
      </Card>

      <Card className="p-5 space-y-3">
        <Row k="Order" v={order?.order_number || payment.order_id?.slice(0, 8) || "—"} />
        <Row k="Amount" v={`${payment.currency} ${Number(payment.amount).toLocaleString()}`} />
        <Row k="Method" v={payment.payment_gateway.toUpperCase()} />
        <Row k="Reference" v={payment.gateway_payment_id || "—"} mono />
        <Row k="Initiated" v={new Date(payment.created_at).toLocaleString()} />
      </Card>

      {!isPaid && payment.payment_gateway === "opay" && payment.metadata?.bank_transfer && (
        <Card className="p-5 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Transfer to</p>
          <p className="font-mono text-lg font-bold">{payment.metadata.bank_transfer.accountNumber}</p>
          <p className="text-sm">{payment.metadata.bank_transfer.bankName} · {payment.metadata.bank_transfer.accountName}</p>
        </Card>
      )}

      <Button asChild variant="outline" className="w-full print:hidden">
        <Link to="/payments">Back to payments</Link>
      </Button>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium text-sm"}>{v}</span>
    </div>
  );
}