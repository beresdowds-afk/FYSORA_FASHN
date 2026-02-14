import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { dispatchNotifications } from "@/lib/notificationDispatcher";
import { Video, Clock, DollarSign, CheckCircle2, XCircle, Calendar, PhoneCall } from "lucide-react";

interface Booking {
  id: string;
  org_id: string;
  customer_id: string;
  booking_status: string;
  hours_booked: number;
  total_amount: number;
  currency: string;
  local_amount: number | null;
  local_currency: string | null;
  org_share_amount: number;
  platform_share_amount: number;
  scheduled_at: string | null;
  payment_status: string;
  paid_at: string | null;
  session_type: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending_payment: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/15 text-primary",
  in_progress: "bg-secondary/15 text-secondary",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/15 text-destructive",
};

const MeasurementBookingsTab = ({ orgId, isAdmin = false }: { orgId: string; isAdmin?: boolean }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from("ai_measurement_bookings")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setBookings((data as Booking[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [orgId]);

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    const { error } = await supabase
      .from("ai_measurement_bookings")
      .update({ booking_status: newStatus })
      .eq("id", bookingId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Booking ${newStatus}` });
      fetchBookings();

      // Dispatch notifications for confirmed/completed
      if (booking && (newStatus === "confirmed" || newStatus === "completed")) {
        const eventType = newStatus === "confirmed" ? "measurement_confirmed" : "measurement_completed";
        dispatchNotifications({
          orgId,
          eventType,
          bookingId: booking.id,
          customerId: booking.customer_id,
          hoursBooked: booking.hours_booked,
          amount: Number(booking.total_amount),
          currency: booking.currency,
          scheduledAt: booking.scheduled_at || undefined,
        }).catch(console.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = bookings
    .filter(b => b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const orgRevenue = bookings
    .filter(b => b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.org_share_amount), 0);
  const platformRevenue = bookings
    .filter(b => b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.platform_share_amount), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-2xl">AI Measurement Bookings</h2>
      </div>

      {/* Revenue Summary (admin only) */}
      {isAdmin && bookings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-primary" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="font-heading font-bold text-xl">${totalRevenue}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-secondary" />
              <span className="text-xs text-muted-foreground">Org Share (60%)</span>
            </div>
            <p className="font-heading font-bold text-xl">${orgRevenue}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Video size={14} className="text-accent" />
              <span className="text-xs text-muted-foreground">Platform Share (40%)</span>
            </div>
            <p className="font-heading font-bold text-xl">${platformRevenue}</p>
          </div>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Video size={40} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No AI measurement bookings yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {bookings.map((booking) => (
              <div key={booking.id} className="p-4 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Video size={14} className="text-primary" />
                    <span className="text-sm font-medium">
                      {booking.hours_booked}h {booking.session_type === "video_ai" ? "Video + AI" : booking.session_type} Session
                    </span>
                    <Badge className={`text-[10px] ${statusColors[booking.booking_status] || ""}`}>
                      {booking.booking_status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                    {booking.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        Scheduled: {new Date(booking.scheduled_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-heading font-bold text-sm">${Number(booking.total_amount)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {booking.payment_status === "paid" ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                  {/* Join Call button for confirmed/in_progress bookings */}
                  {(booking.booking_status === "confirmed" || booking.booking_status === "in_progress") && (
                    <Button
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => navigate(`/video-call?bookingId=${booking.id}&role=${isAdmin ? "admin" : "customer"}`)}
                    >
                      <PhoneCall size={12} /> Join Call
                    </Button>
                  )}
                  {isAdmin && booking.booking_status === "confirmed" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => handleStatusUpdate(booking.id, "in_progress")}
                      >
                        Start
                      </Button>
                    </div>
                  )}
                  {isAdmin && booking.booking_status === "in_progress" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleStatusUpdate(booking.id, "completed")}
                    >
                      Complete
                    </Button>
                  )}
                  {isAdmin && booking.booking_status === "pending_payment" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-destructive"
                      onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                    >
                      <XCircle size={12} className="mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MeasurementBookingsTab;
