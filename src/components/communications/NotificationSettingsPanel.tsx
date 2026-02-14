import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Phone, Users, Palette } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  orgId: string;
  isAdmin: boolean;
}

const NotificationSettingsPanel = ({ orgId, isAdmin }: Props) => {
  const { settings, isLoading, upsertSettings } = useNotificationSettings(orgId);

  const [form, setForm] = useState({
    email_enabled: false,
    sms_enabled: false,
    whatsapp_enabled: false,
    notify_customer: true,
    notify_org_admin: true,
    notify_assigned_tailor: true,
    brand_color: "#000000",
    email_footer_text: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        email_enabled: settings.email_enabled,
        sms_enabled: settings.sms_enabled,
        whatsapp_enabled: settings.whatsapp_enabled,
        notify_customer: settings.notify_customer,
        notify_org_admin: settings.notify_org_admin,
        notify_assigned_tailor: settings.notify_assigned_tailor,
        brand_color: settings.brand_color || "#000000",
        email_footer_text: settings.email_footer_text || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    upsertSettings.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Channels */}
      <section className="rounded-xl bg-card border border-border p-6">
        <h3 className="font-heading font-semibold text-lg mb-4">Communication Channels</h3>
        <p className="text-sm text-muted-foreground mb-6">Toggle which channels your organization uses to send notifications.</p>
        <div className="space-y-4">
          {[
            { key: "email_enabled" as const, icon: Mail, label: "Email", desc: "Order updates, invoices, and reminders via email" },
            { key: "sms_enabled" as const, icon: Phone, label: "SMS", desc: "Text message alerts for status changes" },
            { key: "whatsapp_enabled" as const, icon: MessageSquare, label: "WhatsApp", desc: "Customer messaging via WhatsApp Business" },
          ].map((ch) => (
            <div key={ch.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <ch.icon size={20} className="text-primary" />
                <div>
                  <p className="text-sm font-medium">{ch.label}</p>
                  <p className="text-xs text-muted-foreground">{ch.desc}</p>
                </div>
              </div>
              <Switch
                checked={form[ch.key]}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, [ch.key]: v }))}
                disabled={!isAdmin}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Recipients */}
      <section className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg">Notification Recipients</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Choose who receives notifications for order and payment events.</p>
        <div className="space-y-3">
          {[
            { key: "notify_customer" as const, label: "Customers", desc: "Notify customers about their order status and payments" },
            { key: "notify_org_admin" as const, label: "Org Admins", desc: "Notify organization admins about all events" },
            { key: "notify_assigned_tailor" as const, label: "Assigned Tailors", desc: "Notify tailors about orders assigned to them" },
          ].map((r) => (
            <div key={r.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                checked={form[r.key]}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, [r.key]: v }))}
                disabled={!isAdmin}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Branding */}
      <section className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg">Email Branding</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Customize the look of outgoing emails with your brand.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand_color">Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="brand_color"
                value={form.brand_color}
                onChange={(e) => setForm((prev) => ({ ...prev, brand_color: e.target.value }))}
                className="w-10 h-10 rounded border border-border cursor-pointer"
                disabled={!isAdmin}
              />
              <Input
                value={form.brand_color}
                onChange={(e) => setForm((prev) => ({ ...prev, brand_color: e.target.value }))}
                className="flex-1"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="footer">Email Footer Text</Label>
            <Textarea
              id="footer"
              placeholder="e.g. Thank you for choosing our services. Follow us @handle"
              value={form.email_footer_text}
              onChange={(e) => setForm((prev) => ({ ...prev, email_footer_text: e.target.value }))}
              rows={3}
              disabled={!isAdmin}
            />
          </div>
        </div>
      </section>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={upsertSettings.isPending} variant="default">
            {upsertSettings.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettingsPanel;
