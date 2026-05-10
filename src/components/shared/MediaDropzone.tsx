import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon, Video as VideoIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface MediaDropzoneValue {
  url: string;
  type: "image" | "video";
}

interface MediaDropzoneProps {
  value?: MediaDropzoneValue | null;
  /** Async upload handler. Receives the validated File and returns the public URL. */
  onUpload: (file: File, type: "image" | "video") => Promise<string | null>;
  onClear?: () => void;
  /** Max video duration in seconds (default 10). */
  maxVideoSeconds?: number;
  /** Max file size in MB (default 50). */
  maxFileMb?: number;
  className?: string;
  label?: string;
  hint?: string;
  aspect?: "video" | "square" | "auto";
  disabled?: boolean;
}

const probeVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration || 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    v.src = url;
  });

const MediaDropzone = ({
  value,
  onUpload,
  onClear,
  maxVideoSeconds = 10,
  maxFileMb = 50,
  className,
  label = "Drop image or short video here",
  hint,
  aspect = "video",
  disabled,
}: MediaDropzoneProps) => {
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClass =
    aspect === "square" ? "aspect-square" : aspect === "video" ? "aspect-video" : "min-h-[160px]";

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast({ title: "Unsupported file", description: "Upload an image or short video.", variant: "destructive" });
        return;
      }
      if (file.size > maxFileMb * 1024 * 1024) {
        toast({ title: "File too large", description: `Max ${maxFileMb} MB`, variant: "destructive" });
        return;
      }
      if (isVideo) {
        try {
          const duration = await probeVideoDuration(file);
          if (duration > maxVideoSeconds + 0.25) {
            toast({
              title: "Video too long",
              description: `Videos must be ${maxVideoSeconds}s or shorter (this is ${duration.toFixed(1)}s).`,
              variant: "destructive",
            });
            return;
          }
        } catch {
          toast({ title: "Could not read video", variant: "destructive" });
          return;
        }
      }
      setBusy(true);
      try {
        await onUpload(file, isVideo ? "video" : "image");
      } finally {
        setBusy(false);
      }
    },
    [maxFileMb, maxVideoSeconds, onUpload, toast]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={disabled ? undefined : onDrop}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={label}
        className={cn(
          "relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center bg-muted/30",
          aspectClass,
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {value?.url ? (
          value.type === "video" ? (
            <video
              src={value.url}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <img src={value.url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            <Upload size={26} className="mb-2 text-primary" />
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs mt-1 flex items-center gap-1.5">
              <ImageIcon size={12} /> Image
              <span className="opacity-50">·</span>
              <VideoIcon size={12} /> Video ≤ {maxVideoSeconds}s
            </p>
            <p className="text-[10px] mt-1 opacity-70">Click or drag a file to upload (max {maxFileMb} MB)</p>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}

        {value?.url && onClear && !busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1.5 shadow"
            aria-label="Remove media"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default MediaDropzone;