import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe, Search, CheckCircle2, Clock,
  Loader2, DollarSign, Plus, Trash2, Save, Edit2, X,
  Wifi, Server, Mail, Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface DomainRequest {
  id: string;
  user_id: string;
  org_id: string | null;
  domain_name: string;
  domain_type: string;
  vendor: string;
  vendor_price: number;
  platform_price: number;
  annual_renewal_fee: number;
  status: string;
  payment_status: string;
  dns_records: any;
  ssl_status: string;
  consent_given: boolean;
  notes: string | null;
  created_at: string;
}

interface VendorConfig {
  id: string;
  vendor_name: string;
  api_base_url: string | null;
  is_active: boolean;
  markup_percent: number;
  min_price: number;
  config: any;
}

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  ttl: string;
  priority: string;
  purpose: string;
}

interface DomainDnsConfig {
  domain: string;
  label: string;
  plan: string;
  badgeColor: string;
  hosting: DnsRecord[];
  email: DnsRecord[];
  emails: string[];
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  payment_pending: "bg-blue-500/10 text-blue-600",
  paid: "bg-green-500/10 text-green-600",
  provisioning: "bg-purple-500/10 text-purple-600",
  active: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultDnsConfigs: DomainDnsConfig[] = [
  {
    domain: "fs-africa.org.ng",
    label: "Fashion Stitches Africa",
    plan: "Platform (Lite + Pro + Pro-Lite)",
    badgeColor: "bg-emerald-500/10 text-emerald-600",
    hosting: [
      { id: generateId(), type: "A", name: "@", value: "185.158.133.1", ttl: "3600", priority: "—", purpose: "Root domain → Lovable hosting" },
      { id: generateId(), type: "A", name: "www", value: "185.158.133.1", ttl: "3600", priority: "—", purpose: "www subdomain → Lovable hosting" },
      { id: generateId(), type: "TXT", name: "_lovable", value: "lovable_verify=fs-africa", ttl: "3600", priority: "—", purpose: "Domain ownership verification" },
      { id: generateId(), type: "CNAME", name: "app", value: "fashionstitchesafrica.lovable.app", ttl: "3600", priority: "—", purpose: "App subdomain alias" },
    ],
    email: [
      { id: generateId(), type: "MX", name: "@", value: "mx1.hostinger.com", ttl: "3600", priority: "10", purpose: "Primary mail server" },
      { id: generateId(), type: "MX", name: "@", value: "mx2.hostinger.com", ttl: "3600", priority: "20", purpose: "Backup mail server" },
      { id: generateId(), type: "TXT", name: "@", value: "v=spf1 include:_spf.hostinger.com ~all", ttl: "3600", priority: "—", purpose: "SPF — Sender Policy Framework" },
      { id: generateId(), type: "TXT", name: "default._domainkey", value: "v=DKIM1; k=rsa; p=...", ttl: "3600", priority: "—", purpose: "DKIM — Email authentication" },
      { id: generateId(), type: "TXT", name: "_dmarc", value: "v=DMARC1; p=quarantine; rua=mailto:admin@fs-africa.org.ng", ttl: "3600", priority: "—", purpose: "DMARC — Email policy" },
    ],
    emails: ["admin@fs-africa.org.ng", "support@fs-africa.org.ng", "info@fs-africa.org.ng", "noreply@fs-africa.org.ng"],
  },
  {
    domain: "gabulkfashionstudio.org.ng",
    label: "GABULK FASHION STUDIO",
    plan: "Pro (Exempted)",
    badgeColor: "bg-blue-500/10 text-blue-600",
    hosting: [
      { id: generateId(), type: "A", name: "@", value: "185.158.133.1", ttl: "3600", priority: "—", purpose: "Root domain → Lovable hosting" },
      { id: generateId(), type: "A", name: "www", value: "185.158.133.1", ttl: "3600", priority: "—", purpose: "www subdomain → Lovable hosting" },
      { id: generateId(), type: "TXT", name: "_lovable", value: "lovable_verify=gabulkfashionstudio", ttl: "3600", priority: "—", purpose: "Domain ownership verification" },
      { id: generateId(), type: "CNAME", name: "shop", value: "fashionstitchesafrica.lovable.app", ttl: "3600", priority: "—", purpose: "Shop subdomain alias" },
    ],
    email: [
      { id: generateId(), type: "MX", name: "@", value: "mx1.hostinger.com", ttl: "3600", priority: "10", purpose: "Primary mail server" },
      { id: generateId(), type: "MX", name: "@", value: "mx2.hostinger.com", ttl: "3600", priority: "20", purpose: "Backup mail server" },
      { id: generateId(), type: "TXT", name: "@", value: "v=spf1 include:_spf.hostinger.com ~all", ttl: "3600", priority: "—", purpose: "SPF — Sender Policy Framework" },
      { id: generateId(), type: "TXT", name: "default._domainkey", value: "v=DKIM1; k=rsa; p=...", ttl: "3600", priority: "—", purpose: "DKIM — Email authentication" },
      { id: generateId(), type: "TXT", name: "_dmarc", value: "v=DMARC1; p=quarantine; rua=mailto:admin@gabulkfashionstudio.org.ng", ttl: "3600", priority: "—", purpose: "DMARC — Email policy" },
    ],
    emails: ["admin@gabulkfashionstudio.org.ng", "info@gabulkfashionstudio.org.ng", "orders@gabulkfashionstudio.org.ng", "support@gabulkfashionstudio.org.ng"],
  },
];

// ── Editable DNS Record Row ───────────────────────────────────────────────────
const EditableDnsRow = ({
  record, editing, onEdit, onSave, onCancel, onDelete, onChange,
}: {
  record: DnsRecord; editing: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void;
  onChange: (field: keyof DnsRecord, val: string) => void;
}) => {
  if (editing) {
    return (
      <tr className="border-b border-border/50 bg-primary/5">
        <td className="py-2 pr-2">
          <Select value={record.type} onValueChange={(v) => onChange("type", v)}>
            <SelectTrigger className="h-7 text-[10px] w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </td>
        <td className="py-2 pr-2"><Input value={record.name} onChange={(e) => onChange("name", e.target.value)} className="h-7 text-xs" /></td>
        <td className="py-2 pr-2"><Input value={record.value} onChange={(e) => onChange("value", e.target.value)} className="h-7 text-xs" /></td>
        <td className="py-2 pr-2"><Input value={record.ttl} onChange={(e) => onChange("ttl", e.target.value)} className="h-7 text-xs w-16" /></td>
        <td className="py-2 pr-2"><Input value={record.priority} onChange={(e) => onChange("priority", e.target.value)} className="h-7 text-xs w-14" /></td>
        <td className="py-2 pr-2"><Input value={record.purpose} onChange={(e) => onChange("purpose", e.target.value)} className="h-7 text-xs" /></td>
        <td className="py-2">
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onSave}><Save size={12} className="text-green-600" /></Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}><X size={12} /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/50 group hover:bg-muted/30">
      <td className="py-2 pr-4"><Badge variant="outline" className="text-[10px]">{record.type}</Badge></td>
      <td className="py-2 pr-4">{record.name}</td>
      <td className="py-2 pr-4 break-all max-w-[220px]">{record.value}</td>
      <td className="py-2 pr-4">{record.ttl}</td>
      <td className="py-2 pr-4">{record.priority}</td>
      <td className="py-2 pr-4 text-muted-foreground font-sans">{record.purpose}</td>
      <td className="py-2">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onEdit}><Edit2 size={11} /></Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onDelete}><Trash2 size={11} className="text-destructive" /></Button>
        </div>
      </td>
    </tr>
  );
};

