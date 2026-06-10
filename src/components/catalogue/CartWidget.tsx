import { useEffect, useState } from "react";
import { ShoppingCart, X, Trash2, Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  type CartItem,
  getCart,
  removeFromCart,
  updateQty,
  cartTotal,
  submitCartOrder,
  clearCart,
} from "@/lib/cartFlow";

interface CartWidgetProps {
  orgId: string;
  brandColor?: string;
  source: "native" | "embed" | "demo";
}

/**
 * Floating cart for the unified catalogue flow.
 * Renders the same UX on native org sites, the demo site, and (via iframe) on
 * non-native domains using the embed widget.
 */
const CartWidget = ({ orgId, brandColor = "#C9A84C", source }: CartWidgetProps) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    setItems(getCart(orgId));
    const handler = (e: any) => {
      if (e.detail?.orgId === orgId) setItems(getCart(orgId));
    };
    window.addEventListener("fsa-cart-updated", handler);
    return () => window.removeEventListener("fsa-cart-updated", handler);
  }, [orgId]);

  useEffect(() => {
    if (open) {
      if (profile?.display_name && !name) setName(profile.display_name);
      if (user?.email && !email) setEmail(user.email);
    }
  }, [open, profile, user, name, email]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = cartTotal(items);
  const currency = items[0]?.currency || "NGN";

  const handleSubmit = async () => {
    if (!name || !email) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await submitCartOrder({
      orgId,
      source,
      customer: { name, email, phone: phone || undefined },
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      toast({
        title: source === "demo" ? "Demo cart submitted" : "Cart submitted",
        description: `Order ${res.order_number} • ${res.currency} ${(res.total ?? 0).toLocaleString()}`,
      });
      setOpen(false);
      setNotes("");
      setItems([]);
    } else {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
    }
  };

  if (count === 0 && !open) return null;

  return (
    <>
      {count > 0 && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Open cart, ${count} items`}
          className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
          style={{ background: brandColor, color: "#fff" }}
        >
          <ShoppingCart size={22} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {count}
          </span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart size={18} /> Your Cart
              {source === "demo" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700">
                  DEMO
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Your cart is empty.</p>
            ) : (
              items.map((i) => (
                <div key={`${i.source}:${i.id}`} className="flex gap-3 p-3 rounded-lg border border-border">
                  {i.image_url && (
                    <img src={i.image_url} alt={i.name} className="w-14 h-14 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.currency} {i.unit_price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => updateQty(orgId, i.id, i.quantity - 1)}
                      >
                        <Minus size={10} />
                      </Button>
                      <span className="text-xs px-2 min-w-[24px] text-center">{i.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => updateQty(orgId, i.id, i.quantity + 1)}
                      >
                        <Plus size={10} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 ml-auto text-destructive"
                        onClick={() => removeFromCart(orgId, i.id)}
                      >
                        <Trash2 size={10} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span>
                  {currency} {total.toLocaleString()}
                </span>
              </div>
              <Input placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Textarea
                placeholder="Notes for the organization (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearCart(orgId);
                  }}
                >
                  Clear
                </Button>
                <Button
                  className="flex-1"
                  style={{ background: brandColor, color: "#fff" }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                  {source === "demo" ? "Submit (Demo)" : "Submit Cart"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Prices are re-verified server-side. The organization will be notified instantly.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CartWidget;