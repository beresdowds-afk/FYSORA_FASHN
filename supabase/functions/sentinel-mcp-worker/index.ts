import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Supported MCP tool mappings per event domain
const EVENT_TOOL_MAP: Record<string, string> = {
  // Website lifecycle
  "website.build_requested": "fsa_website_build",
  "website.published": "fsa_website_publish",
  "website.updated": "fsa_website_update",
  "website.domain_provisioned": "fsa_domain_provision",
  // Order lifecycle
  "order.created": "fsa_order_created",
  "order.status_changed": "fsa_order_status",
  "order.completed": "fsa_order_completed",
  "order.cancelled": "fsa_order_cancelled",
  // Payment lifecycle
  "payment.received": "fsa_payment_received",
  "payment.verified": "fsa_payment_verified",
  "payment.failed": "fsa_payment_failed",
  "payment.refunded": "fsa_payment_refunded",
  // Customer lifecycle
  "customer.registered": "fsa_customer_registered",
  "customer.measurement_booked": "fsa_measurement_booked",
  "customer.dispute_filed": "fsa_dispute_filed",
  // Communication events
  "comms.message_sent": "fsa_message_sent",
  "comms.notification_dispatched": "fsa_notification_dispatch",
  // AI/Premium features
  "ai.job_queued": "fsa_ai_job_queued",
  "ai.job_completed": "fsa_ai_job_completed",
  "ai.tryon_requested": "fsa_tryon_request",
  // Logistics
  "logistics.shipment_created": "fsa_shipment_created",
  "logistics.delivery_flagged": "fsa_delivery_flagged",
  "logistics.shipment_delivered": "fsa_shipment_delivered",
  // Catalogue
  "catalogue.item_added": "fsa_catalogue_item_added",
  "catalogue.item_updated": "fsa_catalogue_item_updated",
  "catalogue.featured_slot_booked": "fsa_featured_slot",
  // Contract events
  "contract.created": "fsa_contract_created",
  "contract.payment_recorded": "fsa_contract_payment",
  // Org lifecycle
  "org.created": "fsa_org_created",
  "org.member_joined": "fsa_member_joined",
  "org.subscription_changed": "fsa_subscription_changed",
  // Rental domain
  "rental.listing_created": "rental_listing_created",
  "rental.booking_confirmed": "rental_booking_confirmed",
  "rental.payment_received": "rental_payment_received",
  "rental.maintenance_requested": "rental_maintenance_request",
  // Real estate domain
  "realestate.property_listed": "realestate_property_listed",
  "realestate.viewing_scheduled": "realestate_viewing_scheduled",
  "realestate.offer_submitted": "realestate_offer_submitted",
  // Hospitality domain
  "hospitality.reservation_created": "hospitality_reservation_created",
  "hospitality.guest_checked_in": "hospitality_guest_checkin",
  "hospitality.service_requested": "hospitality_service_request",
};

// Domain-to-events mapping
const DOMAIN_EVENTS: Record<string, string[]> = {
  fashion: Object.keys(EVENT_TOOL_MAP).filter(
    (e) =>
      e.startsWith("website.") ||
      e.startsWith("order.") ||
      e.startsWith("payment.") ||
      e.startsWith("customer.") ||
      e.startsWith("comms.") ||
      e.startsWith("ai.") ||
      e.startsWith("logistics.") ||
      e.startsWith("catalogue.") ||
      e.startsWith("contract.") ||
      e.startsWith("org.")
  ),
  rental: Object.keys(EVENT_TOOL_MAP).filter((e) => e.startsWith("rental.")),
  realestate: Object.keys(EVENT_TOOL_MAP).filter((e) => e.startsWith("realestate.")),
  hospitality: Object.keys(EVENT_TOOL_MAP).filter((e) => e.startsWith("hospitality.")),
};

interface McpToolCall {
  jsonrpc: "2.0";
  id: string;
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface EventPayload {
  event_type: string;
  org_id: string;
  data: Record<string, unknown>;
  source?: string;
  priority?: "low" | "normal" | "high" | "critical";
}

// Rate limiting: per tenant, configurable per-min
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxPerMin: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMin) return false;
  entry.count++;
  return true;
}

