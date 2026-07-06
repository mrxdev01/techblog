import imageCompression from "browser-image-compression";

/**
 * Compress an image in the browser BEFORE uploading so pages stay fast.
 * We keep the quality high (visually lossless) while cutting file size a lot:
 *  - cap the longest edge at 1920px (plenty for full-width blog images)
 *  - re-encode to WebP at high quality (much smaller than JPEG/PNG, same look)
 *  - run in a web worker so the UI never freezes
 *
 * Returns the ORIGINAL file untouched if it is already tiny or not a raster
 * image (e.g. SVG/GIF), so nothing is ever degraded needlessly.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  // Don't touch vector/animated formats — compression would break them.
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  // Already small (< 200 KB) — not worth re-encoding.
  if (file.size <= 200 * 1024) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.85,
      fileType: "image/webp",
      alwaysKeepResolution: false,
    });

    // If compression somehow made it bigger, keep the original.
    if (compressed.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    // On any failure, fall back to the original file so uploads never break.
    return file;
  }
}

/** Human-readable size for toasts, e.g. "1.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
