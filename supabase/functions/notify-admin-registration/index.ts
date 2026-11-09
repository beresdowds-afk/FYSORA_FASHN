import "https://deno.land/std@0.168.0/dotenv/load.ts";
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


  // --- Require authenticated user ---
  const _authHeader = req.headers.get("Authorization");
  if (!_authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let authUser: { id: string; email?: string | null } | null = null;
  try {
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: _authHeader } } }
    );
    const { data: _authData, error: _authError } = await _authClient.auth.getUser();
    if (_authError || !_authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    authUser = _authData.user;
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  // --- end auth ---

  try {
    // Only org_id is read from the body. The registrant identity comes from the JWT and
    // display fields from the database, so callers cannot inject text into notifications.
    const { org_id } = await req.json();

    if (!org_id) {
      return new Response(
        JSON.stringify({ error: "Missing org_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Caller must be a member of, or have registered with, the target org.
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: authUser!.id, _org_id: org_id });
    let allowed = !!isMember;
    if (!allowed) {
      const { data: reg } = await supabaseAdmin
        .from("customer_registrations").select("id")
        .eq("org_id", org_id).eq("user_id", authUser!.id).maybeSingle();
      allowed = !!reg;
    }
    if (!allowed) {
      console.warn("notify-admin-registration: forbidden", { user: authUser!.id });
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("display_name").eq("id", authUser!.id).maybeSingle();
    const user_name = profile?.display_name || null;
    const user_email = authUser!.email || null;
    const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    // Get org admins
    const { data: admins } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", org_id)
      .eq("role", "org_admin")
      .eq("is_active", true);

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org details
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, email")
      .eq("id", org_id)
      .single();

    const orgEmail = org?.email;
    const displayOrgName = org?.name || "Your Organization";

    // Create in-app notifications for each admin
    for (const admin of admins) {
      await supabaseAdmin.from("notifications").insert({
        org_id,
        user_id: admin.user_id,
        title: "New Customer Registration",
        message: `${user_name || user_email || "A new customer"} has registered via invite code for ${displayOrgName}.`,
      });
    }

    // Send email to org email if configured
    if (orgEmail) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const { data: settings } = await supabaseAdmin
          .from("org_notification_settings")
          .select("email_enabled, brand_color")
          .eq("org_id", org_id)
          .maybeSingle();

        if (settings?.email_enabled) {
          const brandColor = settings.brand_color || "#000000";
          const html = `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f0f0;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                  <div style="height: 4px; background: ${brandColor};"></div>
                  <div style="padding: 32px;">
                    <h2 style="color: ${brandColor}; margin: 0 0 8px;">New Customer Registration</h2>
                    <p style="margin: 0 0 16px; color: #555;">A new customer has registered for <strong>${esc(displayOrgName)}</strong> using an invite code.</p>
                    <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
                      <p style="margin: 0; font-size: 14px; color: #555;"><strong>Customer:</strong> ${esc(user_name || "N/A")}</p>
                      ${user_email ? `<p style="margin: 4px 0 0; font-size: 14px; color: #555;"><strong>Email:</strong> ${esc(user_email)}</p>` : ""}
                    </div>
                    <p style="margin: 0; color: #555;">You can view and manage this registration in your dashboard.</p>
                  </div>
                  <div style="padding: 20px 32px; background: #fafafa; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-size: 12px; color: #999;">${esc(displayOrgName)}</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev",
              to: [orgEmail],
              subject: `New Customer Registration — ${displayOrgName}`,
              html,
            }),
          });

          // Log message
          await supabaseAdmin.from("message_logs").insert({
            org_id,
            channel: "email",
            recipient_type: "org_admin",
            recipient_id: admins[0].user_id,
            recipient_contact: orgEmail,
            event_type: "customer_registration",
            subject: `New Customer Registration — ${displayOrgName}`,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-admin-registration error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
