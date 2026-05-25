import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, Upload, Eye, EyeOff, Users, Loader2, GripVertical, ArrowUp, ArrowDown, Undo2 } from "lucide-react";

interface Officer {
  id: string;
  org_id: string;
  full_name: string;
  title: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  photo_url: string | null;
  display_order: number;
  is_public: boolean;
}

interface CompanyOfficersPanelProps {
  orgId: string;
  canEdit: boolean;
}

const CompanyOfficersPanel = ({ orgId, canEdit }: CompanyOfficersPanelProps) => {
  const { toast } = useToast();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Officer | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  // Snapshot of the order before the most recent reorder, so we can undo.
  const previousOrderRef = useRef<Officer[] | null>(null);
  // Focused row id for keyboard reordering affordances.
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const loadOfficers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_company_officers")
      .select("*")
      .eq("org_id", orgId)
      .order("display_order");

    if (!error && data) setOfficers(data as Officer[]);
    setLoading(false);
  };

  useEffect(() => { loadOfficers(); }, [orgId]);

  const handleDelete = async (id: string) => {
    await supabase.from("org_company_officers").delete().eq("id", id);
    toast({ title: "Officer removed" });
    loadOfficers();
  };

  const toggleVisibility = async (officer: Officer) => {
    await supabase.from("org_company_officers")
      .update({ is_public: !officer.is_public })
      .eq("id", officer.id);
    loadOfficers();
  };

  const persistOrder = async (list: Officer[]) => {
    setSavingOrder(true);
    // Update each row's display_order to its new index
    const updates = list.map((o, idx) =>
      supabase.from("org_company_officers")
        .update({ display_order: idx })
        .eq("id", o.id)
    );
    const results = await Promise.all(updates);
    setSavingOrder(false);
    const failed = results.find(r => r.error);
    if (failed?.error) {
      toast({ title: "Reorder failed", description: failed.error.message, variant: "destructive" });
      loadOfficers();
      return;
    }
    // Show an Undo toast that restores the previous order if invoked.
    const snapshot = previousOrderRef.current;
    toast({
      title: "Team order updated",
      description: "New order will appear on Our Story.",
      action: snapshot
        ? (
          <button
            onClick={async () => {
              const restored = snapshot.map((o, idx) => ({ ...o, display_order: idx }));
              previousOrderRef.current = null; // single-level undo
              setOfficers(restored);
              await persistOrder(restored);
              toast({ title: "Reorder undone" });
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Undo2 size={12} /> Undo
          </button>
        ) as any
        : undefined,
    });
  };

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= officers.length || toIdx >= officers.length) return;
    // Snapshot the prior order for Undo
    previousOrderRef.current = officers.map(o => ({ ...o }));
    const next = [...officers];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const reindexed = next.map((o, idx) => ({ ...o, display_order: idx }));
    setOfficers(reindexed);
    persistOrder(reindexed);
  }, [officers]);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const fromIdx = officers.findIndex(o => o.id === dragId);
    const toIdx = officers.findIndex(o => o.id === targetId);
    setDragId(null);
    setOverId(null);
    reorder(fromIdx, toIdx);
  };

  const moveBy = (id: string, delta: number) => {
    const idx = officers.findIndex(o => o.id === id);
    reorder(idx, idx + delta);
  };

  const onRowKeyDown = (e: React.KeyboardEvent, officer: Officer, idx: number) => {
    if (!canEdit) return;
    // Ctrl/Cmd/Alt + Arrow to reorder so plain arrow keys still scroll the page.
    const modified = e.altKey || e.ctrlKey || e.metaKey;
    if (modified && e.key === "ArrowUp") {
      e.preventDefault();
      moveBy(officer.id, -1);
    } else if (modified && e.key === "ArrowDown") {
      e.preventDefault();
      moveBy(officer.id, 1);
    } else if (e.key === "Home" && modified) {
      e.preventDefault();
      reorder(idx, 0);
    } else if (e.key === "End" && modified) {
      e.preventDefault();
      reorder(idx, officers.length - 1);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-base flex items-center gap-2">
            <Users size={16} /> Company Officers ({officers.length})
            {savingOrder && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
          </h3>
          {canEdit && (
            <Button variant="hero" size="sm" onClick={() => { setAdding(true); setEditing(null); }}>
              <Plus size={14} className="mr-1" /> Add Officer
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Add key team members to display on your public website. Drag the handle <span className="inline-flex items-center px-1 align-middle"><GripVertical size={10} className="text-foreground" /></span> or use the up/down buttons to reorder how they appear on the Our Story card. Keyboard: focus a row and press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Alt</kbd>+<kbd className="rounded border border-border bg-muted px-1 text-[10px]">↑/↓</kbd>.
        </p>

        {(adding || editing) && (
          <OfficerForm
            officer={editing}
            orgId={orgId}
            nextOrder={officers.length}
            onSave={() => { setAdding(false); setEditing(null); loadOfficers(); }}
            onCancel={() => { setAdding(false); setEditing(null); }}
          />
        )}

        {officers.length === 0 && !adding ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Users size={28} className="mx-auto text-muted-foreground mb-2 opacity-40" />
            <p className="text-muted-foreground text-sm">No company officers added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {officers.map((officer, idx) => (
              <div
                key={officer.id}
                tabIndex={canEdit ? 0 : -1}
                role={canEdit ? "button" : undefined}
                aria-label={canEdit ? `${officer.full_name} — position ${idx + 1} of ${officers.length}. Use Alt+Up or Alt+Down to reorder.` : undefined}
                onFocus={() => setFocusedId(officer.id)}
                onBlur={() => setFocusedId((cur) => cur === officer.id ? null : cur)}
                onKeyDown={(e) => onRowKeyDown(e, officer, idx)}
                draggable={canEdit}
                onDragStart={(e) => { setDragId(officer.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { if (canEdit && dragId && dragId !== officer.id) { e.preventDefault(); setOverId(officer.id); } }}
                onDragLeave={() => { if (overId === officer.id) setOverId(null); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(officer.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className={`flex items-center gap-3 rounded-xl border bg-background p-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  dragId === officer.id ? "opacity-50 scale-[0.98]" : ""
                } ${overId === officer.id ? "border-primary ring-2 ring-primary/30" : focusedId === officer.id ? "border-primary/60" : "border-border"}`}
              >
                {canEdit && (
                  <div
                    className="flex h-10 w-7 cursor-grab items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing shrink-0"
                    title="Drag to reorder"
                    aria-hidden="true"
                  >
                    <GripVertical size={18} />
                  </div>
                )}
                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                  {officer.photo_url ? (
                    <img src={officer.photo_url} alt={officer.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {officer.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{officer.full_name}</p>
                  <p className="text-xs text-muted-foreground">{officer.title}</p>
                  {officer.email && <p className="text-xs text-muted-foreground truncate">{officer.email}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <div className="mr-1 flex flex-col" aria-label="Reorder officer">
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-7 rounded-md"
                        disabled={idx === 0 || savingOrder}
                        onClick={() => moveBy(officer.id, -1)}
                        title="Move up (Alt+↑)"
                        aria-label={`Move ${officer.full_name} up`}
                      >
                        <ArrowUp size={12} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-7 rounded-md"
                        disabled={idx === officers.length - 1 || savingOrder}
                        onClick={() => moveBy(officer.id, 1)}
                        title="Move down (Alt+↓)"
                        aria-label={`Move ${officer.full_name} down`}
                      >
                        <ArrowDown size={12} />
                      </Button>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => toggleVisibility(officer)}
                    title={officer.is_public ? "Visible on website" : "Hidden from website"}>
                    {officer.is_public ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-muted-foreground" />}
                  </Button>
                  {canEdit && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditing(officer); setAdding(false); }}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(officer.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Officer Form ──────────────────────────────────────────────────────────────
const OfficerForm = ({ officer, orgId, nextOrder, onSave, onCancel }: {
  officer: Officer | null;
  orgId: string;
  nextOrder: number;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: officer?.full_name || "",
    title: officer?.title || "",
    email: officer?.email || "",
    phone: officer?.phone || "",
    bio: officer?.bio || "",
    photo_url: officer?.photo_url || "",
    is_public: officer?.is_public ?? true,
    display_order: officer?.display_order ?? nextOrder,
  });

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const officerId = officer?.id || crypto.randomUUID();
    const path = `${orgId}/officers/${officerId}.${ext}`;

    const { error } = await supabase.storage.from("org-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("org-assets").getPublicUrl(path);
    setForm({ ...form, photo_url: publicUrl });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.title.trim()) {
      toast({ title: "Name and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      org_id: orgId,
      full_name: form.full_name,
      title: form.title,
      email: form.email || null,
      phone: form.phone || null,
      bio: form.bio || null,
      photo_url: form.photo_url || null,
      is_public: form.is_public,
      display_order: form.display_order,
    };

    const { error } = officer
      ? await supabase.from("org_company_officers").update(payload).eq("id", officer.id)
      : await supabase.from("org_company_officers").insert(payload);

    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: officer ? "Officer updated" : "Officer added" }); onSave(); }
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{officer ? "Edit Officer" : "New Officer"}</h4>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted/30 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
          {form.photo_url ? (
            <img src={form.photo_url} alt="Photo" className="w-full h-full object-cover" />
          ) : (
            <Upload size={18} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => photoRef.current?.click()}>
            {uploading ? <><Loader2 size={14} className="mr-1 animate-spin" /> Uploading...</> : "Upload Photo"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="e.g. John Doe" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Title / Role *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Creative Director" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email (optional)</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john@brand.com" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Phone (optional)</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+234 800 000 0000" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Bio (optional)</label>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={3} placeholder="Brief bio or description..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="rounded" />
          <span className="text-sm">Show on public website</span>
        </label>
        <div className="space-y-1 flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Order:</label>
          <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1" /> {saving ? "Saving..." : "Save Officer"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default CompanyOfficersPanel;
