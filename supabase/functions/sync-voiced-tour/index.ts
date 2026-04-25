// Voiced Tour Sync Worker
// Regenerates the role-based voiced tour tracks (customer, tailor, designer,
// organization) using Lovable AI Gateway, seeded from the latest platform
// updates and the static feature inventory. Stores results in
// public.platform_tour_tracks and clears the is_stale flag.
//
// Trigger: HTTP POST. Body { force?: boolean, role?: TourRole | "all" }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["customer", "tailor", "designer", "organization"] as const;
type TourRole = (typeof ROLES)[number];

const ROLE_BRIEFS: Record<TourRole, { label: string; tagline: string; icon: string; accent: string; ctaLabel: string; ctaPath: string; focus: string }> = {
  customer: {
    label: "Customer",
    tagline: "Shop, fit, and order from Africa's best",
    icon: "ShoppingBag",
    accent: "from-blue-500/20 to-primary/10",
    ctaLabel: "Subscribe to Premium",
    ctaPath: "/portal",
    focus: "Browsing the catalogue, AI measurements, virtual try-on, ordering, tracking, communications, and the Customer Premium subscription.",
  },
  tailor: {
    label: "Tailor",
    tagline: "Your craft, your studio, global customers",
    icon: "Scissors",
    accent: "from-amber-500/20 to-primary/10",
    ctaLabel: "Start Free — Tailor Studio",
    ctaPath: "/auth?role=tailor",
    focus: "Free tailor studio storefront, 9-stage order workflow, premium AI measurements, premium virtual try-on, multi-channel comms, and Tailor subscription benefits.",
  },
  designer: {
    label: "Designer",
    tagline: "Showcase collections, sell worldwide",
    icon: "Sparkles",
    accent: "from-violet-500/20 to-primary/10",
    ctaLabel: "Start Free — Designer Portal",
    ctaPath: "/auth?role=designer",
    focus: "Free Designer Portal, Website Builder Lite (free) and Pro (premium), virtual try-on with embeddable SDK, tailor delegation, and Designer subscription.",
  },
  organization: {
    label: "Fashion House",
    tagline: "Run your studio end-to-end",
    icon: "Building2",
    accent: "from-emerald-500/20 to-primary/10",
    ctaLabel: "Register Fashion House",
    ctaPath: "/create-organization",
    focus: "Multi-user dashboard, catalogue + 7-platform social sync, end-to-end orders, omnichannel comms, website + branded PWA, Premium AI suite, disputes/tax/invoicing, and Org plans.",
  },
};

const VISUALS = ["catalogue", "fashion-houses", "measurements", "try-on", "orders", "communications", "welcome", "subscribe"];
const ICONS = ["Sparkles", "ShoppingBag", "Building2", "Ruler", "Package", "MessageSquare", "Crown", "Scissors"];

interface PlatformUpdateRow {
  version: string;
  title: string;
  notes: string | null;
  severity: string;
  published_at: string;
}

async function fetchRecentUpdates(supabase: ReturnType<typeof createClient>): Promise<PlatformUpdateRow[]> {
  const { data } = await supabase
    .from("platform_updates")
    .select("version,title,notes,severity,published_at")
    .order("published_at", { ascending: false })
    .limit(8);
  return (data ?? []) as PlatformUpdateRow[];
}

