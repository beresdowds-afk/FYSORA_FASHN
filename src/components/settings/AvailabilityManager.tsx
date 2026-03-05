import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_bookings_per_slot: number;
  is_active: boolean;
}

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
}

const AvailabilityManager = ({ orgId }: { orgId: string }) => {
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  const fetchData = async () => {
    const [{ data: slotsData }, { data: blockedData }] = await Promise.all([
      supabase.from("availability_slots").select("*").eq("org_id", orgId).order("day_of_week"),
      supabase.from("blocked_dates").select("*").eq("org_id", orgId).order("blocked_date"),
    ]);
    setSlots((slotsData as Slot[]) || []);
    setBlockedDates((blockedData as BlockedDate[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [orgId]);

  const addSlot = async (dayOfWeek: number) => {
    const { error } = await supabase.from("availability_slots").insert({
      org_id: orgId,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00",
      slot_duration_minutes: 60,
      max_bookings_per_slot: 1,
    } as any);
    if (!error) {
      toast({ title: `${DAYS[dayOfWeek]} slot added` });
      fetchData();
    }
  };

  const updateSlot = async (id: string, updates: Partial<Slot>) => {
    await supabase.from("availability_slots").update(updates as any).eq("id", id);
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSlot = async (id: string) => {
    await supabase.from("availability_slots").delete().eq("id", id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Slot removed" });
  };

  const addBlockedDate = async () => {
    if (!newBlockDate) return;
    const { error } = await supabase.from("blocked_dates").insert({
      org_id: orgId,
      blocked_date: newBlockDate,
      reason: newBlockReason || null,
    } as any);
    if (!error) {
      setNewBlockDate("");
      setNewBlockReason("");
      toast({ title: "Date blocked" });
      fetchData();
    }
  };

  const removeBlockedDate = async (id: string) => {
    await supabase.from("blocked_dates").delete().eq("id", id);
    setBlockedDates((prev) => prev.filter((d) => d.id !== id));
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <Calendar size={18} className="text-primary" /> Appointment Availability
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Configure which days and times customers can book appointments.
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-3">
        {DAYS.map((day, dayIndex) => {
          const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
          return (
            <div key={day} className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{day}</span>
                <Button variant="ghost" size="sm" onClick={() => addSlot(dayIndex)} className="gap-1 text-xs">
                  <Plus size={12} /> Add Slot
                </Button>
              </div>
              {daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No availability — closed</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-muted-foreground" />
                        <Input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => updateSlot(slot.id, { start_time: e.target.value })}
                          className="w-[110px] text-xs h-8"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => updateSlot(slot.id, { end_time: e.target.value })}
                          className="w-[110px] text-xs h-8"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">Duration</Label>
                        <Input
                          type="number"
                          min={15}
                          step={15}
                          value={slot.slot_duration_minutes}
                          onChange={(e) => updateSlot(slot.id, { slot_duration_minutes: parseInt(e.target.value) || 60 })}
                          className="w-[60px] text-xs h-8"
                        />
                        <span className="text-[10px] text-muted-foreground">min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          min={1}
                          value={slot.max_bookings_per_slot}
                          onChange={(e) => updateSlot(slot.id, { max_bookings_per_slot: parseInt(e.target.value) || 1 })}
                          className="w-[50px] text-xs h-8"
                        />
                      </div>
                      <Switch
                        checked={slot.is_active}
                        onCheckedChange={(checked) => updateSlot(slot.id, { is_active: checked })}
                      />
                      <Button variant="ghost" size="sm" onClick={() => deleteSlot(slot.id)} className="h-8 w-8 p-0 text-destructive">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blocked Dates */}
      <div className="rounded-xl bg-card border border-border p-5">
        <h4 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <X size={14} className="text-destructive" /> Blocked Dates
        </h4>
        <p className="text-xs text-muted-foreground mb-4">Block specific dates (holidays, closures).</p>
        <div className="flex gap-2 mb-4">
          <Input
            type="date"
            value={newBlockDate}
            onChange={(e) => setNewBlockDate(e.target.value)}
            className="w-[160px] text-sm"
          />
          <Input
            placeholder="Reason (optional)"
            value={newBlockReason}
            onChange={(e) => setNewBlockReason(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button variant="outline" size="sm" onClick={addBlockedDate}>Block</Button>
        </div>
        {blockedDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((bd) => (
              <Badge key={bd.id} variant="secondary" className="cursor-pointer gap-1" onClick={() => removeBlockedDate(bd.id)}>
                {new Date(bd.blocked_date).toLocaleDateString()}
                {bd.reason && ` — ${bd.reason}`}
                <X size={10} />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AvailabilityManager;
