import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Database, Download, Shield, RefreshCw, CheckCircle2,
  AlertCircle, Clock, HardDrive, Loader2, FileDown,
} from "lucide-react";

interface BackupItem {
  id: string;
  file_name: string;
  created_at: string;
  size_bytes: number;
}

interface VerifyResult {
  valid: boolean;
  version?: string;
  tables_count?: number;
  total_rows?: number;
  created_at?: string;
  stats?: Record<string, number>;
}

const DataBackupPanel = () => {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const downloadExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("data-backup", {
        body: { action: "create" },
      });
      if (error || !data?.success) {
        toast({ title: "Export Failed", description: error?.message || "Unknown error", variant: "destructive" });
        setExporting(false);
        return;
      }
      const fileName = data.file_name;
      const { data: fileData, error: dlError } = await supabase.storage
        .from("backups")
        .download(fileName);
      if (dlError || !fileData) {
        toast({ title: "Download Failed", description: dlError?.message || "Could not download file", variant: "destructive" });
        setExporting(false);
        return;
      }
      const url = URL.createObjectURL(fileData);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FSA-Project-Data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export Downloaded", description: `${data.tables_count} tables, ${data.total_rows} rows exported.` });
    } catch (e: unknown) {
      toast({ title: "Export Error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
    setExporting(false);
  };

  const fetchBackups = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("data-backup", {
      body: { action: "list" },
    });
    if (error) toast({ title: "Error", description: "Failed to list backups", variant: "destructive" });
    else setBackups(data?.backups || []);
    setLoading(false);
    setLoaded(true);
  };

  const createBackup = async () => {
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("data-backup", {
      body: { action: "create" },
    });
    if (error || !data?.success) {
      toast({ title: "Backup Failed", description: error?.message || "Unknown error", variant: "destructive" });
    } else {
      toast({
        title: "Backup Created",
        description: `${data.tables_count} tables, ${data.total_rows} rows backed up.`,
      });
      await fetchBackups();
    }
    setCreating(false);
  };

  const verifyBackup = async (backupId: string) => {
    setVerifying(backupId);
    setVerifyResult(null);
    const { data, error } = await supabase.functions.invoke("data-backup", {
      body: { action: "verify", backup_id: backupId },
    });
    if (error) toast({ title: "Error", description: "Verification failed", variant: "destructive" });
    else setVerifyResult(data);
    setVerifying(null);
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm("⚠️ This will overwrite current data with the backup. Are you sure?")) return;
    const { data, error } = await supabase.functions.invoke("data-backup", {
      body: { action: "restore", backup_id: backupId },
    });
    if (error) {
      toast({ title: "Restore Failed", description: error.message, variant: "destructive" });
    } else {
      const successCount = Object.values(data.results as Record<string, { success: boolean }>)
        .filter((r) => r.success).length;
      toast({ title: "Restore Complete", description: `${successCount} tables restored successfully.` });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl">Data Backup & Restore</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create, verify, and restore full platform backups.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading}>
            <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
            {loaded ? "Refresh" : "Load Backups"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadExport} disabled={exporting}>
            {exporting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileDown size={14} className="mr-1" />}
            {exporting ? "Exporting..." : "Download Export"}
          </Button>
          <Button variant="hero" size="sm" onClick={createBackup} disabled={creating}>
            {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Database size={14} className="mr-1" />}
            {creating ? "Creating..." : "Create Backup"}
          </Button>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Automated Backup System</p>
            <p className="text-muted-foreground mt-1">
              Backups capture all platform data including organizations, orders, payments, measurements,
              disputes, shipments, and configurations. Stored securely in encrypted storage.
            </p>
          </div>
        </div>
      </div>

      {/* Backup list */}
      {!loaded ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <HardDrive size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Click "Load Backups" to view existing backups.</p>
        </div>
      ) : backups.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Database size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No backups yet. Create your first backup above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((b) => (
            <div key={b.id} className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{b.id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={10} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </span>
                      {b.size_bytes > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {formatBytes(b.size_bytes)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => verifyBackup(b.id)}
                    disabled={verifying === b.id}
                  >
                    {verifying === b.id ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} className="mr-1" />
                    )}
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => restoreBackup(b.id)}
                  >
                    <Download size={12} className="mr-1" />
                    Restore
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification result */}
      {verifyResult && (
        <div className={`rounded-xl border p-4 ${verifyResult.valid ? "bg-primary/5 border-primary/20" : "bg-destructive/10 border-destructive/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            {verifyResult.valid ? (
              <CheckCircle2 size={16} className="text-primary" />
            ) : (
              <AlertCircle size={16} className="text-destructive" />
            )}
            <span className="font-medium text-sm">
              {verifyResult.valid ? "Backup Verified ✓" : "Backup Invalid"}
            </span>
          </div>
          {verifyResult.valid && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-lg font-bold">{verifyResult.tables_count}</p>
                <p className="text-[10px] text-muted-foreground">Tables</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-lg font-bold">{verifyResult.total_rows?.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-lg font-bold">v{verifyResult.version}</p>
                <p className="text-[10px] text-muted-foreground">Version</p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default DataBackupPanel;
