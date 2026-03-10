import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, Send, Image, Share2, Instagram, Facebook,
  Twitter, Youtube, Linkedin, Loader2, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-lg bg-green-500/10">
          <MessageSquare size={18} className="text-green-600" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-lg">WhatChimp Integration</h3>
          <p className="text-xs text-muted-foreground">WhatsApp Business & Social Media via WhatChimp CPaaS</p>
        </div>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList className="flex-wrap">
          <TabsTrigger value="whatsapp" className="gap-1.5"><MessageSquare size={14} /> WhatsApp</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><Send size={14} /> Templates</TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5"><Share2 size={14} /> Social Media</TabsTrigger>
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
                <Input placeholder="https://example.com/image.jpg" value={waMediaUrl} onChange={e => setWaMediaUrl(e.target.value)} />
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

        {/* Social Media */}
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
                <Input placeholder="https://example.com/image.jpg" value={socialMediaUrl} onChange={e => setSocialMediaUrl(e.target.value)} />
              </div>
              <Button onClick={postToSocial} disabled={socialSending || !socialContent} className="w-full gap-1.5" variant="hero">
                {socialSending ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                Post to {socialPlatforms.find(p => p.id === socialPlatform)?.label}
              </Button>
            </div>

            {/* Connected Account Links Info */}
            <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs font-medium mb-2">💡 Social Media Account Links</p>
              <p className="text-[11px] text-muted-foreground">
                Social media account URLs are synced from user profiles in the Catalogue → Social Sync panel. 
                Ensure your organization's social accounts are linked there for auto-posting to work.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatChimpPanel;