// SHA-256 hash for API key comparison
async function hashApiKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a secure API key
function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "smcp_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Determine auth method: X-Tenant-Key (API key) or Bearer token
    const tenantKey = req.headers.get("X-Tenant-Key");
    const authHeader = req.headers.get("Authorization");

    let authMode: "tenant_key" | "bearer" = "bearer";
    let userId: string | null = null;
    let tenantRecord: any = null;

    if (tenantKey) {
      // API key authentication — validate against mcp_tenants
      authMode = "tenant_key";
      const keyHash = await hashApiKey(tenantKey);

      const { data: tenant } = await adminClient
        .from("mcp_tenants")
        .select("*")
        .eq("api_key_hash", keyHash)
        .eq("is_active", true)
        .maybeSingle();

      if (!tenant) {
        return jsonResponse({ error: "Invalid or inactive API key" }, 401);
      }
      tenantRecord = tenant;
    } else if (authHeader?.startsWith("Bearer ")) {
      // JWT authentication — existing flow for dashboard users
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonResponse({ error: "Invalid token" }, 401);
      }
      userId = claimsData.claims.sub as string;
    } else {
      return jsonResponse({ error: "Unauthorized — provide X-Tenant-Key or Bearer token" }, 401);
    }

    // Parse request body
    const body = await req.json();

    // Admin actions (Bearer auth only)
    if ("action" in body) {
      if (authMode === "tenant_key") {
        // Tenants can only use limited admin actions
        const allowedTenantActions = ["health", "supported-events", "my-usage"];
        if (!allowedTenantActions.includes(body.action)) {
          return jsonResponse({ error: "Tenant API keys cannot perform admin actions" }, 403);
        }
        return await handleTenantSelfAction(body, tenantRecord, adminClient);
      }
      return await handleAdminAction(body, userId!, adminClient);
    }

    // Event dispatch
    const event = body as EventPayload;
    if (!event.event_type || !event.org_id) {
      return jsonResponse({ error: "Missing event_type or org_id" }, 400);
    }

    // Tenant API key auth — validate domain access and tool permissions
    if (authMode === "tenant_key" && tenantRecord) {
      const eventDomain = event.event_type.split(".")[0];

      // Check domain access
      if (tenantRecord.domains.length > 0 && !tenantRecord.domains.includes(eventDomain)) {
        return jsonResponse(
          { error: `Tenant not authorized for domain: ${eventDomain}` },
          403
        );
      }

      // Check tool access
      const toolName = EVENT_TOOL_MAP[event.event_type];
      if (toolName) {
        if (
          tenantRecord.allowed_tools &&
          tenantRecord.allowed_tools.length > 0 &&
          !tenantRecord.allowed_tools.includes(toolName)
        ) {
          return jsonResponse({ error: `Tool not in allowed list: ${toolName}` }, 403);
        }
        if (
          tenantRecord.blocked_tools &&
          tenantRecord.blocked_tools.includes(toolName)
        ) {
          return jsonResponse({ error: `Tool is blocked: ${toolName}` }, 403);
        }
      }

      // Rate limit per tenant
      if (!checkRateLimit(`tenant:${tenantRecord.id}`, tenantRecord.rate_limit_per_min)) {
        return jsonResponse(
          { error: `Rate limit exceeded. Max ${tenantRecord.rate_limit_per_min} events/minute.` },
          429
        );
      }
    } else {
      // Bearer auth — rate limit per org
      if (!checkRateLimit(`org:${event.org_id}`, 60)) {
        return jsonResponse(
          { error: "Rate limit exceeded. Max 60 events/minute per organization." },
          429
        );
      }

      // Verify org membership for bearer auth
      const [{ data: membership }, { data: superCheck }] = await Promise.all([
        adminClient
          .from("org_members")
          .select("role")
          .eq("user_id", userId!)
          .eq("org_id", event.org_id)
          .eq("is_active", true)
          .maybeSingle(),
        adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId!)
          .eq("role", "super_admin")
          .maybeSingle(),
      ]);

      if (!membership && !superCheck) {
        return jsonResponse({ error: "Not a member of this organization" }, 403);
      }
    }

    // Get MCP server URL
    const { data: mcpConfig } = await adminClient
      .from("mcp_worker_config")
      .select("*")
      .eq("org_id", event.org_id)
      .eq("is_enabled", true)
      .maybeSingle();

    let serverUrl: string | null = mcpConfig?.mcp_server_url || null;
    const authMethod: string = mcpConfig?.auth_method || "bearer";
    const routingConfig: Record<string, unknown> = mcpConfig?.event_routing || {};

    if (!serverUrl) {
      const { data: platformRow } = await adminClient
        .from("platform_settings")
        .select("sentinel_mcp_url")
        .limit(1)
        .single();
      serverUrl = (platformRow as any)?.sentinel_mcp_url || null;
    }

    if (!serverUrl) {
      await adminClient.from("mcp_event_log").insert({
        org_id: event.org_id,
        event_type: event.event_type,
        event_source: event.source || "dashboard",
        payload: event.data,
        status: "skipped",
        error_message: "No MCP server configured",
        processing_time_ms: Date.now() - startTime,
      });
      return jsonResponse({ status: "skipped", message: "No MCP server configured. Event logged." });
    }

    // Check routing config
    const isRouted =
      Object.keys(routingConfig).length === 0 ||
      (routingConfig as Record<string, boolean>)[event.event_type] !== false;

    if (!isRouted) {
      await adminClient.from("mcp_event_log").insert({
        org_id: event.org_id,
        event_type: event.event_type,
        event_source: event.source || "dashboard",
        payload: event.data,
        status: "skipped",
        error_message: "Event type disabled in routing config",
        processing_time_ms: Date.now() - startTime,
      });
      return jsonResponse({ status: "skipped", message: "Event type not routed" });
    }

    // Resolve MCP tool name
    const toolName = EVENT_TOOL_MAP[event.event_type];
    if (!toolName) {
      await adminClient.from("mcp_event_log").insert({
        org_id: event.org_id,
        event_type: event.event_type,
        event_source: event.source || "dashboard",
        payload: event.data,
        status: "failed",
        error_message: `Unknown event type: ${event.event_type}`,
        processing_time_ms: Date.now() - startTime,
      });
      return jsonResponse({ error: `Unknown event type: ${event.event_type}` }, 400);
    }

    // Build MCP request
    const mcpRequest: McpToolCall = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: {
          org_id: event.org_id,
          tenant_key: tenantRecord?.tenant_key || "fsa_platform",
          event_type: event.event_type,
          priority: event.priority || "normal",
          timestamp: new Date().toISOString(),
          source: event.source || "fsa_platform",
          ...event.data,
        },
      },
    };

    // Build fetch headers
    const mcpHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    if (authMethod === "bearer") {
      const { data: mcpAuthKey } = await adminClient
        .from("platform_api_keys")
        .select("key_value")
        .eq("key_name", "sentinel_mcp_auth_key")
        .eq("is_active", true)
        .maybeSingle();
      if (mcpAuthKey?.key_value) {
        mcpHeaders["Authorization"] = `Bearer ${mcpAuthKey.key_value}`;
      }
    }

    // If tenant, forward their tenant key to the MCP server
    if (tenantRecord) {
      mcpHeaders["X-Tenant-Key"] = tenantRecord.tenant_key;
    }

    // Call MCP server
    let mcpResponse: Record<string, unknown> | null = null;
    let mcpStatus = "completed";
    let errorMsg: string | null = null;

    try {
      const response = await fetch(serverUrl, {
        method: "POST",
        headers: mcpHeaders,
        body: JSON.stringify(mcpRequest),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        const textBody = await response.text();
        mcpResponse = { stream: true, body: textBody };
      } else {
        mcpResponse = await response.json();
      }

      if (!response.ok) {
        mcpStatus = "failed";
        errorMsg = `MCP server returned ${response.status}: ${JSON.stringify(mcpResponse)}`;
      }
    } catch (fetchErr) {
      mcpStatus = "failed";
      errorMsg =
        fetchErr instanceof Error
          ? `MCP server unreachable: ${fetchErr.message}`
          : "MCP server unreachable";
    }

    const processingTime = Date.now() - startTime;

    // Log event
    await adminClient.from("mcp_event_log").insert({
      org_id: event.org_id,
      event_type: event.event_type,
      event_source: event.source || (tenantRecord ? `tenant:${tenantRecord.tenant_key}` : "dashboard"),
      payload: event.data,
      mcp_tool_name: toolName,
      mcp_response: mcpResponse,
      status: mcpStatus,
      error_message: errorMsg,
      processing_time_ms: processingTime,
      completed_at: new Date().toISOString(),
    });

    // Track tenant usage
    if (tenantRecord) {
      await adminClient.from("mcp_tenant_usage").insert({
        tenant_id: tenantRecord.id,
        event_type: event.event_type,
        tool_name: toolName,
        status: mcpStatus,
        processing_time_ms: processingTime,
      });
    }

    return jsonResponse(
      {
        status: mcpStatus,
        tool: toolName,
        mcp_request_id: mcpRequest.id,
        processing_time_ms: processingTime,
        response: mcpResponse,
      },
      mcpStatus === "completed" ? 200 : 502
    );
  } catch (err) {
    console.error("Sentinel MCP Worker error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500);
  }
});