// ── Editable DNS Table ────────────────────────────────────────────────────────
const EditableDnsTable = ({
  title, icon: Icon, records, onUpdate,
}: {
  title: string; icon: typeof Server; records: DnsRecord[]; onUpdate: (records: DnsRecord[]) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<DnsRecord | null>(null);

  const handleEdit = (record: DnsRecord) => { setEditingId(record.id); setEditBuffer({ ...record }); };
  const handleSave = () => {
    if (!editBuffer) return;
    onUpdate(records.map((r) => (r.id === editBuffer.id ? editBuffer : r)));
    setEditingId(null); setEditBuffer(null);
    toast({ title: "DNS record updated" });
  };
  const handleCancel = () => { setEditingId(null); setEditBuffer(null); };
  const handleDelete = (id: string) => { onUpdate(records.filter((r) => r.id !== id)); toast({ title: "DNS record removed" }); };
  const handleAdd = () => {
    const nr: DnsRecord = { id: generateId(), type: "A", name: "", value: "", ttl: "3600", priority: "—", purpose: "" };
    onUpdate([...records, nr]); setEditingId(nr.id); setEditBuffer(nr);
  };
  const handleChange = (field: keyof DnsRecord, val: string) => {
    if (!editBuffer) return;
    setEditBuffer({ ...editBuffer, [field]: val });
  };

  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Icon size={14} /> {title}</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAdd}>
          <Plus size={12} className="mr-1" /> Add Record
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Value</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">TTL</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Priority</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Purpose</th>
              <th className="pb-2 font-medium text-muted-foreground w-16"></th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {records.map((record) => (
              <EditableDnsRow
                key={record.id}
                record={editingId === record.id && editBuffer ? editBuffer : record}
                editing={editingId === record.id}
                onEdit={() => handleEdit(record)}
                onSave={handleSave}
                onCancel={handleCancel}
                onDelete={() => handleDelete(record.id)}
                onChange={handleChange}
              />
            ))}
            {records.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-center text-muted-foreground font-sans">No records. Click "Add Record" to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Editable Email List ───────────────────────────────────────────────────────
const EditableEmailList = ({
  emails, domain, onUpdate,
}: {
  emails: string[]; domain: string; onUpdate: (emails: string[]) => void;
}) => {
  const [adding, setAdding] = useState(false);
  const [newPrefix, setNewPrefix] = useState("");

  const handleAdd = () => {
    if (!newPrefix.trim()) return;
    const email = `${newPrefix.trim()}@${domain}`;
    if (emails.includes(email)) { toast({ title: "Email already exists", variant: "destructive" }); return; }
    onUpdate([...emails, email]); setNewPrefix(""); setAdding(false);
    toast({ title: `Added ${email}` });
  };

  return (
    <div className="mt-3 p-3 rounded border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium flex items-center gap-1"><Mail size={12} /> Email Addresses</p>
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setAdding(!adding)}>
          <Plus size={10} className="mr-0.5" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {emails.map((e) => (
          <Badge key={e} variant="secondary" className="text-[10px] font-mono group">
            {e}
            <button onClick={() => { onUpdate(emails.filter((x) => x !== e)); toast({ title: `Removed ${e}` }); }}
              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} /></button>
          </Badge>
        ))}
      </div>
      {adding && (
        <div className="flex items-center gap-2 mt-2">
          <Input value={newPrefix} onChange={(e) => setNewPrefix(e.target.value)} placeholder="username" className="h-7 text-xs w-32"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <span className="text-xs text-muted-foreground">@{domain}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAdd}>Add</Button>
        </div>
      )}
    </div>
  );
};

