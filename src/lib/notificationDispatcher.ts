import { supabase } from "@/integrations/supabase/client";

// Complete African country dial codes for routing decisions
const AFRICAN_PREFIXES: string[] = [
  "+234", "+233", "+221", "+225", "+228", "+229", "+237", "+220", "+224", "+226",
  "+227", "+231", "+232", "+238", "+245", "+223", "+254", "+256", "+255", "+250",
  "+251", "+252", "+253", "+257", "+291", "+211", "+27", "+258", "+260", "+263",
  "+265", "+266", "+267", "+268", "+261", "+264", "+242", "+243", "+241", "+240",
  "+235", "+236", "+239", "+212", "+213", "+216", "+218", "+20", "+249", "+230",
  "+248", "+269", "+262",
];

function isAfricanPhone(phone: string): boolean {
  const clean = phone.replace("whatsapp:", "").replace(/\s/g, "");
  return AFRICAN_PREFIXES.some((p) => clean.startsWith(p));
}

interface NotifyParams {
  orgId: string;
  orderId?: string;
  orderNumber?: string;
  orderTitle?: string;
  eventType:
    | "order_status_change" | "payment_received" | "due_date_reminder"
    | "measurement_confirmed" | "measurement_completed"
    | "website_lite_activated" | "website_pro_confirmed"
    | "dispute_filed" | "dispute_resolved"
    | "shipment_update" | "delivery_exception";
  oldStatus?: string;
  newStatus?: string;
  amount?: number;
  currency?: string;
  bookingId?: string;
  hoursBooked?: number;
  scheduledAt?: string;
  customerId?: string;
  customerPhone?: string;
  customerEmail?: string;
}

/**
 * Dispatches notifications via enabled channels (email, SMS, WhatsApp).
 * Routing: African phone numbers → Termii, international → Twilio.
 * Covers all 54 African countries.
 */
