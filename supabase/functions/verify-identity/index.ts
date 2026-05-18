import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Local validation patterns (fallback when no external provider is configured)
const ID_PATTERNS: Record<string, { pattern: RegExp; description: string }> = {
  nin: { pattern: /^\d{11}$/, description: "11-digit National Identification Number" },
  bvn: { pattern: /^\d{11}$/, description: "11-digit Bank Verification Number" },
  voters_card: { pattern: /^[A-Z0-9]{19}$/, description: "19-character Voter's Card Number" },
  ghana_card: { pattern: /^GHA-\d{9}-\d$/, description: "Ghana Card Number (GHA-XXXXXXXXX-X)" },
  kenyan_id: { pattern: /^\d{7,8}$/, description: "7-8 digit Kenyan National ID" },
  sa_id: { pattern: /^\d{13}$/, description: "13-digit South African ID Number" },
  national_id: { pattern: /^[A-Z0-9]{6,20}$/i, description: "6-20 character alphanumeric ID" },
  passport: { pattern: /^[A-Z0-9]{6,12}$/i, description: "6-12 character passport number" },
  drivers_license: { pattern: /^[A-Z0-9]{6,20}$/i, description: "6-20 character license number" },
};

const BIZ_PATTERNS: Record<string, { pattern: RegExp; description: string }> = {
  cac: { pattern: /^(RC|BN|IT)\d{4,8}$/i, description: "CAC Registration (RC/BN/IT + 4-8 digits)" },
  tin: { pattern: /^\d{8,15}$/, description: "Tax Identification Number (8-15 digits)" },
  ghana_rg: { pattern: /^CS\d{6,10}$/i, description: "Ghana Registrar General (CS + 6-10 digits)" },
  kenya_brn: { pattern: /^(PVT|CPR|BNS)-\d{4,10}$/i, description: "Kenya BRN (PVT/CPR/BNS-XXXX)" },
  cipc: { pattern: /^\d{4}\/\d{6}\/\d{2}$/, description: "CIPC Registration (YYYY/XXXXXX/XX)" },
  generic: { pattern: /^[A-Z0-9\-\/]{4,30}$/i, description: "4-30 character registration number" },
};

// Country code to country mapping
const COUNTRY_FROM_ID: Record<string, string> = {
  nin: "NG", bvn: "NG", voters_card: "NG", cac: "NG", tin: "NG",
  ghana_card: "GH", ghana_rg: "GH",
  kenyan_id: "KE", kenya_brn: "KE",
  sa_id: "ZA", cipc: "ZA",
};

interface ProviderConfig {
  provider: string;
  is_active: boolean;
  priority: number;
  supported_countries: string[];
  supported_id_types: string[];
  supported_entity_types: string[];
  cost_per_verification: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both old and new API formats
    const type = body.type || body.id_type;
    const number = body.number || body.id_number;
    const entity_type = body.entity_type || "profile";
    const entity_id = body.entity_id;
    const country = body.country || COUNTRY_FROM_ID[type] || "NG";
    const selfie_image = body.selfie_image;

