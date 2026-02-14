import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find orders due within 48 hours that haven't been delivered/completed/cancelled
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, org_id, customer_id, assigned_tailor_id, order_number, title, due_date, currency, status")
      .not("status", "in", '("completed","delivered","cancelled")')
      .not("due_date", "is", null)
      .lte("due_date", in48h.toISOString().split("T")[0])
      .gte("due_date", now.toISOString().split("T")[0]);

    if (ordersErr) {
      console.error("Error fetching orders:", ordersErr);
      return new Response(JSON.stringify({ error: ordersErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "No orders due within 48 hours" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dispatched = 0;

    for (const order of orders) {
      // Check org notification settings
      const { data: settings } = await supabase
        .from("org_notification_settings")
        .select("*")
        .eq("org_id", order.org_id)
        .maybeSingle();

      if (!settings) continue;

      const { data: org } = await supabase
        .from("organizations")
        .select("name, email, phone")
        .eq("id", order.org_id)
        .single();

      const orgName = org?.name || "Your Organization";
      const subject = `Reminder: Order ${order.order_number} Due Soon`;
      const smsMessage = `[${orgName}] Reminder: Order ${order.order_number} "${order.title}" is due soon.`;

      // Send email
      if (settings.email_enabled && org?.email) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            to: org.email,
            subject,
            event_type: "due_date_reminder",
            order_number: order.order_number,
            order_title: order.title,
            org_name: orgName,
            brand_color: settings.brand_color,
            email_footer_text: settings.email_footer_text,
            org_id: order.org_id,
            order_id: order.id,
            recipient_type: "org_admin",
          }),
        });
        dispatched++;
      }

      // Send SMS
      if (settings.sms_enabled && org?.phone) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            to: org.phone,
            message: smsMessage,
            event_type: "due_date_reminder",
            org_id: order.org_id,
            order_id: order.id,
            recipient_type: "org_admin",
          }),
        });
        dispatched++;
      }

      // Send WhatsApp
      if (settings.whatsapp_enabled && org?.phone) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            to: org.phone,
            message: smsMessage,
            event_type: "due_date_reminder",
            org_id: order.org_id,
            order_id: order.id,
            recipient_type: "org_admin",
          }),
        });
        dispatched++;
      }

      // Also create in-app notification for assigned tailor
      if (settings.notify_assigned_tailor && order.assigned_tailor_id) {
        await supabase.from("notifications").insert({
          org_id: order.org_id,
          user_id: order.assigned_tailor_id,
          order_id: order.id,
          title: "Due Date Reminder",
          message: `Order ${order.order_number} "${order.title}" is due soon.`,
        });
      }

      // In-app notification for admins
      if (settings.notify_org_admin) {
        const { data: admins } = await supabase
          .from("org_members")
          .select("user_id")
          .eq("org_id", order.org_id)
          .eq("role", "org_admin")
          .eq("is_active", true);

        if (admins) {
          for (const admin of admins) {
            await supabase.from("notifications").insert({
              org_id: order.org_id,
              user_id: admin.user_id,
              order_id: order.id,
              title: "Due Date Reminder",
              message: `Order ${order.order_number} "${order.title}" is due soon.`,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, orders_checked: orders.length, notifications_dispatched: dispatched }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("due-date-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