function buildPrompt(role: TourRole, updates: PlatformUpdateRow[]) {
  const brief = ROLE_BRIEFS[role];
  const updatesBlock = updates.length
    ? updates.map((u) => `- v${u.version} (${u.severity}): ${u.title}${u.notes ? ` — ${u.notes}` : ""}`).join("\n")
    : "(no recent platform updates)";

  return `You are writing the ${brief.label} voiced auto-play tour for FYSORA FASHN (Fashion Stitches Africa), a multi-tenant African fashion ERP + marketplace.

Goal: produce 6–8 tour steps showcasing BOTH free and premium features for this role.
Focus area: ${brief.focus}

Recent platform updates to weave in (most recent first):
${updatesBlock}

Constraints:
- DO NOT mention any specific prices, dollar amounts, naira amounts, percentages, or per-credit costs. Use generic terms like "premium plan", "usage-based billing", "free tier".
- Each step's "narration" is spoken aloud — write conversationally, 2–4 sentences, no markdown.
- "description" is a short on-screen blurb (1–2 sentences).
- "highlights" = 2–4 short tag-style strings (e.g. "9-Stage Workflow").
- "icon" must be one of: ${ICONS.join(", ")}.
- "visual" must be one of: ${VISUALS.join(", ")}.
- First step is always a welcome; last step is always the subscription/CTA.

Return STRICT JSON only (no markdown fences, no commentary):
{
  "steps": [
    {
      "id": "kebab-case-id",
      "title": "string",
      "subtitle": "string",
      "description": "string",
      "narration": "string",
      "icon": "Sparkles",
      "visual": "welcome",
      "highlights": ["...", "..."]
    }
  ]
}`;
}

async function generateRoleSteps(role: TourRole, updates: PlatformUpdateRow[], lovableKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You output strict JSON for product tour content. Never include prices." },
        { role: "user", content: buildPrompt(role, updates) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty content");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.steps) || parsed.steps.length < 4) {
    throw new Error("AI returned invalid step list");
  }
  // Sanitize each step
  return parsed.steps.map((s: any, i: number) => ({
    id: String(s.id || `${role}-step-${i}`).slice(0, 60),
    title: String(s.title || "").slice(0, 120),
    subtitle: String(s.subtitle || "").slice(0, 160),
    description: String(s.description || "").slice(0, 600),
    narration: String(s.narration || "").slice(0, 1200),
    icon: ICONS.includes(s.icon) ? s.icon : "Sparkles",
    visual: VISUALS.includes(s.visual) ? s.visual : "welcome",
    highlights: Array.isArray(s.highlights)
      ? s.highlights.slice(0, 4).map((h: any) => String(h).slice(0, 60))
      : [],
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch { /* allow empty */ }
    const requestedRole: TourRole | "all" = body.role && ROLES.includes(body.role) ? body.role : "all";

    // Mark attempt
    await supabase
      .from("platform_tour_sync_state")
      .update({ last_sync_attempt_at: new Date().toISOString(), last_sync_status: "running" })
      .eq("id", 1);

    const updates = await fetchRecentUpdates(supabase);
    const sourceVersion = updates[0]?.version ?? null;

    const targetRoles: TourRole[] = requestedRole === "all" ? [...ROLES] : [requestedRole];
    const results: Array<{ role: TourRole; status: "ok" | "error"; message?: string }> = [];

    for (const role of targetRoles) {
      try {
        const steps = await generateRoleSteps(role, updates, LOVABLE_KEY);
        const brief = ROLE_BRIEFS[role];
        const { error: upsertErr } = await supabase
          .from("platform_tour_tracks")
          .upsert(
            {
              role,
              label: brief.label,
              tagline: brief.tagline,
              icon: brief.icon,
              accent: brief.accent,
              cta_label: brief.ctaLabel,
              cta_path: brief.ctaPath,
              steps,
              source_version: sourceVersion,
              generated_by: "ai",
              generated_at: new Date().toISOString(),
            },
            { onConflict: "role" }
          );
        if (upsertErr) throw upsertErr;
        results.push({ role, status: "ok" });
      } catch (e: any) {
        console.error(`[sync-voiced-tour] ${role} failed:`, e?.message);
        results.push({ role, status: "error", message: e?.message ?? "unknown" });
      }
    }

    const allOk = results.every((r) => r.status === "ok");
    await supabase
      .from("platform_tour_sync_state")
      .update({
        is_stale: allOk ? false : true,
        last_sync_success_at: allOk ? new Date().toISOString() : null,
        last_sync_status: allOk ? "success" : "partial",
        last_sync_message: results.map((r) => `${r.role}:${r.status}`).join(", "),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return new Response(JSON.stringify({ ok: allOk, results, source_version: sourceVersion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[sync-voiced-tour] fatal:", err?.message);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
