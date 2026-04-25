import { useState } from "react";
import { useSeoOptimization } from "@/hooks/useSeoOptimization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Send } from "lucide-react";

interface Props { orgId?: string; }

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  queued: "secondary",
  routed: "default",
  completed: "default",
  failed: "destructive",
};

const SeoOptimizationPanel = ({ orgId }: Props) => {
  const { requests, submit, submitting, perRequestPriceUsd } = useSeoOptimization(orgId);
  const [targetUrl, setTargetUrl] = useState("");
  const [scope, setScope] = useState<"page" | "site" | "product" | "blog">("page");
  const [keywords, setKeywords] = useState("");
  const [notes, setNotes] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    await submit({
      targetUrl: targetUrl.trim(),
      scope,
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
      orgId,
    });
    setTargetUrl(""); setKeywords(""); setNotes("");
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Search size={22} className="text-primary" /> SEO Optimization
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          All SEO requests are routed to <strong>Sentinel MCP</strong> for processing.
          Billed at <strong>${perRequestPriceUsd.toFixed(2)} per request</strong>, plus your active SEO subscription.
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="seo-url">Target URL</Label>
              <Input id="seo-url" type="url" required placeholder="https://example.com/products/agbada"
                value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Single page</SelectItem>
                  <SelectItem value="product">Product page</SelectItem>
                  <SelectItem value="blog">Blog post</SelectItem>
                  <SelectItem value="site">Whole site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="seo-keywords">Target keywords (comma-separated)</Label>
            <Input id="seo-keywords" placeholder="agbada, nigerian fashion, custom tailor"
              value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="seo-notes">Notes for Sentinel MCP (optional)</Label>
            <Textarea id="seo-notes" rows={2} placeholder="Audience, region, brand voice…"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="gap-2">
            <Send size={14} /> {submitting ? "Routing…" : "Route to Sentinel MCP"}
          </Button>
        </form>
      </Card>

      <div>
        <h3 className="font-semibold text-sm mb-2">Recent requests</h3>
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No SEO requests yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.slice(0, 10).map((r) => (
              <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.target_url}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.scope} · {new Date(r.created_at).toLocaleString()} · ${r.amount_usd.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">{r.status}</Badge>
                  <Badge variant="outline" className="capitalize text-[10px]">{r.billing_status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SeoOptimizationPanel;
