import { supabase } from "@/lib/supabase";

export const BLOG_BUCKET = "blog-images";

/**
 * Extract the storage object paths of every blog-images file referenced by the
 * given strings. Covers featured_image, og_image and any <img> inside content HTML.
 */
export function collectImagePaths(sources: (string | null | undefined)[]): string[] {
  const paths = new Set<string>();
  const marker = `/storage/v1/object/public/${BLOG_BUCKET}/`;
  const escaped = marker.replace(/[/]/g, "\\/");
  for (const src of sources) {
    if (!src) continue;
    const regex = new RegExp(`${escaped}([^"'\\s)]+)`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(src)) !== null) {
      const path = decodeURIComponent(match[1].split("?")[0]);
      if (path) paths.add(path);
    }
  }
  return [...paths];
}

/** Delete the given object paths from the blog-images bucket (best-effort, never throws). */
export async function removeBlogImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  try {
    const { error } = await supabase.storage.from(BLOG_BUCKET).remove(paths);
    if (error) console.warn("[storage] cleanup failed:", error.message);
  } catch (err) {
    console.warn("[storage] cleanup error:", err);
  }
}