    if (!type || !number) {
      return new Response(JSON.stringify({ error: "Missing required fields: type and number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cleanNumber = number.trim().toUpperCase();

    // 1. Fetch active providers sorted by priority
    const { data: providers } = await serviceClient
      .from("verification_provider_config")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    // 2. Find best provider for this verification
    const activeProviders = (providers || []) as ProviderConfig[];
    console.log(`[verify-identity] type=${type} country=${country} entity=${entity_type} active_providers=${activeProviders.length}`);
    const selectedProvider = activeProviders.find(p => 
      p.supported_countries.includes(country) &&
      p.supported_id_types.includes(type) &&
      p.supported_entity_types.includes(entity_type)
    );

    let result: { valid: boolean; confidence?: number; message: string; provider: string; provider_ref?: string; biometrics?: string[] };

    if (selectedProvider) {
      // Use external provider
      result = await verifyWithProvider(selectedProvider.provider, {
        type, number: cleanNumber, country, entity_type, selfie_image,
      });
      
      // Log attempt
      await serviceClient.from("identity_verification_attempts").insert({
        entity_type,
        entity_id: entity_id || null,
        provider: selectedProvider.provider,
        verification_type: entity_type === "organization" ? "business_registration" : "identity",
        id_type: type,
        id_number_masked: maskNumber(cleanNumber),
        country,
        status: result.valid ? "verified" : "failed",
        confidence_score: result.confidence || null,
        provider_reference: result.provider_ref || null,
        cost_usd: selectedProvider.cost_per_verification,
        biometrics_used: result.biometrics || [],
        error_message: result.valid ? null : result.message,
      });

      // Increment monthly usage safely
      await serviceClient.from("verification_provider_config")
        .update({ monthly_used: ((selectedProvider as any).monthly_used || 0) + 1 })
        .eq("provider", selectedProvider.provider);

    } else {
      console.log(`[verify-identity] no provider matched — using local format validation`);
      // Fallback to local validation
      result = localValidation(type, cleanNumber, entity_type);
      
      if (entity_id) {
        await serviceClient.from("identity_verification_attempts").insert({
          entity_type,
          entity_id,
          provider: "local",
          verification_type: entity_type === "organization" ? "business_registration" : "identity",
          id_type: type,
          id_number_masked: maskNumber(cleanNumber),
          country,
          status: result.valid ? "verified" : "failed",
          confidence_score: result.confidence || null,
          cost_usd: 0,
          biometrics_used: [],
          error_message: result.valid ? null : result.message,
        });
      }
    }

    // 3. Update entity record if entity_id provided
    if (entity_id && entity_type === "profile") {
      await serviceClient.from("profiles").update({
        identity_number: cleanNumber,
        identity_type: type,
        identity_verified: result.valid,
        identity_verified_at: result.valid ? new Date().toISOString() : null,
        identity_verification_status: result.valid ? "verified" : "failed",
      }).eq("id", entity_id);

      await serviceClient.from("audit_logs").insert({
        user_id: entity_id,
        action: "identity_verification",
        entity_type: "profile",
        entity_id,
        metadata: { type, provider: result.provider, status: result.valid ? "verified" : "failed", number_masked: maskNumber(cleanNumber) },
      });
    } else if (entity_id && entity_type === "organization") {
      await serviceClient.from("organizations").update({
        business_reg_number: cleanNumber,
        business_reg_type: type,
        business_reg_verified: result.valid,
        business_reg_verified_at: result.valid ? new Date().toISOString() : null,
        business_reg_verification_status: result.valid ? "verified" : "failed",
      }).eq("id", entity_id);

      await serviceClient.from("audit_logs").insert({
        user_id: entity_id,
        action: "business_reg_verification",
        entity_type: "organization",
        entity_id,
        metadata: { type, provider: result.provider, status: result.valid ? "verified" : "failed", number_masked: maskNumber(cleanNumber) },
      });
    }

    return new Response(JSON.stringify({
      valid: result.valid,
      status: result.valid ? "verified" : "failed",
      provider: result.provider,
      confidence: result.confidence,
      message: result.message,
      biometrics_used: result.biometrics || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Verification error:", err);
    return new Response(JSON.stringify({ error: "Verification service error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Provider-specific verification ──────────────────────────────────

async function verifyWithProvider(
  provider: string,
  params: { type: string; number: string; country: string; entity_type: string; selfie_image?: string }
): Promise<{ valid: boolean; confidence?: number; message: string; provider: string; provider_ref?: string; biometrics?: string[] }> {
  
  switch (provider) {
    case "smile_id":
      return await verifyWithSmileID(params);
    case "youverify":
      return await verifyWithYouVerify(params);
    case "identitypass":
      return await verifyWithIdentityPass(params);
    case "persona":
      return await verifyWithPersona(params);
    default:
      return localValidation(params.type, params.number, params.entity_type);
  }
}

async function verifyWithSmileID(params: { type: string; number: string; country: string; selfie_image?: string }) {
  const partnerId = Deno.env.get("SMILE_ID_PARTNER_ID");
  const apiKey = Deno.env.get("SMILE_ID_API_KEY");
  
  if (!partnerId || !apiKey) {
    console.warn("Smile ID credentials not configured, falling back to local validation");
    return localValidation(params.type, params.number, "profile");
  }

  try {
    const idTypeMap: Record<string, string> = {
      nin: "NIN", bvn: "BVN", passport: "PASSPORT", drivers_license: "DRIVERS_LICENSE",
      voters_card: "VOTER_ID", ghana_card: "SSNIT", kenyan_id: "NATIONAL_ID", sa_id: "NATIONAL_ID",
    };

    const response = await fetch("https://api.smileidentity.com/v1/id_verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        partner_id: partnerId,
        id_number: params.number,
        id_type: idTypeMap[params.type] || "NATIONAL_ID",
        country: params.country,
        ...(params.selfie_image ? { source_sdk: "rest_api", images: [{ image_type_id: 0, image: params.selfie_image }] } : {}),
      }),
    });

    const data = await response.json();
    const verified = data.Actions?.Verify_ID_Number === "Verified" || data.ResultCode === "1012";
    const biometrics: string[] = [];
    if (params.selfie_image && data.Actions?.Selfie_Check === "Passed") biometrics.push("face_match");
    if (data.Actions?.Liveness_Check === "Passed") biometrics.push("liveness");

    return {
      valid: verified,
      confidence: data.ConfidenceValue ? parseFloat(data.ConfidenceValue) : undefined,
      message: verified ? "Identity verified via Smile ID" : "Verification failed. Please check your details.",
      provider: "smile_id",
      provider_ref: data.SmileJobID || data.ResultCode,
      biometrics,
    };
  } catch (err) {
    console.error("Smile ID API error:", err);
    return localValidation(params.type, params.number, "profile");
  }
}

async function verifyWithYouVerify(params: { type: string; number: string; country: string }) {
  const apiKey = Deno.env.get("YOUVERIFY_API_KEY");
  
  if (!apiKey) {
    console.warn("YouVerify credentials not configured, falling back to local validation");
    return localValidation(params.type, params.number, "profile");
  }

  try {
    const endpointMap: Record<string, string> = {
      bvn: "v2/api/identity/ng/bvn",
      nin: "v2/api/identity/ng/nin",
      voters_card: "v2/api/identity/ng/vin",
      passport: "v2/api/identity/ng/passport",
      drivers_license: "v2/api/identity/ng/drivers-license",
    };

    const endpoint = endpointMap[params.type] || "v2/api/identity/ng/nin";
    const response = await fetch(`https://api.youverify.co/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": apiKey,
      },
      body: JSON.stringify({
        id: params.number,
        isSubjectConsent: true,
      }),
    });

    const data = await response.json();
    const verified = data.success && data.statusCode === 200;

    return {
      valid: verified,
      confidence: verified ? 95 : 0,
      message: verified ? "Identity verified via YouVerify" : data.message || "Verification failed.",
      provider: "youverify",
      provider_ref: data.data?.id || null,
    };
  } catch (err) {
    console.error("YouVerify API error:", err);
    return localValidation(params.type, params.number, "profile");
  }
}

async function verifyWithIdentityPass(params: { type: string; number: string; country: string }) {
  const apiKey = Deno.env.get("IDENTITYPASS_API_KEY");
  
  if (!apiKey) {
    console.warn("IdentityPass credentials not configured, falling back to local validation");
    return localValidation(params.type, params.number, "profile");
  }

  try {
    const endpointMap: Record<string, string> = {
      bvn: "api/v2/biometrics/merchant/data/verification/bvn",
      nin: "api/v2/biometrics/merchant/data/verification/nin_wo_face",
      voters_card: "api/v2/biometrics/merchant/data/verification/voters_card",
      passport: "api/v2/biometrics/merchant/data/verification/national_passport",
      drivers_license: "api/v2/biometrics/merchant/data/verification/drivers_license",
    };

    const endpoint = endpointMap[params.type] || "api/v2/biometrics/merchant/data/verification/nin_wo_face";
    const response = await fetch(`https://api.myidentitypass.com/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ number: params.number }),
    });

    const data = await response.json();
    const verified = data.status === true && data.detail === "Verification Successful";

    return {
      valid: verified,
      confidence: verified ? 90 : 0,
      message: verified ? "Identity verified via IdentityPass" : data.detail || "Verification failed.",
      provider: "identitypass",
      provider_ref: data.transaction_ref || null,
    };
  } catch (err) {
    console.error("IdentityPass API error:", err);
    return localValidation(params.type, params.number, "profile");
  }
}

async function verifyWithPersona(params: { type: string; number: string; country: string }) {
  const apiKey = Deno.env.get("PERSONA_API_KEY");
  
  if (!apiKey) {
    console.warn("Persona credentials not configured, falling back to local validation");
    return localValidation(params.type, params.number, "profile");
  }

  // Persona uses a different flow (inquiry-based), so we do a simplified check
  try {
    const response = await fetch("https://withpersona.com/api/v1/verifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Persona-Version": "2023-01-05",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "identification-number": params.number,
            "country-code": params.country,
          },
        },
      }),
    });

    const data = await response.json();
    const verified = data.data?.attributes?.status === "passed";

    return {
      valid: verified,
      confidence: verified ? 92 : 0,
      message: verified ? "Identity verified via Persona" : "Verification failed.",
      provider: "persona",
      provider_ref: data.data?.id || null,
    };
  } catch (err) {
    console.error("Persona API error:", err);
    return localValidation(params.type, params.number, "profile");
  }
}

// ── Local validation (fallback) ─────────────────────────────────────

function localValidation(type: string, number: string, entity_type: string) {
  const patterns = entity_type === "organization" 
    ? (BIZ_PATTERNS[type] || BIZ_PATTERNS.generic)
    : (ID_PATTERNS[type] || ID_PATTERNS.national_id);
  
  const isValid = patterns.pattern.test(number);
  let checksumValid = true;

  // NIN and BVN are NOT Luhn-protected (Luhn is a credit-card checksum).
  // Format check (11 digits) is the strongest local validation we can do
  // without a live provider call. Real validation happens via Smile ID /
  // YouVerify / IdentityPass when their keys are configured.
  if (type === "sa_id" && isValid) {
    const month = parseInt(number.substring(2, 4));
    const day = parseInt(number.substring(4, 6));
    checksumValid = month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }

  const valid = isValid && checksumValid;
  return {
    valid,
    confidence: valid ? 70 : 0,
    message: valid
      ? "Format validated locally (no external KYC provider active)"
      : `Invalid ${patterns.description}. Please check the number and try again.`,
    provider: "local",
  };
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function maskNumber(num: string): string {
  if (num.length <= 4) return "****";
  return num.substring(0, 2) + "*".repeat(num.length - 4) + num.substring(num.length - 2);
}
