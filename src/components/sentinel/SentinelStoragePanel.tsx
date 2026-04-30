import { useRef } from "react";
import { useSentinelStorage, type SentinelStorageObject } from "@/hooks/useSentinelStorage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Cloud,
  Upload,
  Loader2,
  HardDrive,
  Trash2,
  Download,
  CloudOff,
  Database,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  orgId?: string | null;
  designerUserId?: string | null;
  /** When true, hides the org-only / designer-only mutation buttons */
  readOnly?: boolean;
}

const formatBytes = (b: number) => {
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

const SentinelStoragePanel = ({ orgId, designerUserId, readOnly = false }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    entitlement,
    objects,
    usage,
    loading,
    busy,
    provision,
    revoke,
    uploadFile,
    deleteFile,
    getDownloadUrl,
    computeUsage,
  } = useSentinelStorage({ orgId, designerUserId });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      await uploadFile(f);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownload = async (obj: SentinelStorageObject) => {
    try {
      const url = await getDownloadUrl(obj);
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate download link");
    }
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Multi-Cloud Storage…
      </Card>
    );
  }

  if (!entitlement) {
    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CloudOff className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Multi-Cloud Storage not subscribed</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Subscribe to <strong>Sentinel Multi-Cloud Storage</strong> from the Sentinel MCP
          add-ons marketplace to provision replicated cloud storage across AWS S3, GCP GCS
          and Cloudflare R2.
        </p>
      </Card>
    );
  }

  const usagePct = usage
    ? Math.min(100, (usage.total_gb / Math.max(1, usage.included_gb)) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Sentinel Multi-Cloud Storage</h3>
          </div>
          <Badge
            variant={entitlement.status === "active" ? "default" : "secondary"}
            className="capitalize"
          >
            {entitlement.status}
          </Badge>
        </div>

        {entitlement.status !== "active" && (
          <Alert>
            <Cloud className="h-4 w-4" />
            <AlertTitle>Provisioning required</AlertTitle>
            <AlertDescription>
              Your subscription is {entitlement.status}. Click "Provision storage" to
              activate buckets across AWS S3, GCP GCS and Cloudflare R2.
              {entitlement.last_error && (
                <p className="text-destructive mt-2">Last error: {entitlement.last_error}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Used</p>
            <p className="font-semibold">{formatBytes(entitlement.current_usage_bytes)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Included quota</p>
            <p className="font-semibold">{entitlement.included_gb} GB</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Files</p>
            <p className="font-semibold">{entitlement.current_object_count}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Base / month</p>
            <p className="font-semibold">${entitlement.base_monthly_usd.toFixed(2)}</p>
          </div>
        </div>

        {usage && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usage.total_gb.toFixed(2)} GB / {usage.included_gb} GB included</span>
              <span>
                Period charge: <strong>${usage.total_usd.toFixed(2)}</strong>
                {usage.overage_gb > 0 && (
                  <span className="text-amber-600 ml-2">
                    (+ ${usage.overage_usd.toFixed(2)} overage on {usage.overage_gb.toFixed(2)} GB)
                  </span>
                )}
              </span>
            </div>
            <Progress value={usagePct} />
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Billing cycle: {new Date(entitlement.current_period_start).toLocaleDateString()} →{" "}
          {new Date(entitlement.current_period_end).toLocaleDateString()} · Overage rate $
          {entitlement.overage_per_gb_usd}/GB
        </div>

        <div className="flex flex-wrap gap-2">
          {entitlement.status !== "active" && !readOnly && (
            <Button onClick={provision} disabled={busy} size="sm">
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Provisioning…</>
              ) : (
                <><Cloud className="h-4 w-4 mr-2" /> Provision storage</>
              )}
            </Button>
          )}
          <Button onClick={computeUsage} variant="outline" size="sm" disabled={busy}>
            <RefreshCw className="h-4 w-4 mr-2" /> Recalculate usage
          </Button>
          {entitlement.status === "active" && !readOnly && (
            <Button onClick={revoke} variant="destructive" size="sm" disabled={busy}>
              <CloudOff className="h-4 w-4 mr-2" /> Revoke storage
            </Button>
          )}
        </div>
      </Card>

      {entitlement.status === "active" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" /> Files
            </h3>
            {!readOnly && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                >
                  {busy ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working…</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Upload files</>
                  )}
                </Button>
              </>
            )}
          </div>

          {objects.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No files yet. Upload to begin using Sentinel Multi-Cloud Storage.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {objects.map((obj) => (
                <div key={obj.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{obj.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(obj.size_bytes)} · {obj.content_type ?? "unknown"} ·{" "}
                      {new Date(obj.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(obj)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteFile(obj)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SentinelStoragePanel;