// ── Domain DNS Card ───────────────────────────────────────────────────────────
const DomainDnsCard = ({ config, onUpdate }: { config: DomainDnsConfig; onUpdate: (c: DomainDnsConfig) => void }) => (
  <Card className="p-5 border-border">
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Globe size={18} className="text-primary" />
      <h3 className="font-semibold text-base">{config.domain} — {config.label}</h3>
      <Badge className={`text-[10px] ${config.badgeColor}`}>{config.plan}</Badge>
    </div>
    <div className="space-y-4">
      <EditableDnsTable title="Hosting DNS Records" icon={Server} records={config.hosting}
        onUpdate={(r) => onUpdate({ ...config, hosting: r })} />
      <EditableDnsTable title="Email DNS Records" icon={Shield} records={config.email}
        onUpdate={(r) => onUpdate({ ...config, email: r })} />
      <EditableEmailList emails={config.emails} domain={config.domain}
        onUpdate={(e) => onUpdate({ ...config, emails: e })} />
    </div>
  </Card>
);

// ── Add New Domain Form ───────────────────────────────────────────────────────
const AddDomainDnsForm = ({ onAdd }: { onAdd: (c: DomainDnsConfig) => void }) => {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [label, setLabel] = useState("");
  const [plan, setPlan] = useState("lite");

  const planLabels: Record<string, string> = { lite: "Lite", pro: "Pro", "pro-lite": "Pro-Lite" };
  const planColors: Record<string, string> = {
    lite: "bg-primary/10 text-primary", pro: "bg-accent/10 text-accent", "pro-lite": "bg-blue-500/10 text-blue-600",
  };

  const handleAdd = () => {
    if (!domain.trim() || !label.trim()) { toast({ title: "Domain and label required", variant: "destructive" }); return; }
    onAdd({
      domain: domain.trim(), label: label.trim(), plan: planLabels[plan] || plan,
      badgeColor: planColors[plan] || "bg-primary/10 text-primary",
      hosting: [
        { id: generateId(), type: "A", name: "@", value: "185.158.133.1", ttl: "3600", priority: "—", purpose: "Root domain → Lovable hosting" },
        { id: generateId(), type: "A", name: "www", value: "185.158.133.1", ttl: "3600", priority: "—", purpose: "www subdomain → Lovable hosting" },
        { id: generateId(), type: "TXT", name: "_lovable", value: `lovable_verify=${domain.split(".")[0]}`, ttl: "3600", priority: "—", purpose: "Domain ownership verification" },
      ],
      email: [
        { id: generateId(), type: "MX", name: "@", value: "mx1.hostinger.com", ttl: "3600", priority: "10", purpose: "Primary mail server" },
        { id: generateId(), type: "MX", name: "@", value: "mx2.hostinger.com", ttl: "3600", priority: "20", purpose: "Backup mail server" },
        { id: generateId(), type: "TXT", name: "@", value: "v=spf1 include:_spf.hostinger.com ~all", ttl: "3600", priority: "—", purpose: "SPF — Sender Policy Framework" },
      ],
      emails: [`admin@${domain.trim()}`, `info@${domain.trim()}`],
    });
    setDomain(""); setLabel(""); setPlan("lite"); setOpen(false);
    toast({ title: "Domain DNS configuration added" });
  };

  if (!open) {
    return (
      <Button variant="outline" className="w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-2" /> Add Domain DNS Configuration
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-sm mb-4">Add New Domain DNS</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <Label className="text-xs">Domain Name</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.org.ng" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Organization Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My Fashion Studio" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Website Builder Plan</Label>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lite">Lite</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="pro-lite">Pro-Lite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd}>Add Domain</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
};

// ── Main Panel ────────────────────────────────────────────────────────────────
const DomainManagementPanel = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dnsConfigs, setDnsConfigs] = useState<DomainDnsConfig[]>(defaultDnsConfigs);

  const { data: domains, isLoading } = useQuery({
    queryKey: ["domain-requests", statusFilter],
    queryFn: async () => {
      let q = supabase.from("domain_requests").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return (data || []) as DomainRequest[];
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["domain-vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("domain_vendor_configs").select("*").order("vendor_name");
      return (data || []) as VendorConfig[];
    },
  });

  const updateDomain = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DomainRequest> & { id: string }) => {
      await supabase.from("domain_requests").update(updates as any).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["domain-requests"] }); toast({ title: "Domain updated" }); },
  });

  const updateVendor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VendorConfig> & { id: string }) => {
      await supabase.from("domain_vendor_configs").update(updates as any).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["domain-vendors"] }); toast({ title: "Vendor config updated" }); },
  });

  const filtered = (domains || []).filter(d => !search || d.domain_name.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: domains?.length || 0,
    active: domains?.filter(d => d.status === "active").length || 0,
    pending: domains?.filter(d => d.status === "pending" || d.status === "payment_pending").length || 0,
    revenue: domains?.filter(d => d.payment_status === "paid").reduce((s, d) => s + d.platform_price, 0) || 0,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Globe size={24} /> Domain Name Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage DNS settings, email configuration, and domain requests for all website builder plans.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Globe, label: "Total Domains", value: stats.total, color: "text-primary" },
          { icon: CheckCircle2, label: "Active", value: stats.active, color: "text-emerald-600" },
          { icon: Clock, label: "Pending", value: stats.pending, color: "text-amber-600" },
          { icon: DollarSign, label: "Revenue", value: `$${stats.revenue.toFixed(0)}`, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><s.icon size={18} className={s.color} /></div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="dns">
        <TabsList className="mb-4">
          <TabsTrigger value="dns" className="gap-2"><Server size={14} /> DNS & Email</TabsTrigger>
          <TabsTrigger value="domains" className="gap-2"><Globe size={14} /> Domain Requests</TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2"><Server size={14} /> Vendor Integration</TabsTrigger>
          <TabsTrigger value="native" className="gap-2"><Wifi size={14} /> Native Domains</TabsTrigger>
        </TabsList>

        <TabsContent value="dns">
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-heading font-semibold text-lg">DNS & Email Configuration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage hosting, email, and verification DNS records for all plans (Lite, Pro, Pro-Lite).
                </p>
              </div>
              <Badge variant="outline" className="text-xs">{dnsConfigs.length} domains configured</Badge>
            </div>

            {dnsConfigs.map((config, index) => (
              <div key={config.domain} className="relative">
                <DomainDnsCard config={config} onUpdate={(c) => setDnsConfigs((prev) => prev.map((x, i) => (i === index ? c : x)))} />
                {index >= 2 && (
                  <Button size="sm" variant="ghost"
                    className="absolute top-3 right-3 h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => { setDnsConfigs((prev) => prev.filter((_, i) => i !== index)); toast({ title: "Domain removed" }); }}>
                    <Trash2 size={12} className="mr-1" /> Remove
                  </Button>
                )}
              </div>
            ))}

            <AddDomainDnsForm onAdd={(c) => setDnsConfigs((prev) => [...prev, c])} />
          </div>
        </TabsContent>

        <TabsContent value="domains">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="payment_pending">Payment Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="provisioning">Provisioning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No domain requests found.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(d => (
                <Card key={d.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{d.domain_name}</h4>
                        <Badge className={`text-[10px] ${statusColors[d.status] || "bg-muted"}`}>{d.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{d.domain_type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{d.vendor}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Price: ${d.platform_price}</span>
                        <span>Renewal: ${d.annual_renewal_fee}/yr</span>
                        <span>SSL: {d.ssl_status}</span>
                        <span>Payment: {d.payment_status}</span>
                        <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                      {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      {d.status === "pending" && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => updateDomain.mutate({ id: d.id, status: "payment_pending" })}>Confirm Billing</Button>
                      )}
                      {d.status === "paid" && (
                        <Button size="sm" className="text-xs h-7"
                          onClick={() => updateDomain.mutate({ id: d.id, status: "provisioning" })}>Provision</Button>
                      )}
                      {d.status === "provisioning" && (
                        <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateDomain.mutate({
                            id: d.id, status: "active", ssl_status: "active",
                            provisioned_at: new Date().toISOString(),
                            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                          } as any)}>Activate</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendors">
          <div className="space-y-4">
            {(vendors || []).map(v => (
              <Card key={v.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server size={20} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm capitalize">{v.vendor_name}</h4>
                      <p className="text-xs text-muted-foreground">{v.api_base_url || "No API URL configured"}</p>
                    </div>
                  </div>
                  <Switch checked={v.is_active} onCheckedChange={val => updateVendor.mutate({ id: v.id, is_active: val })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Markup %</Label>
                    <Input type="number" defaultValue={v.markup_percent}
                      onBlur={e => updateVendor.mutate({ id: v.id, markup_percent: parseFloat(e.target.value) } as any)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Min Price ($)</Label>
                    <Input type="number" defaultValue={v.min_price}
                      onBlur={e => updateVendor.mutate({ id: v.id, min_price: parseFloat(e.target.value) } as any)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">API Base URL</Label>
                    <Input defaultValue={v.api_base_url || ""}
                      onBlur={e => updateVendor.mutate({ id: v.id, api_base_url: e.target.value } as any)} className="mt-1" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="native">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wifi size={18} className="text-primary" />
              <h3 className="font-semibold text-base">Native Subdomain Creation</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Native domains use a wildcard DNS A record (or CNAME) pointed to the FSA platform URL.
              Subdomains are created instantly upon payment confirmation.
            </p>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">Wildcard Configuration</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Platform Base Domain</Label>
                  <Input placeholder="fashionstitchesafrica.com" className="mt-1" defaultValue="fashionstitchesafrica.lovable.app" />
                </div>
                <div>
                  <Label className="text-xs">DNS Record Type</Label>
                  <Select defaultValue="a">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">A Record (*.domain → IP)</SelectItem>
                      <SelectItem value="cname">CNAME (*.domain → platform)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default DomainManagementPanel;