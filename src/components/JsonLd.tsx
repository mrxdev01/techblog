/** Renders a JSON-LD <script> block for structured data (SEO/AEO). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Content is app-controlled (not user free-text injected raw), and JSON.stringify escapes it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
