import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrderDetail, statusLabels, statusColors, ORDER_STATUS_FLOW, type Order, type OrderStatus } from "@/hooks/useOrders";
import type { AppRole } from "@/hooks/useOrganization";
import { Calendar, User, Clock, Package, ArrowRight, Ruler } from "lucide-react";
import { motion } from "framer-motion";
import InvoiceGenerator from "./InvoiceGenerator";

interface InvoiceSettings {
  invoice_address?: string | null;
  invoice_payment_terms?: string | null;
  invoice_notes?: string | null;
  invoice_logo_url?: string | null;
}

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AppRole | null;
  tailors: { id: string; display_name: string | null }[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onAssignTailor: (orderId: string, tailorId: string) => void;
  orgName?: string;
  orgSettings?: InvoiceSettings;
}

const OrderDetailSheet = ({ order, open, onOpenChange, role, tailors, onStatusChange, onAssignTailor, orgName, orgSettings }: OrderDetailSheetProps) => {
  const { items, history, loading } = useOrderDetail(open && order ? order.id : undefined);
  const canManage = role === "org_admin" || role === "super_admin";
  const canUpdateStatus = canManage || role === "tailor";

  if (!order) return null;

  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.status as OrderStatus);
  const nextStatus = order.status !== "cancelled" && currentStepIndex < ORDER_STATUS_FLOW.length - 1
    ? ORDER_STATUS_FLOW[currentStepIndex + 1]
    : null;

  const showInvoice = ["completed", "delivered"].includes(order.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2">
            <Package size={20} className="text-primary" />
            {order.order_number}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Title */}
          <div>
            <h3 className="font-heading font-semibold text-lg">{order.title}</h3>
            {order.description && <p className="text-sm text-muted-foreground mt-1">{order.description}</p>}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.status as OrderStatus]}`}>
                {statusLabels[order.status as OrderStatus]}
              </span>
              {nextStatus && canUpdateStatus && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(order.id, nextStatus)}>
                  Move to {statusLabels[nextStatus]} <ArrowRight size={12} className="ml-1" />
                </Button>
              )}
              {showInvoice && (
                <InvoiceGenerator order={order} orgName={orgName || "Fashion Stitches"} orgSettings={orgSettings} />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Production Progress</p>
            <div className="flex gap-1">
              {ORDER_STATUS_FLOW.map((status, index) => (
                <div
                  key={status}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Pending</span>
              <span>Delivered</span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User size={12} /> Customer
              </div>
              <p className="text-sm font-medium">{order.customer_profile?.display_name || "Unknown"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User size={12} /> Tailor
              </div>
              {canManage ? (
                <Select value={order.assigned_tailor_id || ""} onValueChange={(val) => onAssignTailor(order.id, val)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Assign tailor" />
                  </SelectTrigger>
                  <SelectContent>
                    {tailors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.display_name || "Unknown"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{order.tailor_profile?.display_name || "Unassigned"}</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar size={12} /> Due Date
              </div>
              <p className="text-sm font-medium">{order.due_date ? new Date(order.due_date).toLocaleDateString() : "Not set"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Package size={12} /> Total
              </div>
              <p className="text-sm font-bold">{Number(order.total_amount).toLocaleString()} {order.currency}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Order Items</h4>
            {loading ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const measurements = item.measurements as Record<string, string> | null;
                  const hasMeasurements = measurements && Object.values(measurements).some((v) => v && String(v).trim() !== "");

                  return (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.fabric_details && <p className="text-xs text-muted-foreground mt-0.5">{item.fabric_details}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{(item.quantity * Number(item.unit_price)).toLocaleString()} {order.currency}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {Number(item.unit_price).toLocaleString()}</p>
                        </div>
                      </div>
                      {hasMeasurements && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                            <Ruler size={10} /> Measurements
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                            {Object.entries(measurements!)
                              .filter(([, v]) => v && String(v).trim() !== "")
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                                  <span className="font-medium">{value} cm</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status History */}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Status History</h4>
            {loading ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-xs">
                        {entry.old_status && <><span className="text-muted-foreground">{statusLabels[entry.old_status]}</span> → </>}
                        <span className="font-medium">{statusLabels[entry.new_status]}</span>
                      </p>
                      {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <Clock size={10} className="inline mr-1" />
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailSheet;
