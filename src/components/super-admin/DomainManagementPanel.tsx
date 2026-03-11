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
  Loader2, DollarSign,
  Wifi, Server,
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

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  payment_pending: "bg-blue-500/10 text-blue-600",
  paid: "bg-green-500/10 text-green-600",
  provisioning: "bg-purple-500/10 text-purple-600",
  active: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

const DomainManagementPanel = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domain-requests"] });
      toast({ title: "Domain updated" });
    },
  });

  const updateVendor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VendorConfig> & { id: string }) => {
      await supabase.from("domain_vendor_configs").update(updates as any).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domain-vendors"] });
      toast({ title: "Vendor config updated" });
    },
  });

  const filtered = (domains || []).filter(d =>
    !search || d.domain_name.toLowerCase().includes(search.toLowerCase())
  );

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
          Manage native subdomain creation, external domain requests, and third-party vendor integration.
        </p>
      </div>

      {/* Stats */}
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

      <Tabs defaultValue="domains">
        <TabsList className="mb-4">
          <TabsTrigger value="domains" className="gap-2"><Globe size={14} /> Domain Requests</TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2"><Server size={14} /> Vendor Integration</TabsTrigger>
          <TabsTrigger value="native" className="gap-2"><Wifi size={14} /> Native Domains</TabsTrigger>
        </TabsList>

        {/* Domain Requests */}
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
                          onClick={() => updateDomain.mutate({ id: d.id, status: "payment_pending" })}>
                          Confirm Billing
                        </Button>
                      )}
                      {d.status === "paid" && (
                        <Button size="sm" className="text-xs h-7"
                          onClick={() => updateDomain.mutate({ id: d.id, status: "provisioning" })}>
                          Provision
                        </Button>
                      )}
                      {d.status === "provisioning" && (
                        <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateDomain.mutate({
                            id: d.id, status: "active", ssl_status: "active",
                            provisioned_at: new Date().toISOString(),
                            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                          } as any)}>
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vendor Integration */}
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
                  <Switch
                    checked={v.is_active}
                    onCheckedChange={val => updateVendor.mutate({ id: v.id, is_active: val })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Markup %</Label>
                    <Input
                      type="number"
                      defaultValue={v.markup_percent}
                      onBlur={e => updateVendor.mutate({ id: v.id, markup_percent: parseFloat(e.target.value) } as any)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Price ($)</Label>
                    <Input
                      type="number"
                      defaultValue={v.min_price}
                      onBlur={e => updateVendor.mutate({ id: v.id, min_price: parseFloat(e.target.value) } as any)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">API Base URL</Label>
                    <Input
                      defaultValue={v.api_base_url || ""}
                      onBlur={e => updateVendor.mutate({ id: v.id, api_base_url: e.target.value } as any)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  API key and secret must be configured in Keys & Secrets → add "{v.vendor_name}_api_key" and "{v.vendor_name}_api_username" as platform secrets.
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Native Domains */}
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
            <div className="space-y-3">
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
                <p className="text-[10px] text-muted-foreground mt-3">
                  Example: orgname.fashionstitchesafrica.com → auto-created on subscription.
                  Update the platform URL on the Assets Management page.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium mb-1">How Native Domains Work</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>User selects Website Builder Lite or Pro plan</li>
                  <li>Payment confirmed via integrated gateway</li>
                  <li>Subdomain auto-created: <code className="bg-muted px-1 rounded">orgslug.platform.com</code></li>
                  <li>SSL automatically provisioned</li>
                  <li>Website builder activated with the chosen plan features</li>
                </ol>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default DomainManagementPanel;
