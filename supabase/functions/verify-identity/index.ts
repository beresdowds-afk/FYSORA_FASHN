import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation patterns for different ID types by country
const ID_PATTERNS: Record<string, { pattern: RegExp; description: string }> = {
  // Nigeria
  nin: { pattern: /^\d{11}$/, description: "11-digit National Identification Number" },
  bvn: { pattern: /^\d{11}$/, description: "11-digit Bank Verification Number" },
  voters_card: { pattern: /^[A-Z0-9]{19}$/, description: "19-character Voter's Card Number" },
  // Ghana
  ghana_card: { pattern: /^GHA-\d{9}-\d$/, description: "Ghana Card Number (GHA-XXXXXXXXX-X)" },
  // Kenya
  kenyan_id: { pattern: /^\d{7,8}$/, description: "7-8 digit Kenyan National ID" },
  // South Africa
  sa_id: { pattern: /^\d{13}$/, description: "13-digit South African ID Number" },
  // Generic
  national_id: { pattern: /^[A-Z0-9]{6,20}$/i, description: "6-20 character alphanumeric ID" },
  passport: { pattern: /^[A-Z0-9]{6,12}$/i, description: "6-12 character passport number" },
};

// Business registration patterns
const BIZ_PATTERNS: Record<string, { pattern: RegExp; description: string }> = {
  cac: { pattern: /^(RC|BN|IT)\d{4,8}$/i, description: "CAC Registration (RC/BN/IT + 4-8 digits)" },
  tin: { pattern: /^\d{8,15}$/, description: "Tax Identification Number (8-15 digits)" },
  ghana_rg: { pattern: /^CS\d{6,10}$/i, description: "Ghana Registrar General (CS + 6-10 digits)" },
  kenya_brn: { pattern: /^(PVT|CPR|BNS)-\d{4,10}$/i, description: "Kenya BRN (PVT/CPR/BNS-XXXX)" },
  cipc: { pattern: /^\d{4}\/\d{6}\/\d{2}$/, description: "CIPC Registration (YYYY/XXXXXX/XX)" },
  generic: { pattern: /^[A-Z0-9\-\/]{4,30}$/i, description: "4-30 character registration number" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, number, entity_type, entity_id } = await req.json();
    // type: identity type (nin, bvn, etc.) or biz type (cac, tin, etc.)
    // entity_type: "profile" or "organization"
    // entity_id: the profile id or org id

    if (!type || !number || !entity_type || !entity_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cleanNumber = number.trim().toUpperCase();

    if (entity_type === "profile") {
      // Verify identity number for tailors
      const patterns = ID_PATTERNS[type] || ID_PATTERNS.national_id;
      const isValid = patterns.pattern.test(cleanNumber);

      // Luhn check for NIN/BVN (basic checksum)
      let checksumValid = true;
      if ((type === "nin" || type === "bvn") && isValid) {
        checksumValid = luhnCheck(cleanNumber);
      }

      // SA ID date validation
      if (type === "sa_id" && isValid) {
        const birthDate = cleanNumber.substring(0, 6);
        const year = parseInt(birthDate.substring(0, 2));
        const month = parseInt(birthDate.substring(2, 4));
        const day = parseInt(birthDate.substring(4, 6));
        checksumValid = month >= 1 && month <= 12 && day >= 1 && day <= 31;
      }

      const status = isValid && checksumValid ? "verified" : "failed";

      await serviceClient.from("profiles").update({
        identity_number: cleanNumber,
        identity_type: type,
        identity_verified: status === "verified",
        identity_verified_at: status === "verified" ? new Date().toISOString() : null,
        identity_verification_status: status,
      }).eq("id", entity_id);

      // Audit log
      await serviceClient.from("audit_logs").insert({
        user_id: entity_id,
        action: "identity_verification",
        entity_type: "profile",
        entity_id,
        metadata: { type, status, number_masked: maskNumber(cleanNumber) },
      });

      return new Response(JSON.stringify({
        status,
        message: status === "verified"
          ? "Identity number verified successfully"
          : `Invalid ${patterns.description}. Please check and try again.`,
        expected_format: patterns.description,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (entity_type === "organization") {
      // Verify business registration number
      const patterns = BIZ_PATTERNS[type] || BIZ_PATTERNS.generic;
      const isValid = patterns.pattern.test(cleanNumber);

      const status = isValid ? "verified" : "failed";

      await serviceClient.from("organizations").update({
        business_reg_number: cleanNumber,
        business_reg_type: type,
        business_reg_verified: status === "verified",
        business_reg_verified_at: status === "verified" ? new Date().toISOString() : null,
        business_reg_verification_status: status,
      }).eq("id", entity_id);

      // Audit log
      await serviceClient.from("audit_logs").insert({
        user_id: entity_id,
        action: "business_reg_verification",
        entity_type: "organization",
        entity_id,
        metadata: { type, status, number_masked: maskNumber(cleanNumber) },
      });

      return new Response(JSON.stringify({
        status,
        message: status === "verified"
          ? "Business registration verified successfully"
          : `Invalid ${patterns.description}. Please check and try again.`,
        expected_format: patterns.description,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid entity_type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: corsHeaders,
    });
  }
});

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function maskNumber(num: string): string {
  if (num.length <= 4) return "****";
  return num.substring(0, 2) + "*".repeat(num.length - 4) + num.substring(num.length - 2);
}
