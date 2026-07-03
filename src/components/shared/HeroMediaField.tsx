import { useMemo } from "react";
import { Image as ImageIcon, Film, Play } from "lucide-react";
import ImageUrlField from "./ImageUrlField";

export const isVideoUrl = (url: string | null | undefined) =>
  !!url && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);

interface HeroMediaFieldProps {
  /** Primary hero media URL (image OR video). */
  value: string;
  onChange: (url: string) => void;
  /** Poster image shown before the video loads / when it can't play. */
  posterValue?: string;
  onPosterChange?: (url: string) => void;
  disabled?: boolean;
  folder?: string;
  /** Max file size in MB. Default 10. */
  maxFileMb?: number;
}

/**
 * Unified hero background editor.
 * - Accepts image OR video, drag-and-drop supported by the underlying ImageUrlField.
 * - Live preview: images render as <img>; videos autoplay muted + looped with poster fallback.
 * - When the media is a video, a second field appears for the poster fallback image.
 */
const HeroMediaField = ({
  value,
  onChange,
  posterValue = "",
  onPosterChange,
  disabled,
  folder = "hero-media",
  maxFileMb = 10,
}: HeroMediaFieldProps) => {
  const video = useMemo(() => isVideoUrl(value), [value]);

  return (
    <div className="space-y-3">
      <ImageUrlField
        value={value}
        onChange={onChange}
        placeholder="Paste an image/video URL, or drop a file here"
        disabled={disabled}
        folder={folder}
        maxFileMb={maxFileMb}
        hidePreview
      />

      {/* Live preview */}
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
          <div className="aspect-[16/9] w-full">
            {video ? (
              <video
                key={value}
                src={value}
                poster={posterValue || undefined}
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={value}
                alt="Hero preview"
                className="h-full w-full object-cover"
                onError={(e) => ((e.currentTarget.style.opacity = "0.3"))}
              />
            )}
          </div>
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            {video ? <Play size={10} className="fill-white" /> : <ImageIcon size={10} />}
            {video ? "Video · muted · looping" : "Image"}
          </div>
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1 text-center px-4">
            <Film size={18} />
            <span>No hero background yet</span>
            <span className="text-[10px]">Drop an image or video above (≤ {maxFileMb} MB)</span>
          </div>
        </div>
      )}

      {/* Poster field — only relevant for videos */}
      {video && onPosterChange && (
        <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
          <label className="flex items-center gap-1 text-xs font-medium">
            <ImageIcon size={12} />
            Poster image fallback
            <span className="text-[10px] font-normal text-muted-foreground">
              — shown before the video loads or on devices that can't autoplay
            </span>
          </label>
          <ImageUrlField
            value={posterValue}
            onChange={onPosterChange}
            placeholder="https://… or drop a poster image"
            disabled={disabled}
            folder="hero-posters"
            maxFileMb={5}
            accept="image"
          />
        </div>
      )}
    </div>
  );
};

export default HeroMediaField;