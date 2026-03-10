import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── WhatChimp API Keys ──
export const useWhatChimpKeys = (orgId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const keys = useQuery({
    queryKey: ["whatchimp-keys", orgId],
    queryFn: async () => {
      let query = supabase.from("whatchimp_api_keys").select("*").order("created_at", { ascending: false });
      if (orgId) query = query.eq("org_id", orgId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertKey = useMutation({
    mutationFn: async (payload: {
      owner_id: string; owner_type: string; org_id?: string;
      api_key: string; whatsapp_number?: string; label?: string;
    }) => {
      const { error } = await supabase.from("whatchimp_api_keys").upsert(
        payload as any,
        { onConflict: "owner_id,owner_type" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatchimp-keys"] });
      toast({ title: "WhatChimp API key saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatchimp_api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatchimp-keys"] });
      toast({ title: "Key deleted" });
    },
  });

  return { keys, upsertKey, deleteKey };
};

// ── Platform Phone Numbers ──
export const usePlatformPhoneNumbers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const numbers = useQuery({
    queryKey: ["platform-phone-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_phone_numbers")
        .select("*")
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateNumber = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("platform_phone_numbers").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-phone-numbers"] });
      toast({ title: "Phone number updated" });
    },
  });

  const addNumber = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("platform_phone_numbers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-phone-numbers"] });
      toast({ title: "Phone number added" });
    },
  });

  const deleteNumber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_phone_numbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-phone-numbers"] });
      toast({ title: "Phone number removed" });
    },
  });

  return { numbers, updateNumber, addNumber, deleteNumber };
};

// ── Comms Provider Status (Monitoring) ──
export const useCommsProviderStatus = () => {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ["comms-provider-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comms_provider_status")
        .select("*")
        .order("provider");
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const checkTermiiBalance = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("termii-api", {
        body: { action: "get_balance" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comms-provider-status"] });
    },
  });

  const checkWhatChimpStatus = useMutation({
    mutationFn: async (params: { owner_id: string; owner_type?: string }) => {
      const { data, error } = await supabase.functions.invoke("whatchimp-send", {
        body: { action: "get_status", owner_id: params.owner_id, owner_type: params.owner_type || "organization" },
      });
      if (error) throw error;
      return data;
    },
  });

  return { status, checkTermiiBalance, checkWhatChimpStatus };
};

// ── Termii Campaigns ──
export const useTermiiCampaigns = (orgId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const campaigns = useQuery({
    queryKey: ["termii-campaigns", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("termii_campaigns")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const createCampaign = useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("termii_campaigns").insert({
        ...payload,
        org_id: orgId,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["termii-campaigns", orgId] });
      toast({ title: "Campaign created" });
    },
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const campaign = campaigns.data?.find((c: any) => c.id === campaignId);
      if (!campaign) throw new Error("Campaign not found");

      const { data, error } = await supabase.functions.invoke("termii-api", {
        body: {
          action: "send_campaign",
          message: campaign.message_template,
          phonebook_id: campaign.phonebook_id,
          channel: campaign.campaign_type,
          sender_name: campaign.sender_id,
        },
      });
      if (error) throw error;

      // Update status
      await supabase.from("termii_campaigns").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        termii_campaign_id: data?.data?.campaign_id || null,
      } as any).eq("id", campaignId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["termii-campaigns", orgId] });
      toast({ title: "Campaign sent" });
    },
  });

  return { campaigns, createCampaign, sendCampaign };
};

// ── Termii Phonebooks ──
export const useTermiiPhonebooks = (orgId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const phonebooks = useQuery({
    queryKey: ["termii-phonebooks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("termii_phonebooks")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const createPhonebook = useMutation({
    mutationFn: async (payload: { phonebook_name: string; description?: string }) => {
      // Create in Termii first
      const { data: termiiData } = await supabase.functions.invoke("termii-api", {
        body: { action: "create_phonebook", phonebook_name: payload.phonebook_name, description: payload.description },
      });

      const { error } = await supabase.from("termii_phonebooks").insert({
        org_id: orgId,
        phonebook_name: payload.phonebook_name,
        description: payload.description,
        termii_phonebook_id: termiiData?.data?.id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["termii-phonebooks", orgId] });
      toast({ title: "Phonebook created" });
    },
  });

  return { phonebooks, createPhonebook };
};

// ── Termii OTP ──
export const useTermiiOTP = () => {
  const sendOTP = useMutation({
    mutationFn: async (params: { to: string; sender_id?: string; message_text?: string }) => {
      const { data, error } = await supabase.functions.invoke("termii-api", {
        body: { action: "send_otp", ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async (params: { pin_id: string; pin: string }) => {
      const { data, error } = await supabase.functions.invoke("termii-api", {
        body: { action: "verify_otp", to: params.pin_id, otp_pin: params.pin },
      });
      if (error) throw error;
      return data;
    },
  });

  return { sendOTP, verifyOTP };
};
