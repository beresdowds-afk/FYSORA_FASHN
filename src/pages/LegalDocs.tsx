import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, FileText, Globe, Download, Loader2, Copy, Check,
  Scale, Shield, RefreshCw, Building2
} from "lucide-react";

const REGIONS = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "EU", name: "European Union", flag: "🇪🇺" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "IN", name: "India", flag: "🇮🇳" },
];

const DOC_TYPES = [
  { id: "terms", name: "Terms & Conditions", icon: FileText, desc: "Service agreement and usage terms" },
  { id: "privacy", name: "Privacy Policy", icon: Shield, desc: "Data collection and processing disclosure" },
  { id: "refund", name: "Refund Policy", icon: RefreshCw, desc: "Returns, cancellations, and refunds" },
  { id: "acceptable-use", name: "Acceptable Use Policy", icon: Scale, desc: "Permitted and prohibited platform use" },
];

const LegalDocs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [region, setRegion] = useState("");
  const [docType, setDocType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!region || !docType) {
      toast({ title: "Select a region and document type", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setContent("");

    const regionObj = REGIONS.find((r) => r.code === region);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-legal-doc`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            docType,
            region,
            orgName: orgName || undefined,
            orgCountry: regionObj?.name,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        toast({ title: err.error || "Generation failed", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setContent(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate document", variant: "destructive" });
    }

    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const regionName = REGIONS.find((r) => r.code === region)?.name || region;
    a.download = `${docType}-${regionName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRegion = REGIONS.find((r) => r.code === region);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft size={18} />
            </Button>
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center">
              <Scale size={14} className="text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-sm">Legal Document Generator</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/docs/api")} className="text-xs">
            API Docs →
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="font-heading font-bold text-2xl mb-2">Region-Compliant Legal Documents</h1>
            <p className="text-muted-foreground">
              Auto-generate Terms & Conditions, Privacy Policies, and more — tailored to your region's regulations.
            </p>
          </div>

          {/* Config Panel */}
          <div className="rounded-xl bg-card border border-border p-6 mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.flag} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Organization Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Ade's Fashion House"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generating || !region || !docType}
                >
                  {generating ? (
                    <><Loader2 size={14} className="mr-1.5 animate-spin" /> Generating...</>
                  ) : (
                    <><FileText size={14} className="mr-1.5" /> Generate</>
                  )}
                </Button>
              </div>
            </div>

            {selectedRegion && docType && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Globe size={10} className="mr-1" /> {selectedRegion.flag} {selectedRegion.name}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {DOC_TYPES.find((d) => d.id === docType)?.name}
                </Badge>
                {orgName && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 size={10} className="mr-1" /> {orgName}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Document Type Cards */}
          {!content && !generating && (
            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDocType(d.id)}
                  className={`rounded-xl bg-card border p-5 text-left transition-all ${
                    docType === d.id ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <d.icon size={18} className="text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm">{d.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs">{d.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Generated Content */}
          {(content || generating) && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <span className="font-heading font-semibold text-sm">
                    {DOC_TYPES.find((d) => d.id === docType)?.name}
                  </span>
                  {generating && (
                    <Badge variant="secondary" className="text-[10px] animate-pulse">
                      <Loader2 size={10} className="mr-1 animate-spin" /> Writing...
                    </Badge>
                  )}
                </div>
                {content && !generating && (
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                      {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 text-xs">
                      <Download size={12} className="mr-1" /> Download
                    </Button>
                  </div>
                )}
              </div>
              <div
                ref={contentRef}
                className="p-6 max-h-[60vh] overflow-y-auto prose prose-sm max-w-none text-foreground
                  prose-headings:font-heading prose-headings:text-foreground
                  prose-p:text-muted-foreground prose-li:text-muted-foreground
                  prose-strong:text-foreground prose-a:text-primary"
              >
                {content.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
                  if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
                  if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-4 mb-1.5">{line.slice(4)}</h3>;
                  if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
                  if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-sm">{line.slice(2, -2)}</p>;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i} className="text-sm leading-relaxed">{line}</p>;
                })}
                {generating && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LegalDocs;
