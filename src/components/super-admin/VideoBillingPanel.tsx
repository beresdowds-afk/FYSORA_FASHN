import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Video, Coins, Search, HardDrive, Users, Loader2, Film,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface VideoUpload {
  id: string;
  user_id: string;
  org_id: string | null;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number;
  duration_seconds: number;
  tokens_charged: number;
  status: string;
  created_at: string;
}

const VideoBillingPanel = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: uploads, isLoading } = useQuery({
    queryKey: ["video-uploads-admin", statusFilter],
    queryFn: async () => {
      let q = supabase.from("video_uploads").select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return (data || []) as VideoUpload[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["video-billing-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("video_uploads").select("tokens_charged, file_size_bytes, status");
      const all = data || [];
      const totalTokens = all.reduce((s, v: any) => s + Number(v.tokens_charged), 0);
      const totalSize = all.reduce((s, v: any) => s + Number(v.file_size_bytes || 0), 0);
      const totalUploads = all.length;
      const activeUploads = all.filter((v: any) => v.status === "active").length;
      return { totalTokens, totalSize, totalUploads, activeUploads };
    },
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filtered = (uploads || []).filter(u =>
    !search || u.file_name?.toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search)
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Video size={24} /> Video Billing Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor video storage usage, token consumption, and billing history across all users.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10"><Film size={18} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalUploads || 0}</p>
                <p className="text-xs text-muted-foreground">Total Uploads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Coins size={18} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalTokens?.toFixed(0) || 0}</p>
                <p className="text-xs text-muted-foreground">Tokens Billed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><HardDrive size={18} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Users size={18} className="text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeUploads || 0}</p>
                <p className="text-xs text-muted-foreground">Active Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by filename or user..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upload Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Video size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No video uploads found.</p>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">File</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Size</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tokens</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium truncate max-w-[200px]">{v.file_name || "Unnamed"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatBytes(v.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{v.duration_seconds}s</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs font-mono">{v.tokens_charged}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={v.status === "active" ? "default" : "secondary"} className="text-[10px]">{v.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}
    </motion.div>
  );
};

export default VideoBillingPanel;
