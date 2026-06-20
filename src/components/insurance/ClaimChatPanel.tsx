import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const MAX_FILES = 5;
const MAX_FILE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL = 30 * 1024 * 1024; // 30MB
const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf",
];

type Msg = {
  id: string;
  description: string | null;
  performed_by: string | null;
  attachments: any[];
  created_at: string;
};

export function ClaimChatPanel({ claimId, messages }: { claimId: string; messages: Msg[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Pre-sign attachment paths for quick view
  useEffect(() => {
    const all: string[] = [];
    for (const m of messages) {
      for (const a of m.attachments ?? []) {
        if (a?.path && !signed[a.path]) all.push(a.path);
      }
    }
    if (!all.length) return;
    (async () => {
      const { data } = await supabase.storage.from("insurance-evidence").createSignedUrls(all, 60 * 30);
      const map: Record<string, string> = {};
      (data ?? []).forEach((d: any) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
      if (Object.keys(map).length) setSigned((s) => ({ ...s, ...map }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const next = [...files];
    let total = files.reduce((n, f) => n + f.size, 0);
    for (const f of picked) {
      if (next.length >= MAX_FILES) { toast({ title: `Max ${MAX_FILES} files`, variant: "destructive" }); break; }
      if (!ALLOWED.includes(f.type)) { toast({ title: "Unsupported file", description: f.name, variant: "destructive" }); continue; }
      if (f.size > MAX_FILE) { toast({ title: "File too large (max 10MB)", description: f.name, variant: "destructive" }); continue; }
      if (total + f.size > MAX_TOTAL) { toast({ title: "Total exceeds 30MB", variant: "destructive" }); break; }
      next.push(f);
      total += f.size;
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (i: number) => setFiles((s) => s.filter((_, idx) => idx !== i));

  const send = async () => {
    if (!draft.trim() && !files.length) return;
    if (!user) return;
    setSending(true);
    try {
      const attachments: any[] = [];
      for (const f of files) {
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${claimId}/${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("insurance-evidence").upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;
        attachments.push({ path, name: f.name, type: f.type, size: f.size });
      }
      const { error } = await (supabase as any).from("insurance_claim_actions").insert({
        claim_id: claimId,
        action_type: "message",
        description: draft.trim() || null,
        attachments,
        performed_by: user.id,
      });
      if (error) throw error;
      setDraft(""); setFiles([]);
      qc.invalidateQueries({ queryKey: ["insurance-claim-actions", claimId] });
      qc.invalidateQueries({ queryKey: ["claim-audit-timeline", claimId] });
    } catch (e: any) {
      toast({ title: "Could not send message", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex-1 space-y-2 overflow-y-auto rounded border border-border bg-muted/20 p-3 min-h-[200px] max-h-[360px]">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">No messages yet.</p>
        ) : messages.map((m) => {
          const mine = m.performed_by === user?.id;
          const atts = Array.isArray(m.attachments) ? m.attachments : [];
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-lg px-3 py-1.5 text-sm space-y-1",
                mine ? "bg-primary text-primary-foreground" : "bg-card border border-border",
              )}>
                {m.description && <p className="whitespace-pre-wrap">{m.description}</p>}
                {atts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {atts.map((a: any, i: number) => {
                      const url = signed[a.path];
                      const isImg = (a.type || "").startsWith("image/");
                      return (
                        <a
                          key={i} href={url || "#"} target="_blank" rel="noreferrer noopener"
                          className={cn(
                            "flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                            mine ? "border-primary-foreground/30" : "border-border",
                          )}
                          title={a.name}
                        >
                          {isImg && url
                            ? <img src={url} alt={a.name} className="h-8 w-8 rounded object-cover" />
                            : isImg ? <ImageIcon size={10} /> : <FileText size={10} />}
                          <span className="max-w-[120px] truncate">{a.name}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
                <p className={cn("text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatDistanceToNow(new Date(m.created_at))} ago
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 text-xs">
              <FileText size={11} /> <span className="max-w-[140px] truncate">{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} aria-label="remove"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileRef} type="file" multiple hidden
          accept={ALLOWED.join(",")} onChange={onPick}
        />
        <Button
          type="button" variant="outline" size="icon" disabled={sending || files.length >= MAX_FILES}
          onClick={() => fileRef.current?.click()} aria-label="Attach files"
        >
          <Paperclip size={14} />
        </Button>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          rows={2}
          className="resize-none"
          maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
        />
        <Button onClick={send} disabled={sending || (!draft.trim() && !files.length)} size="icon">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Up to {MAX_FILES} files · 10MB each · 30MB total · images, video, PDF</p>
    </div>
  );
}

export default ClaimChatPanel;