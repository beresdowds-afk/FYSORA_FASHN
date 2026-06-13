import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  MessageSquare, Send, Share2, Instagram, Facebook,
  Twitter, Youtube, Linkedin, Loader2, Key, Eye, EyeOff,
  Save, Plus, Trash2, Link2, ExternalLink, Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWhatChimpKeys } from "@/hooks/useCommsArchitecture";
import ImageUrlField from "@/components/shared/ImageUrlField";

interface WhatChimpPanelProps {
  orgId: string;
  role: string | null;
}

const TikTokIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const socialPlatforms = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "twitter", label: "X / Twitter", icon: Twitter },
  { id: "tiktok", label: "TikTok", icon: TikTokIcon },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
];

const WhatChimpPanel = ({ orgId, role }: WhatChimpPanelProps) => {
  const { toast } = useToast();
  const isAdmin = role === "org_admin" || role === "manager" || role === "super_admin";
  const { keys, upsertKey, deleteKey } = useWhatChimpKeys(orgId);

  // WhatsApp send state
  const [waTo, setWaTo] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waMediaUrl, setWaMediaUrl] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<string | null>(null);

  // Social post state
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialContent, setSocialContent] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [socialSending, setSocialSending] = useState(false);

  // Template send
  const [templateTo, setTemplateTo] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateSending, setTemplateSending] = useState(false);

  // API Key management
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyForm, setKeyForm] = useState({ api_key: "", whatsapp_number: "", label: "" });
  const [showKey, setShowKey] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Social link sync
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [savingLinks, setSavingLinks] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    loadSocialLinks();
  }, [orgId]);

  const loadSocialLinks = async () => {
    const { data } = await supabase
      .from("social_sync_configs")
      .select("platform, account_url")
      .eq("owner_id", orgId);
    if (data) {
      const links: Record<string, string> = {};
      data.forEach((d: any) => { links[d.platform] = d.account_url || ""; });
      setSocialLinks(links);
    }
  };

  const saveSocialLinks = async () => {
    setSavingLinks(true);
    for (const [platform, url] of Object.entries(socialLinks)) {
      if (!url) continue;
      const { data: existing } = await supabase
        .from("social_sync_configs")
        .select("id")
        .eq("owner_id", orgId)
        .eq("platform", platform)
        .maybeSingle();

      if (existing) {
        await supabase.from("social_sync_configs")
          .update({ account_url: url } as any)
          .eq("id", existing.id);
      } else {
        await supabase.from("social_sync_configs").insert({
          owner_id: orgId,
          owner_type: "organization",
          org_id: orgId,
          platform,
          account_url: url,
          is_enabled: true,
        } as any);
      }
    }
    toast({ title: "Social media links saved" });
    setSavingLinks(false);
  };

  const sendWhatsApp = async () => {
    if (!waTo || !waMessage) return;
    setWaSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatchimp-send", {
        body: {
          action: "send_message",
          to: waTo,
          message: waMessage,
          media_url: waMediaUrl || undefined,
          org_id: orgId,
          owner_id: orgId,
          event_type: "manual_whatsapp",
          recipient_type: "customer",
        },
      });
      if (error) throw error;
      setWaResult("Message sent successfully via WhatChimp");
      toast({ title: "WhatsApp message sent" });
      setWaMessage("");
    } catch (err: any) {
      setWaResult(`Failed: ${err.message}`);
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    }
    setWaSending(false);
  };

  const postToSocial = async () => {
    if (!socialContent) return;
    setSocialSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatchimp-send", {
        body: {
          action: "post_social",
          social_platform: socialPlatform,
          social_content: socialContent,
          social_media_urls: socialMediaUrl ? [socialMediaUrl] : [],
          org_id: orgId,
          owner_id: orgId,
        },
      });
      if (error) throw error;
      toast({ title: `Posted to ${socialPlatform}` });
      setSocialContent("");
    } catch (err: any) {
      toast({ title: "Post failed", description: err.message, variant: "destructive" });
    }
    setSocialSending(false);
  };

  const sendTemplate = async () => {
    if (!templateTo || !templateName) return;
    setTemplateSending(true);
    try {
      await supabase.functions.invoke("whatchimp-send", {
        body: {
          action: "send_template",
          to: templateTo,
          template_name: templateName,
          org_id: orgId,
          owner_id: orgId,
        },
      });
      toast({ title: "Template message sent" });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    }
    setTemplateSending(false);
  };

  const handleSaveKey = async () => {
    if (!currentUserId || !keyForm.api_key) return;
    await upsertKey.mutateAsync({
      owner_id: currentUserId,
      owner_type: isAdmin ? "organization" : role === "tailor" ? "tailor" : "designer",
      org_id: orgId,
      api_key: keyForm.api_key,
      whatsapp_number: keyForm.whatsapp_number || undefined,
      label: keyForm.label || undefined,
    });
    setKeyDialogOpen(false);
    setKeyForm({ api_key: "", whatsapp_number: "", label: "" });
  };

  const maskKey = (val: string) => {
    if (val.length <= 8) return "••••••••";
    return val.slice(0, 6) + "••••••••" + val.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <MessageSquare size={18} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">WhatChimp Integration</h3>
            <p className="text-xs text-muted-foreground">WhatsApp Business & Social Media via WhatChimp CPaaS</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList className="flex-wrap">
          <TabsTrigger value="whatsapp" className="gap-1.5"><MessageSquare size={14} /> WhatsApp</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><Send size={14} /> Templates</TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5"><Share2 size={14} /> Social Media</TabsTrigger>
          <TabsTrigger value="social-links" className="gap-1.5"><Link2 size={14} /> Social Links</TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5"><Key size={14} /> API Keys</TabsTrigger>
        </TabsList>

        {/* WhatsApp Messaging */}
        <TabsContent value="whatsapp">
          <Card className="p-6">
            <h4 className="font-semibold text-sm mb-4">Send WhatsApp Message</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Recipient Number</Label>
                <Input placeholder="+234XXXXXXXXXX" value={waTo} onChange={e => setWaTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea placeholder="Type your message..." value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={4} />
              </div>
              <div>
                <Label className="text-xs">Media URL (optional)</Label>
                <ImageUrlField value={waMediaUrl} onChange={setWaMediaUrl} placeholder="https://example.com/image.jpg or upload" folder="whatsapp" />
              </div>
              <Button onClick={sendWhatsApp} disabled={waSending || !waTo || !waMessage} className="w-full gap-1.5">
                {waSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send via WhatChimp
              </Button>
              {waResult && (
                <div className="p-3 rounded-lg bg-muted text-sm">{waResult}</div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Template Messages */}
        <TabsContent value="templates">
          <Card className="p-6">
            <h4 className="font-semibold text-sm mb-4">Send Template Message</h4>
            <p className="text-xs text-muted-foreground mb-4">Use pre-approved WhatsApp Business templates.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Recipient Number</Label>
                <Input placeholder="+234XXXXXXXXXX" value={templateTo} onChange={e => setTemplateTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Template Name</Label>
                <Input placeholder="order_confirmation" value={templateName} onChange={e => setTemplateName(e.target.value)} />
              </div>
              <Button onClick={sendTemplate} disabled={templateSending || !templateTo || !templateName} className="w-full gap-1.5">
                {templateSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Template
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Social Media Posting */}
        <TabsContent value="social">
          <Card className="p-6">
            <h4 className="font-semibold text-sm mb-4">Post to Social Media</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Publish content to connected social media accounts via WhatChimp.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Platform</Label>
                <Select value={socialPlatform} onValueChange={setSocialPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {socialPlatforms.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <p.icon size={14} /> {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Content</Label>
                <Textarea placeholder="Write your social media post..." value={socialContent} onChange={e => setSocialContent(e.target.value)} rows={4} />
              </div>
              <div>
                <Label className="text-xs">Media URL (optional)</Label>
                <ImageUrlField value={socialMediaUrl} onChange={setSocialMediaUrl} placeholder="https://example.com/image.jpg or upload" folder="social" />
              </div>
              <Button onClick={postToSocial} disabled={socialSending || !socialContent} className="w-full gap-1.5" variant="hero">
                {socialSending ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                Post to {socialPlatforms.find(p => p.id === socialPlatform)?.label}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Social Media Links */}
        <TabsContent value="social-links">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={18} className="text-primary" />
              <h4 className="font-semibold text-sm">Social Media Account Links</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Link your social media profiles for synced posting via WhatChimp. Posts will be published to these accounts.
            </p>
            <div className="space-y-3">
              {socialPlatforms.map(p => {
                const Icon = p.icon;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder={`https://${p.id}.com/your-profile`}
                        value={socialLinks[p.id] || ""}
                        onChange={e => setSocialLinks(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    {socialLinks[p.id] && (
                      <a href={socialLinks[p.id]} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} className="text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                );
              })}
              <Button onClick={saveSocialLinks} disabled={savingLinks} className="w-full gap-1.5 mt-2">
                {savingLinks ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Social Links
              </Button>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-[11px] text-muted-foreground">
                💡 Linked accounts are used for synchronized posting via WhatChimp. Ensure your accounts are verified
                on the WhatChimp platform for auto-posting to work. Full sync settings are available in <strong>Catalogue → Social Sync</strong>.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Per-User API Keys */}
        <TabsContent value="api-keys">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Key size={16} className="text-primary" /> WhatChimp API Keys
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Each user (org admin, tailor, designer) can connect their own WhatChimp API key for personalized messaging.
                </p>
              </div>
              <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus size={14} className="mr-1" /> Add Key</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add WhatChimp API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label className="text-xs">Label (optional)</Label>
                      <Input
                        placeholder="e.g. My WhatsApp Business"
                        value={keyForm.label}
                        onChange={e => setKeyForm(p => ({ ...p, label: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">API Key</Label>
                      <div className="relative">
                        <Input
                          type={showKey ? "text" : "password"}
                          placeholder="Enter your WhatChimp API key"
                          value={keyForm.api_key}
                          onChange={e => setKeyForm(p => ({ ...p, api_key: e.target.value }))}
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">WhatsApp Number (optional)</Label>
                      <Input
                        placeholder="+234XXXXXXXXXX"
                        value={keyForm.whatsapp_number}
                        onChange={e => setKeyForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                      />
                    </div>
                    <Button className="w-full" onClick={handleSaveKey} disabled={upsertKey.isPending || !keyForm.api_key}>
                      {upsertKey.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
                      Save API Key
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Get your API key from <a href="https://whatchimp.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">whatchimp.com</a>.
                      Keys are stored securely and used for your personalized messaging.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {keys.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (keys.data || []).length === 0 ? (
              <div className="py-8 text-center">
                <Key size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No WhatChimp API keys configured.</p>
                <p className="text-xs text-muted-foreground mt-1">Add your key to start sending WhatsApp messages.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(keys.data || []).map((k: any) => (
                  <div key={k.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{k.label || "API Key"}</p>
                        <Badge variant="outline" className="text-[10px]">{k.owner_type}</Badge>
                        <Badge variant={k.is_active ? "default" : "secondary"} className="text-[10px]">
                          {k.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-1">{maskKey(k.api_key)}</p>
                      {k.whatsapp_number && (
                        <p className="text-xs text-muted-foreground mt-0.5">📱 {k.whatsapp_number}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => deleteKey.mutate(k.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-[11px] text-muted-foreground">
                  ⚠️ <strong>Admin Note:</strong> Per-user keys override the platform WhatChimp key. To manage platform-level keys,
                  visit the <strong>Super Admin → Keys & Secrets</strong> panel.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatChimpPanel;
