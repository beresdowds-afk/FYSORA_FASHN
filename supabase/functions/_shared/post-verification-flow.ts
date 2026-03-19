/**
 * Unified Post-Verification Flow
 * Handles: Invoice creation → Ledger entry → Notifications → Service activation/approval
 * Used by ALL verify-* edge functions for consistency.
 */

interface PostVerificationParams {
  serviceClient: any;
  orgId: string;
  userId: string;
  serviceType: "order" | "website_builder" | "registration" | "measurement" | "subscription";
  amount: number;
  currency: string;
  gateway: string;
  gatewayReference: string;
  relatedEntityId: string;
  description: string;
  requiresApproval: boolean;
  metadata?: Record<string, any>;
}

interface PostVerificationResult {
  invoiceNumber: string;
  invoiceId: string;
  activated: boolean;
}

export async function runPostVerificationFlow(params: PostVerificationParams): Promise<PostVerificationResult> {
  const {
    serviceClient, orgId, userId, serviceType, amount, currency,
    gateway, gatewayReference, relatedEntityId, description,
    requiresApproval, metadata = {},
  } = params;

  // 1. Generate invoice number
  const prefix = {
    order: "PAY", website_builder: "WB", registration: "REG",
    measurement: "MEAS", subscription: "SUB",
  }[serviceType];
  const invoiceNumber = `INV-${prefix}-${Date.now().toString(36).toUpperCase()}`;

  // 2. Create subscription invoice record
  const { data: invoice } = await serviceClient.from("subscription_invoices").insert({
    org_id: orgId,
    user_id: userId,
    invoice_number: invoiceNumber,
    invoice_type: serviceType === "order" ? "subscription" : serviceType,
    description,
    amount,
    currency,
    status: "paid",
    payment_method: gateway,
    gateway_reference: gatewayReference,
    related_entity_type: serviceType === "order" ? "order" : `${serviceType}_request`,
    related_entity_id: relatedEntityId,
    paid_at: new Date().toISOString(),
  }).select("id").single();

  // 3. Create audit log
  await serviceClient.from("audit_logs").insert({
    user_id: userId,
    action: `payment_verified_${serviceType}`,
    entity_type: serviceType,
    entity_id: relatedEntityId,
    org_id: orgId,
    new_data: {
      invoice_number: invoiceNumber,
      amount, currency, gateway, gateway_reference: gatewayReference,
      requires_approval: requiresApproval,
      ...metadata,
    },
  });

  // 4. Get org details for notifications
  const { data: orgData } = await serviceClient
    .from("organizations")
    .select("name, email")
    .eq("id", orgId)
    .single();

  // 5. Notify org admins
  const { data: orgAdmins } = await serviceClient
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .in("role", ["org_admin", "manager"])
    .eq("is_active", true);

  const statusLabel = requiresApproval ? "pending admin approval" : "activated";
  for (const admin of orgAdmins || []) {
    await serviceClient.from("notifications").insert({
      org_id: orgId,
      user_id: admin.user_id,
      title: `Payment Confirmed — ${description}`,
      message: `Payment of ${currency} ${amount.toLocaleString()} verified via ${gateway}. Invoice: ${invoiceNumber}. Service is ${statusLabel}.`,
    });
  }

  // 6. If requires approval, notify super admins
  if (requiresApproval) {
    const { data: superAdmins } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    for (const sa of superAdmins || []) {
      await serviceClient.from("notifications").insert({
        org_id: orgId,
        user_id: sa.user_id,
        title: `Approval Required — ${orgData?.name || "Unknown Org"}`,
        message: `${description} payment confirmed (${invoiceNumber}). Amount: ${currency} ${amount.toLocaleString()}. Awaiting your approval for service activation.`,
      });
    }
  }

  // 7. Send email confirmation (fire-and-forget)
  if (orgData?.email) {
    const { data: notifSettings } = await serviceClient
      .from("org_notification_settings")
      .select("brand_color, email_footer_text, email_enabled")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!notifSettings || notifSettings.email_enabled !== false) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: orgData.email,
          subject: `Payment Confirmed — ${invoiceNumber}`,
          event_type: `${serviceType}_payment_confirmed`,
          org_name: orgData.name,
          org_id: orgId,
          recipient_id: orgAdmins?.[0]?.user_id || userId,
          recipient_type: "org_admin",
          brand_color: notifSettings?.brand_color || "#D4AF37",
          email_footer_text: notifSettings?.email_footer_text,
          template_data: {
            invoice_number: invoiceNumber,
            amount: `${currency} ${amount.toLocaleString()}`,
            service: description,
            status: statusLabel,
            gateway,
          },
        }),
      }).catch((e) => console.error("Email dispatch failed:", e));
    }
  }

  return {
    invoiceNumber,
    invoiceId: invoice?.id || "",
    activated: !requiresApproval,
  };
}
