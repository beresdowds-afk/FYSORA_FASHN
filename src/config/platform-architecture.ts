/**
 * FYSORA FASHN (Fashion Stitches Africa) — Future Platform Architecture Configuration
 *
 * This module defines the integration contracts for upcoming infrastructure:
 *
 * 1. MCP (Model Context Protocol) Server
 *    - Independent modal concept server for AI tool orchestration
 *    - Streamable HTTP transport with SSE fallback
 *    - Edge function proxy at /functions/v1/mcp-proxy
 *
 * 2. Multi-Cloud Observability (Google OpenTelemetry)
 *    - Distributed tracing across edge functions, DB queries, and external APIs
 *    - OTLP exporter to Google Cloud Trace / self-hosted collector
 *    - Automatic span propagation via W3C traceparent headers
 *
 * 3. Cybersecurity-as-a-Service (CySaaS) Governance
 *    - External SIEM integration for audit log forwarding
 *    - Runtime application self-protection (RASP) hooks
 *    - Automated vulnerability scanning via CI pipeline
 *    - SOC 2 / ISO 27001 compliance evidence collection
 */

// ── MCP Integration ────────────────────────────────────────────────────────

export interface McpServerConfig {
  /** Base URL of the MCP server (Streamable HTTP endpoint) */
  serverUrl: string;
  /** Required Accept header per MCP spec */
  acceptHeader: "application/json, text/event-stream";
  /** Tools exposed by the FSA MCP server */
  registeredTools: McpToolDefinition[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_DEFAULTS: McpServerConfig = {
  serverUrl: "", // Set via VITE_MCP_SERVER_URL or edge function secret
  acceptHeader: "application/json, text/event-stream",
  registeredTools: [
    {
      name: "fsa_measurement_lookup",
      description: "Retrieve customer measurement profiles for an organization",
      inputSchema: {
        type: "object",
        properties: {
          org_id: { type: "string" },
          customer_id: { type: "string" },
        },
        required: ["org_id"],
      },
    },
    {
      name: "fsa_order_status",
      description: "Get real-time order status including delegation chain",
      inputSchema: {
        type: "object",
        properties: { order_id: { type: "string" } },
        required: ["order_id"],
      },
    },
    {
      name: "fsa_credit_balance",
      description: "Check credit wallet balance for an organization or user",
      inputSchema: {
        type: "object",
        properties: { owner_id: { type: "string" } },
        required: ["owner_id"],
      },
    },
  ],
};

// ── OpenTelemetry Configuration ────────────────────────────────────────────

export interface OtelConfig {
  /** OTLP endpoint (e.g., Google Cloud Trace collector) */
  collectorEndpoint: string;
  /** Service name reported in traces */
  serviceName: "fashion-stitches-africa";
  /** Sampling rate: 0.0 – 1.0 */
  samplingRate: number;
  /** Propagation format */
  propagator: "w3c-traceparent";
  /** Instrumented layers */
  instrumentations: OtelInstrumentation[];
}

export type OtelInstrumentation =
  | "edge-functions"
  | "supabase-queries"
  | "external-api-calls"
  | "payment-gateway"
  | "ai-job-processing"
  | "carrier-api";

export const OTEL_DEFAULTS: OtelConfig = {
  collectorEndpoint: "", // Set via secret: OTEL_COLLECTOR_ENDPOINT
  serviceName: "fashion-stitches-africa",
  samplingRate: 0.1, // 10% in production, 1.0 in staging
  propagator: "w3c-traceparent",
  instrumentations: [
    "edge-functions",
    "supabase-queries",
    "external-api-calls",
    "payment-gateway",
    "ai-job-processing",
    "carrier-api",
  ],
};

// ── Cybersecurity-as-a-Service ─────────────────────────────────────────────

export interface CySaaSConfig {
  /** SIEM webhook for audit log forwarding */
  siemWebhookUrl: string;
  /** Events forwarded to SIEM */
  forwardedEvents: CySaaSEvent[];
  /** Compliance frameworks tracked */
  complianceFrameworks: ComplianceFramework[];
  /** Automated scan schedule (cron) */
  vulnScanCron: string;
}

export type CySaaSEvent =
  | "auth.login"
  | "auth.logout"
  | "auth.failed_login"
  | "data.export"
  | "data.deletion_request"
  | "admin.role_change"
  | "admin.org_suspension"
  | "payment.refund"
  | "contract.termination"
  | "dispute.escalation";

export type ComplianceFramework =
  | "SOC2-Type2"
  | "ISO27001"
  | "GDPR"
  | "NDPR"        // Nigeria Data Protection Regulation
  | "POPIA"       // South Africa POPI Act
  | "DPA-Kenya";  // Kenya Data Protection Act

export const CYSAAS_DEFAULTS: CySaaSConfig = {
  siemWebhookUrl: "", // Set via secret: SIEM_WEBHOOK_URL
  forwardedEvents: [
    "auth.login",
    "auth.failed_login",
    "data.export",
    "data.deletion_request",
    "admin.role_change",
    "admin.org_suspension",
    "payment.refund",
    "contract.termination",
    "dispute.escalation",
  ],
  complianceFrameworks: ["GDPR", "NDPR", "POPIA", "DPA-Kenya"],
  vulnScanCron: "0 3 * * 0", // Weekly Sunday 3 AM UTC
};
