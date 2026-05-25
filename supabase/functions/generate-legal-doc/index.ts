import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REGION_REGULATIONS: Record<string, string> = {
  "NG": "Nigeria Data Protection Regulation (NDPR), Nigerian Consumer Protection Framework, CBN Guidelines",
  "GH": "Ghana Data Protection Act 2012 (Act 843), Electronic Transactions Act 2008",
  "KE": "Kenya Data Protection Act 2019, Kenya Consumer Protection Act 2012",
  "ZA": "South Africa Protection of Personal Information Act (POPIA), Consumer Protection Act 68 of 2008, Electronic Communications and Transactions Act",
  "TZ": "Tanzania Electronic and Postal Communications Act (EPOCA), Cybercrimes Act 2015",
  "UG": "Uganda Data Protection and Privacy Act 2019, Computer Misuse Act 2011",
  "RW": "Rwanda Law Relating to the Protection of Personal Data and Privacy (2021)",
  "ET": "Ethiopia - no comprehensive data protection yet, general Civil Code applies",
  "US": "United States - FTC Act, CAN-SPAM Act, CCPA (California), state consumer protection statutes",
  "CA": "Canada - Personal Information Protection and Electronic Documents Act (PIPEDA), Canada's Anti-Spam Legislation (CASL), Consumer Protection Acts (provincial), Competition Act",
  "GB": "United Kingdom GDPR (UK-GDPR), Data Protection Act 2018, Consumer Rights Act 2015",
  "EU": "EU General Data Protection Regulation (GDPR), Consumer Rights Directive 2011/83/EU, Digital Services Act",
  "AE": "UAE Federal Law No. 45 of 2021 on Personal Data Protection, Consumer Protection Federal Law No. 15 of 2020",
  "IN": "India Digital Personal Data Protection Act 2023, Consumer Protection Act 2019, IT Act 2000",
  "DEFAULT": "General international best practices for data protection and consumer rights"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated user — this endpoint spends platform AI credits.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { docType, region, orgName, orgCountry } = await req.json();

    if (!docType || !region) {
      return new Response(JSON.stringify({ error: "docType and region required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const regulations = REGION_REGULATIONS[region] || REGION_REGULATIONS["DEFAULT"];
    const effectiveOrgName = orgName || "FYSORA FASHN (Fashion Stitches Africa)";
    const platformName = "FYSORA FASHN (Fashion Stitches Africa)";

    const docTypePrompts: Record<string, string> = {
      "terms": `Generate comprehensive Terms & Conditions for "${effectiveOrgName}", a fashion/tailoring business operating on the ${platformName} platform. The business is based in ${orgCountry || region}. 

The T&C must comply with: ${regulations}.

Cover these sections:
1. Definitions and Interpretation
2. Account Registration and Eligibility
3. Services Description (custom tailoring, AI measurements, virtual try-on, appointment booking)
4. Orders, Pricing, and Payment Terms
5. Cancellation and Refund Policy
6. Delivery and Shipping
7. Intellectual Property
8. Limitation of Liability (platform is a neutral intermediary)
9. Dispute Resolution
10. Privacy (reference the Privacy Policy)
11. Governing Law and Jurisdiction
12. Amendments and Updates
13. Contact Information

IMPORTANT: Include a clear disclaimer that ${platformName} acts as a technology platform and neutral intermediary. It does NOT guarantee the quality, integrity, or actions of third-party organizations, tailors, or customers.`,

      "privacy": `Generate a comprehensive Privacy Policy for "${effectiveOrgName}", a fashion/tailoring business on the ${platformName} platform, operating in ${orgCountry || region}.

Must comply with: ${regulations}.

Cover:
1. Information We Collect (personal data, measurements, payment info, device data)
2. How We Use Your Information
3. AI-Powered Features (body measurement AI, virtual try-on) - explain data processing
4. Legal Basis for Processing
5. Data Sharing and Third Parties (payment processors like Paystack, communication providers)
6. International Data Transfers
7. Data Retention
8. Your Rights (access, rectification, deletion, portability, objection)
9. Children's Privacy
10. Cookies and Tracking
11. Data Security Measures
12. Changes to This Policy
13. Data Protection Officer / Contact
14. Complaints and Regulatory Authority`,

      "refund": `Generate a Refund & Returns Policy for "${effectiveOrgName}", a custom fashion/tailoring business on the ${platformName} platform, operating in ${orgCountry || region}.

Must comply with: ${regulations}.

Cover:
1. Scope (custom-made garments, off-the-rack items, AI measurement sessions)
2. Custom Order Policy (limited refund due to bespoke nature)
3. Quality Issues and Defects
4. Refund Process and Timeline
5. Cancellation Before Production
6. Partial Refunds
7. Non-Refundable Items/Services
8. Dispute Resolution Process
9. Platform Role (neutral intermediary disclaimer)
10. Contact for Refund Requests`,

      "acceptable-use": `Generate an Acceptable Use Policy for "${effectiveOrgName}" on the ${platformName} platform, operating in ${orgCountry || region}.

Must comply with: ${regulations}.

Cover:
1. Permitted Use
2. Prohibited Activities (fraud, harassment, IP infringement)
3. User-Generated Content (reviews, photos)
4. AI Feature Usage (measurements, virtual try-on)
5. Account Security Responsibilities
6. Reporting Violations
7. Enforcement and Consequences
8. Platform Rights`
    };

    const systemPrompt = `You are a legal document generator specializing in African and international commercial law. Generate professional, legally sound documents formatted in clean Markdown. Use proper legal language while remaining accessible. Include region-specific clauses where the law requires. Add the current date as the effective date. Do NOT include any preamble or explanation — output only the legal document itself.`;

    const userPrompt = docTypePrompts[docType];
    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Invalid docType. Use: terms, privacy, refund, acceptable-use" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate document" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-legal-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
