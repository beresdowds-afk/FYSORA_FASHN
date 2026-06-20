import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, EyeOff } from "lucide-react";
import { getTemplateList, type WebsiteTemplate } from "@/config/websiteTemplates";

export default function TemplatePreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staging, setStaging] = useState<any>(null);

  const all = useMemo<WebsiteTemplate[]>(() => getTemplateList(), []);

  useEffect(() => {
    (async () => {
      if (!token) { setError("Missing token"); setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_staging_template_by_token", { _token: token });
      if (error) { setError(error.message); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("Preview not found or expired"); setLoading(false); return; }
      setStaging(row);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading preview…
      </div>
    );
  }
  if (error || !staging) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md"><CardContent className="p-6 text-center space-y-2">
          <EyeOff className="mx-auto text-muted-foreground" />
          <h2 className="font-semibold">Preview unavailable</h2>
          <p className="text-sm text-muted-foreground">{error || "This preview link has expired or was discarded."}</p>
        </CardContent></Card>
      </div>
    );
  }

  const isExpired = staging.status !== "active" || new Date(staging.expires_at).getTime() <= Date.now();
  const hoursLeft = Math.max(0, Math.round((new Date(staging.expires_at).getTime() - Date.now()) / 3_600_000));
  const template = all.find((t) => t.id === staging.template_key);

  return (
    <div className="min-h-screen">
      <div className={`sticky top-0 z-50 px-4 py-2 text-xs flex items-center gap-2 ${isExpired ? "bg-destructive text-destructive-foreground" : "bg-amber-500/10 border-b border-amber-500/30"}`}>
        <Clock size={12} />
        {isExpired ? (
          <span><strong>Preview expired</strong> — this template was not promoted to live.</span>
        ) : (
          <span><strong>Staging preview</strong> — not visible to customers. Expires in ~{hoursLeft}h.</span>
        )}
        <Badge variant="outline" className="ml-auto">{staging.status}</Badge>
      </div>
      <div className="p-4 sm:p-6">
        {template ? (
          <Card>
            <CardContent className="p-6 space-y-4" style={{ background: template.design.bgBase, color: template.design.textPrimary, fontFamily: template.design.fontBodyDefault }}>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold" style={{ fontFamily: template.design.fontHeadingDefault, letterSpacing: template.design.headingSpacing }}>{template.name}</h1>
                <Badge variant="outline" className="capitalize">{template.category}</Badge>
              </div>
              <p className="text-sm opacity-80">{template.description}</p>
              <div className="p-6 rounded" style={{ background: template.design.bgSurface }}>
                <h2 className="text-xl mb-2" style={{ fontFamily: template.design.fontHeadingDefault }}>{template.copy.heroTagline}</h2>
                <p className="text-sm opacity-70">{template.copy.catalogueIntro}</p>
              </div>
              <div className={`grid gap-3 grid-cols-${template.design.gridColumns}`}>
                {Array.from({ length: template.design.gridColumns * 2 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded" style={{ background: template.design.bgSurface, opacity: 0.6 }} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Template "{staging.template_key}" not found in registry.</p>
        )}
      </div>
    </div>
  );
}