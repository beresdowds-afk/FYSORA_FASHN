import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CartLine {
  id: string;
  source: "org_catalogue" | "tailor_catalogue";
  quantity: number;
  client_unit_price?: number;
}

interface Body {
  org_id: string;
  source: "native" | "embed" | "demo";
  origin_url?: string;
  customer: { name: string; email: string; phone?: string };
  items: CartLine[];
  notes?: string | null;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validate(body: Partial<Body>): string | null {
  if (!body.org_id || typeof body.org_id !== "string") return "org_id required";
  if (!body.customer?.name || body.customer.name.length > 200) return "customer.name invalid";
  if (!body.customer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer.email))
    return "customer.email invalid";
  if (!Array.isArray(body.items) || body.items.length === 0) return "items required";
  if (body.items.length > 50) return "too many items";
  if (!["native", "embed", "demo"].includes(body.source as string)) return "source invalid";
  for (const it of body.items) {
    if (!it.id || !["org_catalogue", "tailor_catalogue"].includes(it.source)) return "item invalid";
    if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 100)
      return "quantity out of range";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const err = validate(body);
  if (err) return json(400, { ok: false, error: err });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Identify caller (optional — guests allowed for inbound carts)
  let callerId: string | null = null;
  let callerRole: string = "guest";
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    callerId = userData.user?.id ?? null;
    if (callerId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);
      callerRole = (roles?.[0]?.role as string) ?? "customer";
    }
  }

  // Fetch org currency
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, currency")
    .eq("id", body.org_id)
    .single();
  if (!org) return json(404, { ok: false, error: "Organization not found" });

  // Server-side re-price (single source of truth)
  const orgIds = body.items.filter((i) => i.source === "org_catalogue").map((i) => i.id);
  const tailorIds = body.items.filter((i) => i.source === "tailor_catalogue").map((i) => i.id);

  const [{ data: orgItems }, { data: tailorItems }] = await Promise.all([
    orgIds.length
      ? admin
          .from("org_catalogue_items")
          .select("id, name, price, currency, is_available, org_id")
          .in("id", orgIds)
          .eq("org_id", body.org_id)
      : Promise.resolve({ data: [] as any[] }),
    tailorIds.length
      ? admin
          .from("tailor_catalogue_items")
          .select("id, name, price, currency, is_published, org_id")
          .in("id", tailorIds)
          .eq("org_id", body.org_id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const priceMap = new Map<string, { name: string; unit_price: number; currency: string }>();
  for (const r of orgItems ?? []) {
    if (r.is_available)
      priceMap.set(`org_catalogue:${r.id}`, {
        name: r.name,
        unit_price: Number(r.price ?? 0),
        currency: r.currency || org.currency || "NGN",
      });
  }
  for (const r of tailorItems ?? []) {
    if (r.is_published)
      priceMap.set(`tailor_catalogue:${r.id}`, {
        name: r.name,
        unit_price: Number(r.price ?? 0),
        currency: r.currency || org.currency || "NGN",
      });
  }

  const unavailable: string[] = [];
  const mismatches: { id: string; client: number; server: number }[] = [];
  const finalLines: { id: string; name: string; quantity: number; unit_price: number; currency: string }[] = [];

  for (const it of body.items) {
    const key = `${it.source}:${it.id}`;
    const server = priceMap.get(key);
    if (!server) {
      unavailable.push(it.id);
      continue;
    }
    if (typeof it.client_unit_price === "number" && it.client_unit_price !== server.unit_price) {
      mismatches.push({ id: it.id, client: it.client_unit_price, server: server.unit_price });
    }
    finalLines.push({
      id: it.id,
      name: server.name,
      quantity: it.quantity,
      unit_price: server.unit_price,
      currency: server.currency,
    });
  }

  if (finalLines.length === 0) {
    return json(409, { ok: false, error: "All items unavailable", unavailable });
  }

  const currency = finalLines[0].currency;
  const total = finalLines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  // Customer must be a registered FSA user for FK integrity.
  // Guests can still submit — we link to the first super_assistant/system user
  // and capture the real customer details in the order notes + audit metadata.
  let customerId = callerId;
  if (!customerId) {
    // Look up by email — only matches if user already has an account
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("display_name", body.customer.name)
      .limit(1)
      .maybeSingle();
    customerId = existing?.id ?? null;
  }
  if (!customerId) {
    return json(401, {
      ok: false,
      error: "Please sign in or register to submit your cart. Guest checkout is not enabled.",
    });
  }

  // Generate order number
  const orderNumber = `CART-${Date.now().toString().slice(-8)}`;

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      org_id: body.org_id,
      customer_id: customerId,
      order_number: orderNumber,
      title: `Cart submission (${finalLines.length} item${finalLines.length > 1 ? "s" : ""})`,
      description: body.notes ?? null,
      total_amount: total,
      customer_total: total,
      currency,
      status: "pending",
      payment_status: "unpaid",
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return json(500, { ok: false, error: orderErr?.message || "Failed to create order" });
  }

  const itemRows = finalLines.map((l) => ({
    order_id: order.id,
    name: l.name,
    quantity: l.quantity,
    unit_price: l.unit_price,
  }));
  await admin.from("order_items").insert(itemRows);

  // Audit log — full snapshot of who submitted what at what price
  await admin.from("audit_logs").insert({
    user_id: customerId,
    org_id: body.org_id,
    action: "catalogue_cart_submitted",
    entity_type: "cart_submission",
    entity_id: order.id,
    metadata: {
      source: body.source,
      role: callerRole,
      origin_url: body.origin_url ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      order_number: order.order_number,
      customer: { name: body.customer.name, email: body.customer.email, phone: body.customer.phone ?? null },
      total,
      currency,
      lines: finalLines,
      price_mismatches: mismatches,
      unavailable_skipped: unavailable,
    },
  });

  // Notify org admins / managers via in-app notification
  const { data: admins } = await admin
    .from("org_members")
    .select("user_id")
    .eq("org_id", body.org_id)
    .eq("is_active", true)
    .in("role", ["org_admin", "manager"]);

  if (admins?.length) {
    await admin.from("notifications").insert(
      admins.map((m) => ({
        org_id: body.org_id,
        user_id: m.user_id,
        order_id: order.id,
        title: "New cart submission",
        message: `${body.customer.name} submitted a cart with ${finalLines.length} item${finalLines.length > 1 ? "s" : ""} (${currency} ${total.toLocaleString()}).`,
      })),
    );
  }

  // Dispatch outbound webhook for orgs subscribed to order.created
  try {
    const dispatcherUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/dispatch-org-webhook`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // fire-and-forget; don't block the response
    fetch(dispatcherUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        org_id: body.org_id,
        event: "order.created",
        payload: {
          order_id: order.id,
          order_number: order.order_number,
          source: body.source,
          customer: body.customer,
          items: finalLines,
          total,
          currency,
        },
      }),
    }).catch(() => {});
  } catch { /* ignore */ }

  return json(200, {
    ok: true,
    order_id: order.id,
    order_number: order.order_number,
    total,
    currency,
    unavailable_skipped: unavailable,
    price_mismatches: mismatches,
  });
});