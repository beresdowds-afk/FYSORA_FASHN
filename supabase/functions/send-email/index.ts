import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("RESEND_FROM_NAME") || "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa)";

    const {
      to, subject, event_type, order_number, order_title,
      new_status, old_status, amount, currency,
      org_name, brand_color, email_footer_text, recipient_name,
      org_id, order_id, recipient_id, recipient_type,
      html_body, reply_to,
    } = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const brandColor = brand_color || "#000000";
    const footerText = email_footer_text || `Thank you for choosing ${org_name || "our services"}.`;

    // Build HTML email content based on event type
    let contentBlock = "";
    if (html_body) {
      contentBlock = html_body;
    } else if (event_type === "order_status_change") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Order Status Updated</h2>
        <p style="margin: 0 0 16px; color: #555;">Your order <strong>${order_number || ""}</strong> — "${order_title || ""}" has been updated.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px; background: #f5f5f5; border-radius: 8px;">
              <span style="color: #888; font-size: 12px;">Previous Status</span><br/>
              <strong style="font-size: 16px; text-transform: capitalize;">${old_status || "N/A"}</strong>
            </td>
            <td style="padding: 12px; text-align: center; font-size: 20px;">→</td>
            <td style="padding: 12px; background: ${brandColor}10; border-radius: 8px;">
              <span style="color: #888; font-size: 12px;">New Status</span><br/>
              <strong style="font-size: 16px; color: ${brandColor}; text-transform: capitalize;">${new_status || ""}</strong>
            </td>
          </tr>
        </table>`;
    } else if (event_type === "payment_received") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Payment Received</h2>
        <p style="margin: 0 0 16px; color: #555;">A payment has been recorded for order <strong>${order_number || ""}</strong>.</p>
        <div style="padding: 16px; background: ${brandColor}10; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 14px; color: #888;">Amount Paid</span><br/>
          <strong style="font-size: 28px; color: ${brandColor};">${currency || ""} ${(amount || 0).toLocaleString()}</strong>
        </div>`;
    } else if (event_type === "due_date_reminder") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Due Date Reminder</h2>
        <p style="margin: 0 0 16px; color: #555;">Order <strong>${order_number || ""}</strong> — "${order_title || ""}" is approaching its due date.</p>`;
    } else if (event_type === "measurement_confirmed") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">AI Measurement Session Confirmed</h2>
        <p style="margin: 0 0 16px; color: #555;">Your AI-powered measurement session has been confirmed.</p>
        <div style="padding: 16px; background: ${brandColor}10; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #555;"><strong>Duration:</strong> ${amount || 1} hour(s)</p>
          ${old_status ? `<p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>Scheduled:</strong> ${old_status}</p>` : ""}
        </div>
        <p style="margin: 0; color: #555;">You'll receive a video call link before your session begins.</p>`;
    } else if (event_type === "measurement_completed") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">AI Measurement Session Completed</h2>
        <p style="margin: 0 0 16px; color: #555;">Your AI measurement session has been completed successfully.</p>
        <p style="margin: 0; color: #555;">Your measurements are now on file and ready for use in your next order.</p>`;
    } else if (event_type === "website_lite_activated") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Website Builder Lite Activated!</h2>
        <p style="margin: 0 0 16px; color: #555;">Your Website Builder Lite plan is now active.</p>
        <div style="padding: 16px; background: ${brandColor}10; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #555;"><strong>Plan:</strong> Website Builder Lite</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>Monthly fee:</strong> $17/month</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>Trial period:</strong> 6 months</p>
        </div>
        <p style="margin: 0; color: #555;">Your public website is now live!</p>`;
    } else if (event_type === "website_pro_confirmed") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Website Builder Pro — Payment Confirmed!</h2>
        <p style="margin: 0 0 16px; color: #555;">Your Website Builder Pro purchase has been confirmed.</p>
        <div style="padding: 16px; background: ${brandColor}10; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #555;"><strong>Plan:</strong> Website Builder Pro</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>One-time fee:</strong> $199</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>Monthly maintenance:</strong> $7/month</p>
        </div>
        <p style="margin: 0; color: #555;">Our team will contact you within 24 hours.</p>`;
    } else if (event_type === "website_pro_request") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">🔔 New Pro Website Request</h2>
        <p style="margin: 0 0 16px; color: #555;">A new Website Builder Pro request has been submitted.</p>
        <div style="padding: 16px; background: #fff3cd; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #555;"><strong>Organization:</strong> ${org_name || "Unknown"}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>Amount paid:</strong> ${currency || "USD"} ${(amount || 0).toLocaleString()}</p>
        </div>`;
    } else if (event_type === "dispute_filed") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">New Dispute Filed</h2>
        <p style="margin: 0 0 16px; color: #555;">A new dispute has been filed regarding order <strong>${order_number || "N/A"}</strong>.</p>
        <p style="margin: 0; color: #555;">Please review the dispute from your dashboard.</p>`;
    } else if (event_type === "dispute_resolved") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Dispute Resolved</h2>
        <p style="margin: 0 0 16px; color: #555;">The dispute regarding order <strong>${order_number || "N/A"}</strong> has been resolved.</p>
        <p style="margin: 0; color: #555;">Resolution: ${new_status || "See dashboard for details"}</p>`;
    } else if (event_type === "shipment_update") {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">Shipment Update</h2>
        <p style="margin: 0 0 16px; color: #555;">Your shipment for order <strong>${order_number || ""}</strong> has a new status.</p>
        <div style="padding: 16px; background: ${brandColor}10; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px; text-transform: capitalize;"><strong>Status:</strong> ${new_status || ""}</p>
        </div>`;
    } else if (event_type === "delivery_exception") {
      contentBlock = `
        <h2 style="color: #dc2626; margin: 0 0 8px;">⚠️ Delivery Exception</h2>
        <p style="margin: 0 0 16px; color: #555;">There's an issue with the delivery of order <strong>${order_number || ""}</strong>.</p>
        <p style="margin: 0; color: #555;">Our team is investigating. We'll update you shortly.</p>`;
    } else {
      contentBlock = `
        <h2 style="color: ${brandColor}; margin: 0 0 8px;">${subject}</h2>
        <p style="margin: 0 0 16px; color: #555;">You have a new notification from ${org_name || "your organization"}.</p>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f0f0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="height: 4px; background: ${brandColor};"></div>
            <div style="padding: 32px;">
              ${recipient_name ? `<p style="margin: 0 0 20px; color: #333;">Hi ${recipient_name},</p>` : ""}
              ${contentBlock}
            </div>
            <div style="padding: 20px 32px; background: #fafafa; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">${footerText}</p>
              ${org_name ? `<p style="margin: 4px 0 0; font-size: 12px; color: #bbb;">${org_name}</p>` : ""}
            </div>
          </div>
        </div>
      </body>
      </html>`;

    const emailPayload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    };
    if (reply_to) emailPayload.reply_to = reply_to;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendRes.json();
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!resendRes.ok) {
      console.error("Resend API error:", JSON.stringify(resendData));
      if (org_id) {
        await supabaseAdmin.from("message_logs").insert({
          org_id, order_id: order_id || null, channel: "email",
          recipient_type: recipient_type || "customer",
          recipient_id: recipient_id || "00000000-0000-0000-0000-000000000000",
          recipient_contact: to, event_type: event_type || "general",
          subject, body: contentBlock, status: "failed",
          error_message: "Email delivery failed",
        });
      }
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org_id) {
      await supabaseAdmin.from("message_logs").insert({
        org_id, order_id: order_id || null, channel: "email",
        recipient_type: recipient_type || "customer",
        recipient_id: recipient_id || "00000000-0000-0000-0000-000000000000",
        recipient_contact: to, event_type: event_type || "general",
        subject, status: "sent",
        external_id: resendData.id || null, sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: "An internal error occurred while sending email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