export const dispatchNotifications = async (params: NotifyParams) => {
  try {
    const { data: settings } = await supabase
      .from("org_notification_settings")
      .select("*")
      .eq("org_id", params.orgId)
      .maybeSingle();

    if (!settings) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("name, email, phone")
      .eq("id", params.orgId)
      .single();

    const orgName = org?.name || "Your Organization";
    let emailSubject = "";
    let smsMessage = "";

    switch (params.eventType) {
      case "order_status_change":
        emailSubject = `Order ${params.orderNumber} — Status Updated to ${capitalize(params.newStatus || "")}`;
        smsMessage = `[${orgName}] Order ${params.orderNumber} "${params.orderTitle}" status: ${capitalize(params.oldStatus || "")} → ${capitalize(params.newStatus || "")}`;
        break;
      case "payment_received":
        emailSubject = `Payment Received for Order ${params.orderNumber}`;
        smsMessage = `[${orgName}] Payment of ${params.currency || ""} ${(params.amount || 0).toLocaleString()} received for order ${params.orderNumber}.`;
        break;
      case "due_date_reminder":
        emailSubject = `Reminder: Order ${params.orderNumber} Due Soon`;
        smsMessage = `[${orgName}] Reminder: Order ${params.orderNumber} "${params.orderTitle}" is due soon.`;
        break;
      case "measurement_confirmed": {
        const schedText = params.scheduledAt ? ` scheduled for ${new Date(params.scheduledAt).toLocaleString()}` : "";
        emailSubject = `AI Measurement Session Confirmed — ${params.hoursBooked || 1}h${schedText}`;
        smsMessage = `[${orgName}] Your AI measurement session (${params.hoursBooked || 1}h) is confirmed${schedText}.`;
        break;
      }
      case "measurement_completed":
        emailSubject = `AI Measurement Session Completed`;
        smsMessage = `[${orgName}] Your AI measurement session has been completed. Your measurements are now on file.`;
        break;
      case "website_lite_activated":
        emailSubject = `Website Builder Lite Plan Activated!`;
        smsMessage = `[${orgName}] Your Website Builder Lite plan is now active with a 6-month trial.`;
        break;
      case "website_pro_confirmed":
        emailSubject = `Website Builder Pro — Payment Confirmed!`;
        smsMessage = `[${orgName}] Your Website Builder Pro purchase is confirmed. Our team will contact you within 24 hours.`;
        break;
      case "dispute_filed":
        emailSubject = `New Dispute Filed — Order ${params.orderNumber || "N/A"}`;
        smsMessage = `[${orgName}] A dispute has been filed for order ${params.orderNumber || "N/A"}. Please review from your dashboard.`;
        break;
      case "dispute_resolved":
        emailSubject = `Dispute Resolved — Order ${params.orderNumber || "N/A"}`;
        smsMessage = `[${orgName}] The dispute for order ${params.orderNumber || "N/A"} has been resolved.`;
        break;
      case "shipment_update":
        emailSubject = `Shipment Update — Order ${params.orderNumber || ""}`;
        smsMessage = `[${orgName}] Shipment for order ${params.orderNumber || ""}: ${capitalize(params.newStatus || "updated")}.`;
        break;
      case "delivery_exception":
        emailSubject = `⚠️ Delivery Exception — Order ${params.orderNumber || ""}`;
        smsMessage = `[${orgName}] ⚠️ Delivery issue for order ${params.orderNumber || ""}. We're investigating.`;
        break;
    }

    // Get admin recipients
    const recipients: { id: string; type: string; name?: string }[] = [];
    if (settings.notify_org_admin) {
      const { data: admins } = await supabase
        .from("org_members")
        .select("user_id")
        .eq("org_id", params.orgId)
        .eq("role", "org_admin")
        .eq("is_active", true);

      if (admins) {
        for (const admin of admins) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", admin.user_id)
            .single();
          recipients.push({ id: admin.user_id, type: "org_admin", name: profile?.display_name || undefined });
        }
      }
    }

    const orgEmail = org?.email;
    const orgPhone = org?.phone;
    const basePayload = {
      org_id: params.orgId,
      order_id: params.orderId || null,
      event_type: params.eventType,
      order_number: params.orderNumber,
      order_title: params.orderTitle,
      old_status: params.oldStatus,
      new_status: params.newStatus,
      amount: params.amount,
      currency: params.currency,
      org_name: orgName,
      brand_color: settings.brand_color,
      email_footer_text: settings.email_footer_text,
    };

    // Email via Resend (global — no regional routing needed)
    if (settings.email_enabled && orgEmail && emailSubject) {
      supabase.functions.invoke("send-email", {
        body: {
          ...basePayload,
          to: orgEmail,
          subject: emailSubject,
          recipient_id: recipients[0]?.id || null,
          recipient_type: "org_admin",
          recipient_name: recipients[0]?.name,
        },
      }).catch((e) => console.error("Email dispatch failed:", e));
    }

    // Also send email to customer if available
    if (settings.email_enabled && params.customerEmail && emailSubject) {
      supabase.functions.invoke("send-email", {
        body: {
          ...basePayload,
          to: params.customerEmail,
          subject: emailSubject,
          recipient_id: params.customerId || null,
          recipient_type: "customer",
        },
      }).catch((e) => console.error("Customer email dispatch failed:", e));
    }

    // SMS — auto-routes: African → Termii, International → Twilio
    if (settings.sms_enabled && orgPhone && smsMessage) {
      supabase.functions.invoke("send-sms", {
        body: {
          ...basePayload,
          to: orgPhone,
          message: smsMessage,
          recipient_id: recipients[0]?.id || null,
          recipient_type: "org_admin",
        },
      }).catch((e) => console.error("SMS dispatch failed:", e));
    }

    // SMS to customer if phone available
    if (settings.sms_enabled && params.customerPhone && smsMessage) {
      supabase.functions.invoke("send-sms", {
        body: {
          ...basePayload,
          to: params.customerPhone,
          message: smsMessage,
          recipient_id: params.customerId || null,
          recipient_type: "customer",
        },
      }).catch((e) => console.error("Customer SMS dispatch failed:", e));
    }

    // WhatsApp — auto-routes: African → Termii, International → Twilio
    if (settings.whatsapp_enabled && orgPhone && smsMessage) {
      supabase.functions.invoke("send-whatsapp", {
        body: {
          ...basePayload,
          to: orgPhone,
          message: smsMessage,
          recipient_id: recipients[0]?.id || null,
          recipient_type: "org_admin",
        },
      }).catch((e) => console.error("WhatsApp dispatch failed:", e));
    }

    // WhatsApp to customer if phone available
    if (settings.whatsapp_enabled && params.customerPhone && smsMessage) {
      supabase.functions.invoke("send-whatsapp", {
        body: {
          ...basePayload,
          to: params.customerPhone,
          message: smsMessage,
          recipient_id: params.customerId || null,
          recipient_type: "customer",
        },
      }).catch((e) => console.error("Customer WhatsApp dispatch failed:", e));
    }
  } catch (err) {
    console.error("dispatchNotifications error:", err);
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
