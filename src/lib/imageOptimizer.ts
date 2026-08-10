/**
 * Client-side catalogue image optimisation.
 * Resizes to a max dimension and re-encodes (WebP when supported) so uploads
 * stay small. Returns before/after stats so the admin can review the storage
 * and quality impact before publishing.
 */

export interface OptimizedImage {
  file: File;
  originalBytes: number;
  optimizedBytes: number;
  savedBytes: number;
  savedPercent: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  format: string;
  quality: number;
  previewUrl: string;
  originalPreviewUrl: string;
}

export const MAX_DIMENSION = 1600;
export const DEFAULT_QUALITY = 0.82;

const supportsWebp = (): boolean => {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const optimizeImage = async (
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<OptimizedImage> => {
  const maxDimension = opts.maxDimension ?? MAX_DIMENSION;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const originalPreviewUrl = URL.createObjectURL(file);

  // GIFs may be animated — re-encoding would lose the animation.
  if (file.type === "image/gif") {
    return {
      file,
      originalBytes: file.size,
      optimizedBytes: file.size,
      savedBytes: 0,
      savedPercent: 0,
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
      format: file.type,
      quality: 1,
      previewUrl: originalPreviewUrl,
      originalPreviewUrl,
    };
  }

  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const format = supportsWebp() ? "image/webp" : "image/jpeg";
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression failed"))), format, quality),
  );

  // Never ship a bigger file than the original.
  const useOptimized = blob.size < file.size;
  const finalBlob = useOptimized ? blob : file;
  const ext = format === "image/webp" ? "webp" : "jpg";
  const outFile = useOptimized
    ? new File([blob], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: format })
    : file;

  return {
    file: outFile,
    originalBytes: file.size,
    optimizedBytes: finalBlob.size,
    savedBytes: Math.max(0, file.size - finalBlob.size),
    savedPercent: file.size ? Math.max(0, Math.round(((file.size - finalBlob.size) / file.size) * 100)) : 0,
    originalWidth: img.width,
    originalHeight: img.height,
    width: useOptimized ? width : img.width,
    height: useOptimized ? height : img.height,
    format: useOptimized ? format : file.type,
    quality: useOptimized ? quality : 1,
    previewUrl: URL.createObjectURL(finalBlob),
    originalPreviewUrl,
  };
};
