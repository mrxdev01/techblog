import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Normalize a pasted video URL into a safe, embeddable iframe src.
 * Supports YouTube, Vimeo, Loom, Wistia, and Dailymotion. Returns null for
 * anything we don't recognise (so we never embed arbitrary/unsafe origins).
 */
export function toEmbedUrl(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname.startsWith("/embed/")) return `https://www.youtube.com${url.pathname}`;
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/").filter(Boolean)[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const id = url.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return /^\d+$/.test(id || "") ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") return `https://player.vimeo.com${url.pathname}`;

  // Loom
  if (host === "loom.com") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.loom.com/embed/${id}` : null;
  }

  // Dailymotion
  if (host === "dailymotion.com") {
    const id = url.pathname.split("/").filter(Boolean).pop()?.split("_")[0];
    return id ? `https://www.dailymotion.com/embed/video/${id}` : null;
  }
  if (host === "dai.ly") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.dailymotion.com/embed/video/${id}` : null;
  }

  // Wistia
  if (host === "wistia.com" || host === "fast.wistia.net" || host === "fast.wistia.com") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return id ? `https://fast.wistia.net/embed/iframe/${id}` : null;
  }

  return null;
}

/**
 * TipTap node that renders a responsive, sandboxed video embed.
 * Serializes to a `<div class="video-embed"><iframe …></iframe></div>` wrapper
 * that the public renderer's sanitizer explicitly allows.
 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div.video-embed" }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = (HTMLAttributes as { src?: string }).src || "";
    return [
      "div",
      { class: "video-embed" },
      [
        "iframe",
        mergeAttributes({
          src,
          frameborder: "0",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (options: { src: string }) =>
        ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    } as Partial<Record<string, unknown>> as never;
  },
});