// Tenant self-service actions (API key auth)
async function handleTenantSelfAction(
  body: any,
  tenant: any,
  adminClient: ReturnType<typeof createClient>
) {
  switch (body.action) {
    case "my-usage": {
      const limit = body.limit || 50;
      const { data } = await adminClient
        .from("mcp_tenant_usage")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return jsonResponse({ tenant_key: tenant.tenant_key, usage: data || [] });
    }
    case "supported-events": {
      // Filter to tenant's domains
      const allowedEvents = tenant.domains.length > 0
        ? Object.entries(EVENT_TOOL_MAP)
            .filter(([evt]) => tenant.domains.includes(evt.split(".")[0]))
            .map(([eventType, toolName]) => ({
              event_type: eventType,
              mcp_tool: toolName,
              domain: eventType.split(".")[0],
            }))
        : Object.entries(EVENT_TOOL_MAP).map(([eventType, toolName]) => ({
            event_type: eventType,
            mcp_tool: toolName,
            domain: eventType.split(".")[0],
          }));
      return jsonResponse({ events: allowedEvents });
    }
    case "health": {
      return jsonResponse({ status: "healthy", tenant: tenant.tenant_key, mode: tenant.mode });
    }
    default:
      return jsonResponse({ error: `Unknown action: ${body.action}` }, 400);
  }
}

