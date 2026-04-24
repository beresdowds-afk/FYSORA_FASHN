import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DisclaimerAcknowledgment {
  id: string;
  user_id: string;
  acknowledgment_type: string;
  disclaimer_version: string;
  acknowledged_at: string;
  context: string;
  metadata: Record<string, any>;
}

export const CURRENT_DISCLAIMER_VERSION = "1.0";

export const DISCLAIMER_TYPES = {
  PLATFORM_TERMS: "platform_terms",
  INTERMEDIARY_CAVEAT: "intermediary_caveat",
  QUALITY_DISCLAIMER: "quality_disclaimer",
  TAILOR_CONTRACT_TERMS: "tailor_contract_terms",
  ORG_AGREEMENT: "org_agreement",
} as const;

export const DISCLAIMER_TEXTS = {
  intermediary_caveat: {
    title: "Platform Intermediary Disclaimer",
    short: "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) operates as a neutral technology platform connecting Organizations, Tailors, and Customers.",
    full: `IMPORTANT NOTICE — PLATFORM ROLE & LIABILITY LIMITATION

FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) ("FSA", "the Platform") operates solely as a neutral technology intermediary that connects Organizations, Tailors, and Customers. By using this platform, you expressly acknowledge and agree to the following:

1. NO QUALITY GUARANTEE: FSA does not guarantee, warrant, or endorse the quality, accuracy, timeliness, or suitability of any services provided by Organizations or Tailors registered on the platform. All work is performed by independent third parties, not by FSA.

2. NO EMPLOYMENT RELATIONSHIP: Organizations and Tailors are independent operators. FSA does not employ, supervise, direct, or control any Organization or Tailor. Any subcontract or delegation arrangement between Organizations and Tailors is solely between those parties.

3. CUSTOMER RESPONSIBILITY: Customers engage with Organizations and Tailors at their own risk. FSA is not a party to any agreement between Customers and service providers. Disputes arising from service quality, delivery timelines, or craftsmanship are between the Customer and the respective Organization/Tailor.

4. LIMITATION OF LIABILITY: To the maximum extent permitted by law, FSA shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from:
   (a) The quality or outcome of tailoring or fashion services;
   (b) Any dispute between Organizations, Tailors, and/or Customers;
   (c) Financial losses resulting from third-party actions or omissions;
   (d) Breach of any agreement between platform users.

5. DISPUTE RESOLUTION: While FSA provides dispute resolution tools as a courtesy, FSA acts only as a facilitator and does not adjudicate or bear responsibility for the outcome of any dispute.

6. INDEMNIFICATION: All users agree to indemnify and hold harmless FSA, its officers, directors, employees, and agents from any claims, damages, or expenses arising from their use of the platform or interactions with other users.

By continuing, you acknowledge that you have read, understood, and agree to these terms.`,
  },
  quality_disclaimer: {
    title: "Quality & Service Disclaimer",
    short: "All tailoring services are provided by independent third parties. FSA does not guarantee workmanship quality.",
    full: "FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) does not manufacture, design, or produce any garments. All fashion and tailoring services advertised on this platform are provided exclusively by independent Organizations and Tailors who have registered on the platform. FSA bears no responsibility for the quality, fit, materials used, delivery timelines, or customer satisfaction with respect to any order fulfilled through this platform.",
  },
  tailor_contract_terms: {
    title: "Subcontract Agreement Terms",
    short: "Subcontract arrangements are between Organizations and Tailors. FSA facilitates but does not guarantee payment or performance.",
    full: "Any subcontract agreement between an Organization and a Tailor facilitated through FYSORA FASHN (FYSORA FASHN (Fashion Stitches Africa) Africa) is a direct agreement between those two parties. FSA's role is limited to providing the technology infrastructure for contract management, order delegation, and payment processing. FSA charges an agency fee for facilitating these transactions but assumes no liability for either party's performance, payment, or compliance with the subcontract terms.",
  },
};

export const useDisclaimerAcknowledgments = () => {
  const { user } = useAuth();
  const [acknowledgments, setAcknowledgments] = useState<DisclaimerAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAcknowledgments = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("disclaimer_acknowledgments")
      .select("*")
      .eq("user_id", user.id);
    setAcknowledgments((data as DisclaimerAcknowledgment[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAcknowledgments(); }, [fetchAcknowledgments]);

  const hasAcknowledged = (type: string, version: string = CURRENT_DISCLAIMER_VERSION) => {
    return acknowledgments.some(a => a.acknowledgment_type === type && a.disclaimer_version === version);
  };

  const acknowledge = async (type: string, context: string = "registration") => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("disclaimer_acknowledgments").insert({
      user_id: user.id,
      acknowledgment_type: type,
      disclaimer_version: CURRENT_DISCLAIMER_VERSION,
      context,
      metadata: { timestamp: new Date().toISOString() },
    } as any);
    if (!error) await fetchAcknowledgments();
    return { error };
  };

  return { acknowledgments, loading, hasAcknowledged, acknowledge, refetch: fetchAcknowledgments };
};