// Admin actions (Bearer JWT auth)
async function handleAdminAction(
  body: { action: string; org_id?: string; [key: string]: unknown },
  userId: string,
  adminClient: ReturnType<typeof createClient>
) {
  const { action, org_id } = body;

  switch (action) {
    case "configure": {
      if (!org_id) return jsonResponse({ error: "org_id required" }, 400);
      const isAdmin = await verifyAdminAccess(userId, org_id, adminClient);
      if (!isAdmin) return jsonResponse({ error: "Requires org admin or super admin" }, 403);

      const { mcp_server_url, is_enabled, event_routing, auth_method, metadata } = body as any;
      const { data, error } = await adminClient
        .from("mcp_worker_config")
        .upsert(
          {
            org_id,
            mcp_server_url: mcp_server_url || "",
            is_enabled: is_enabled ?? true,
            event_routing: event_routing || {},
            auth_method: auth_method || "bearer",
            metadata: metadata || {},
          },
          { onConflict: "org_id" }
        )
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ status: "configured", config: data });
    }

    case "register-tenant": {
      // Super admin only
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      const { tenant_key, display_name, mode, domains, base_url, rate_limit_per_min, allowed_tools, blocked_tools } = body as any;
      if (!tenant_key || !display_name) {
        return jsonResponse({ error: "tenant_key and display_name are required" }, 400);
      }

      // Generate API key
      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);
      const apiKeyPrefix = apiKey.substring(0, 12) + "...";

      const { data, error } = await adminClient
        .from("mcp_tenants")
        .insert({
          tenant_key,
          display_name,
          mode: mode || "single",
          domains: domains || [],
          base_url: base_url || null,
          rate_limit_per_min: rate_limit_per_min || 60,
          api_key_hash: apiKeyHash,
          api_key_prefix: apiKeyPrefix,
          allowed_tools: allowed_tools || null,
          blocked_tools: blocked_tools || null,
          registered_by: userId,
        })
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);

      // Return the raw API key ONLY on creation (never stored in plaintext)
      return jsonResponse({
        status: "registered",
        tenant: data,
        api_key: apiKey,
        warning: "Store this API key securely — it cannot be retrieved again.",
      });
    }

    case "rotate-api-key": {
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      const { tenant_id } = body as any;
      if (!tenant_id) return jsonResponse({ error: "tenant_id required" }, 400);

      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);
      const apiKeyPrefix = apiKey.substring(0, 12) + "...";

      const { error } = await adminClient
        .from("mcp_tenants")
        .update({ api_key_hash: apiKeyHash, api_key_prefix: apiKeyPrefix })
        .eq("id", tenant_id);

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        status: "rotated",
        api_key: apiKey,
        warning: "Store this API key securely — it cannot be retrieved again.",
      });
    }

    case "list-tenants": {
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      const { data } = await adminClient
        .from("mcp_tenants")
        .select("*")
        .order("created_at", { ascending: false });

      return jsonResponse({ tenants: data || [] });
    }

    case "update-tenant": {
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      const { tenant_id, ...updates } = body as any;
      if (!tenant_id) return jsonResponse({ error: "tenant_id required" }, 400);

      // Remove non-updatable fields
      delete updates.action;
      delete updates.id;
      delete updates.api_key_hash;
      delete updates.api_key_prefix;

      const { data, error } = await adminClient
        .from("mcp_tenants")
        .update(updates)
        .eq("id", tenant_id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ status: "updated", tenant: data });
    }

    case "register-webhook": {
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      const { tenant_id, url, events, secret } = body as any;
      if (!tenant_id || !url) return jsonResponse({ error: "tenant_id and url required" }, 400);

      const secretHash = secret ? await hashApiKey(secret) : null;

      const { data, error } = await adminClient
        .from("mcp_tenant_webhooks")
        .insert({
          tenant_id,
          url,
          events: events || [],
          secret_hash: secretHash,
        })
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ status: "webhook_registered", webhook: data });
    }

    case "list-configs": {
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      const { data } = await adminClient
        .from("mcp_worker_config")
        .select("*, organizations(name)")
        .order("created_at", { ascending: false });
      return jsonResponse({ configs: data || [] });
    }

    case "event-history": {
      if (!org_id) return jsonResponse({ error: "org_id required" }, 400);
      const isAdmin = await verifyAdminAccess(userId, org_id, adminClient);
      if (!isAdmin) return jsonResponse({ error: "Requires org admin or super admin" }, 403);

      const limit = (body.limit as number) || 50;
      const statusFilter = body.status_filter as string | undefined;

      let query = adminClient
        .from("mcp_event_log")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (statusFilter) query = query.eq("status", statusFilter);

      const { data } = await query;
      return jsonResponse({ events: data || [] });
    }

    case "supported-events": {
      return jsonResponse({
        events: Object.entries(EVENT_TOOL_MAP).map(([eventType, toolName]) => ({
          event_type: eventType,
          mcp_tool: toolName,
          domain: eventType.split(".")[0],
        })),
        domains: DOMAIN_EVENTS,
      });
    }

    case "health": {
      if (!org_id) return jsonResponse({ error: "org_id required" }, 400);

      const { data: config } = await adminClient
        .from("mcp_worker_config")
        .select("mcp_server_url, is_enabled")
        .eq("org_id", org_id)
        .maybeSingle();

      if (!config?.mcp_server_url) return jsonResponse({ status: "not_configured" });

      try {
        const pingRes = await fetch(config.mcp_server_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: crypto.randomUUID(),
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "fsa-sentinel-worker", version: "2.0.0" },
            },
          }),
        });
        const pingData = await pingRes.json();
        return jsonResponse({
          status: pingRes.ok ? "healthy" : "unhealthy",
          enabled: config.is_enabled,
          server_response: pingData,
        });
      } catch {
        return jsonResponse({ status: "unreachable", enabled: config.is_enabled });
      }
    }

    case "activate-shield": {
      // Super admin only — request the free SENTINEL-SHIELD subscription
      // from Sentinel MCP for FYSORA (non-fee-paying platform client).
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

      // Idempotency: dedupe duplicate clicks / webhook retries within 24h
      const idemKey = (body as any).idempotency_key as string | undefined;
      if (idemKey) {
        const { data: existingByKey } = await adminClient
          .from("sentinel_shield_activation")
          .select("*")
          .eq("idempotency_key", idemKey)
          .maybeSingle();
        if (
          existingByKey &&
          (existingByKey as any).idempotency_key_expires_at &&
          new Date((existingByKey as any).idempotency_key_expires_at).getTime() > Date.now()
        ) {
          return jsonResponse({
            status: (existingByKey as any).status,
            activation: existingByKey,
            idempotent_replay: true,
          });
        }
      }

      // Load existing activation row to honor backoff schedule
      const { data: existing } = await adminClient
        .from("sentinel_shield_activation")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      const force = (body as any).force === true;
      const prevAttempts = (existing as any)?.attempt_count ?? 0;
      const maxAttempts = (existing as any)?.max_attempts ?? 6;
      const nextRetryAt = (existing as any)?.next_retry_at
        ? new Date((existing as any).next_retry_at)
        : null;

      if (!force && nextRetryAt && nextRetryAt.getTime() > Date.now()) {
        return jsonResponse({
          status: (existing as any)?.status ?? "requested",
          activation: existing,
          backoff: true,
          message: `Next retry scheduled at ${nextRetryAt.toISOString()}`,
        });
      }

      // Resolve Sentinel MCP server URL: platform_settings → first configured org → env
      let serverUrl: string | null = null;
      const { data: platformRow } = await adminClient
        .from("platform_settings")
        .select("sentinel_mcp_url")
        .limit(1)
        .maybeSingle();
      serverUrl = (platformRow as any)?.sentinel_mcp_url || null;
      if (!serverUrl) {
        const { data: anyConfig } = await adminClient
          .from("mcp_worker_config")
          .select("mcp_server_url")
          .not("mcp_server_url", "is", null)
          .neq("mcp_server_url", "")
          .limit(1)
          .maybeSingle();
        serverUrl = anyConfig?.mcp_server_url || null;
      }
      if (!serverUrl) {
        serverUrl = Deno.env.get("SENTINEL_MCP_URL") || null;
      }

      // Lookup auth bearer if configured
      const { data: mcpAuthKey } = await adminClient
        .from("platform_api_keys")
        .select("key_value")
        .eq("key_name", "sentinel_mcp_auth_key")
        .eq("is_active", true)
        .maybeSingle();

      const requestPayload = {
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: {
          name: "sentinel_shield_activate",
          arguments: {
            client_email: "sentinel-mcp@eastforte.org.ng",
            client_name: "FYSORA FASHN (Fashion Stitches Africa)",
            plan: "SENTINEL-SHIELD",
            tier: "non_fee_paying",
            requested_features: [
              "waf_baseline",
              "ddos_shield",
              "abuse_detection",
              "audit_forwarding",
              "uptime_probe",
            ],
            scope: "platform_only",
            cascades_to_users: false,
            requested_by: userId,
            requested_at: new Date().toISOString(),
            attempt: prevAttempts + 1,
          },
        },
      };

      let providerResponse: unknown = null;
      let providerStatus: "active" | "requested" | "failed" | "retrying" = "requested";
      let lastError: string | null = null;
      let httpStatus: number | null = null;
      let isRetryable = false;

      if (serverUrl) {
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          };
          if (mcpAuthKey?.key_value) {
            headers["Authorization"] = `Bearer ${mcpAuthKey.key_value}`;
          }
          // 15s timeout treated as retryable
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 15_000);
          const res = await fetch(serverUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(requestPayload),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          httpStatus = res.status;
          const ct = res.headers.get("content-type") ?? "";
          providerResponse = ct.includes("text/event-stream")
            ? { stream: true, body: await res.text() }
            : await res.json().catch(() => ({}));
          if (!res.ok) {
            isRetryable = res.status >= 500 && res.status <= 599;
            providerStatus = isRetryable ? "retrying" : "failed";
            lastError = `MCP server returned ${res.status}`;
          } else {
            // Best-effort: treat any 2xx as activated for the free tier
            providerStatus = "active";
          }
        } catch (e) {
          // Network/timeout errors are retryable
          isRetryable = true;
          providerStatus = "retrying";
          lastError = e instanceof Error ? e.message : "MCP server unreachable";
        }
      } else {
        providerStatus = "requested";
        lastError = "No Sentinel MCP server URL configured; activation queued.";
      }

      const newAttempt = prevAttempts + 1;
      // Exponential backoff: 30s, 1m, 2m, 4m, 8m, 16m (capped)
      const backoffSeconds = Math.min(30 * Math.pow(2, newAttempt - 1), 30 * 60);
      let nextRetry: string | null = null;
      if (providerStatus === "retrying") {
        if (newAttempt >= maxAttempts) {
          providerStatus = "failed";
          lastError = `${lastError ?? "retry exhausted"} (max ${maxAttempts} attempts reached)`;
        } else {
          nextRetry = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        }
      }

      const nowIso = new Date().toISOString();
      const { data: row, error: upErr } = await adminClient
        .from("sentinel_shield_activation")
        .upsert(
          {
            id: 1,
            client_email: "sentinel-mcp@eastforte.org.ng",
            plan_key: "sentinel_shield_free",
            status: providerStatus,
            requested_at: nowIso,
            activated_at: providerStatus === "active" ? nowIso : null,
            request_payload: requestPayload,
            provider_response: providerResponse as any,
            last_error: lastError,
            attempt_count: providerStatus === "active" ? 0 : newAttempt,
            last_attempt_at: nowIso,
            next_retry_at: nextRetry,
            idempotency_key: idemKey ?? null,
            idempotency_key_expires_at: idemKey
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : null,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (upErr) return jsonResponse({ error: upErr.message }, 500);
      return jsonResponse({
        status: providerStatus,
        activation: row,
        server_url_used: serverUrl,
        http_status: httpStatus,
        retry_in_seconds: nextRetry ? backoffSeconds : null,
      });
    }

    case "activate-agent":
      return await activatePlatformAgent(body, userId, adminClient);

    case "list-platform-agents": {
      const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
      if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);
      const { data, error } = await adminClient
        .from("sentinel_platform_agents")
        .select("*")
        .order("agent_name", { ascending: true });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ agents: data ?? [] });
    }

    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  }
}

async function activatePlatformAgent(
  body: any,
  userId: string,
  adminClient: ReturnType<typeof createClient>,
) {
  const isSuperAdmin = await verifySuperAdmin(userId, adminClient);
  if (!isSuperAdmin) return jsonResponse({ error: "Super admin access required" }, 403);

  const agentKey = String(body.agent_key || "");
  if (!agentKey) return jsonResponse({ error: "Missing agent_key" }, 400);

  // Idempotency check
  const idemKey = (body as any).idempotency_key as string | undefined;
  if (idemKey) {
    const { data: existingByKey } = await adminClient
      .from("sentinel_platform_agents")
      .select("*")
      .eq("idempotency_key", idemKey)
      .maybeSingle();
    if (
      existingByKey &&
      (existingByKey as any).idempotency_key_expires_at &&
      new Date((existingByKey as any).idempotency_key_expires_at).getTime() > Date.now()
    ) {
      return jsonResponse({
        status: (existingByKey as any).status,
        agent: existingByKey,
        idempotent_replay: true,
      });
    }
  }

  const { data: agent, error: agentErr } = await adminClient
    .from("sentinel_platform_agents")
    .select("*")
    .eq("agent_key", agentKey)
    .maybeSingle();
  if (agentErr || !agent) return jsonResponse({ error: "Unknown platform agent" }, 404);

  const force = body.force === true;
  const prevAttempts = (agent as any).attempt_count ?? 0;
  const maxAttempts = (agent as any).max_attempts ?? 6;
  const nextRetryAt = (agent as any).next_retry_at
    ? new Date((agent as any).next_retry_at)
    : null;

  if (!force && nextRetryAt && nextRetryAt.getTime() > Date.now()) {
    return jsonResponse({
      status: (agent as any).status,
      agent,
      backoff: true,
      message: `Next retry scheduled at ${nextRetryAt.toISOString()}`,
    });
  }

  // Resolve Sentinel MCP server URL
  let serverUrl: string | null = null;
  const { data: platformRow } = await adminClient
    .from("platform_settings")
    .select("sentinel_mcp_url")
    .limit(1)
    .maybeSingle();
  serverUrl = (platformRow as any)?.sentinel_mcp_url || null;
  if (!serverUrl) {
    const { data: anyConfig } = await adminClient
      .from("mcp_worker_config")
      .select("mcp_server_url")
      .not("mcp_server_url", "is", null)
      .neq("mcp_server_url", "")
      .limit(1)
      .maybeSingle();
    serverUrl = (anyConfig as any)?.mcp_server_url || null;
  }
  if (!serverUrl) serverUrl = Deno.env.get("SENTINEL_MCP_URL") || null;

  const { data: mcpAuthKey } = await adminClient
    .from("platform_api_keys")
    .select("key_value")
    .eq("key_name", "sentinel_mcp_auth_key")
    .eq("is_active", true)
    .maybeSingle();

  const requestPayload = {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "tools/call",
    params: {
      name: (agent as any).mcp_tool_name,
      arguments: {
        client_email: (agent as any).client_email,
        client_name: "FYSORA FASHN (Fashion Stitches Africa)",
        agent: (agent as any).agent_name,
        plan: (agent as any).plan_key,
        tier: (agent as any).tier,
        scope: (agent as any).scope,
        cascades_to_users: (agent as any).cascades_to_users,
        requested_features: (agent as any).requested_features ?? [],
        requested_by: userId,
        requested_at: new Date().toISOString(),
        attempt: prevAttempts + 1,
      },
    },
  };

  let providerResponse: unknown = null;
  let providerStatus: "active" | "requested" | "failed" | "retrying" = "requested";
  let lastError: string | null = null;
  let httpStatus: number | null = null;
  let isRetryable = false;

  if (serverUrl) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };
      if (mcpAuthKey?.key_value) headers["Authorization"] = `Bearer ${mcpAuthKey.key_value}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(serverUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      httpStatus = res.status;
      const ct = res.headers.get("content-type") ?? "";
      providerResponse = ct.includes("text/event-stream")
        ? { stream: true, body: await res.text() }
        : await res.json().catch(() => ({}));
      if (!res.ok) {
        isRetryable = res.status >= 500 && res.status <= 599;
        providerStatus = isRetryable ? "retrying" : "failed";
        lastError = `MCP server returned ${res.status}`;
      } else {
        providerStatus = "active";
      }
    } catch (e) {
      isRetryable = true;
      providerStatus = "retrying";
      lastError = e instanceof Error ? e.message : "MCP server unreachable";
    }
  } else {
    providerStatus = "requested";
    lastError = "No Sentinel MCP server URL configured; activation queued.";
  }

  const newAttempt = prevAttempts + 1;
  const backoffSeconds = Math.min(30 * Math.pow(2, newAttempt - 1), 30 * 60);
  let nextRetry: string | null = null;
  if (providerStatus === "retrying") {
    if (newAttempt >= maxAttempts) {
      providerStatus = "failed";
      lastError = `${lastError ?? "retry exhausted"} (max ${maxAttempts} attempts reached)`;
    } else {
      nextRetry = new Date(Date.now() + backoffSeconds * 1000).toISOString();
    }
  }

  const nowIso = new Date().toISOString();
  const { data: row, error: upErr } = await adminClient
    .from("sentinel_platform_agents")
    .update({
      status: providerStatus,
      requested_at: nowIso,
      activated_at: providerStatus === "active" ? nowIso : (agent as any).activated_at,
      request_payload: requestPayload,
      provider_response: providerResponse as any,
      last_error: lastError,
      attempt_count: providerStatus === "active" ? 0 : newAttempt,
      last_attempt_at: nowIso,
      next_retry_at: nextRetry,
      idempotency_key: idemKey ?? null,
      idempotency_key_expires_at: idemKey
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
    .eq("agent_key", agentKey)
    .select()
    .single();

  if (upErr) return jsonResponse({ error: upErr.message }, 500);
  return jsonResponse({
    status: providerStatus,
    agent: row,
    server_url_used: serverUrl,
    http_status: httpStatus,
    retry_in_seconds: nextRetry ? backoffSeconds : null,
  });
}

async function verifyAdminAccess(
  userId: string,
  orgId: string,
  client: ReturnType<typeof createClient>
): Promise<boolean> {
  const [{ data: orgAdmin }, { data: superAdmin }] = await Promise.all([
    client
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .in("role", ["org_admin", "manager"])
      .eq("is_active", true)
      .maybeSingle(),
    client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle(),
  ]);
  return !!(orgAdmin || superAdmin);
}

async function verifySuperAdmin(
  userId: string,
  client: ReturnType<typeof createClient>
): Promise<boolean> {
  const { data } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
