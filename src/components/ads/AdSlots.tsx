import { useEffect, useRef } from "react";
import { ADSENSE } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 *  AD PLACEHOLDERS
 * ----------------------------------------------------------------------------
 *  These reserve layout space (prevents CLS) and show a labelled placeholder
 *  until you provide your own Google AdSense details.
 *
 *  TO GO LIVE WITH ADSENSE:
 *   1. Put your publisher ID in .env:  VITE_ADSENSE_PUBLISHER_ID="ca-pub-XXXX..."
 *   2. Add the AdSense loader script <link>/<script> once in src/routes/__root.tsx
 *      (a commented template is already there).
 *   3. Replace each `data-ad-slot="XXXXXXXXXX"` below with the real slot ID from
 *      your AdSense dashboard for that placement.
 *  Never use anyone else's publisher/slot IDs.
 * ============================================================================
 */

interface AdProps {
  slot?: string;
  className?: string;
  label?: string;
  minHeight?: number;
}

function AdShell({ slot = "XXXXXXXXXX", className, label = "Advertisement", minHeight = 120 }: AdProps) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!ADSENSE.enabled) return;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script when enabled
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* no-op until AdSense script is present */
    }
  }, []);

  if (ADSENSE.enabled) {
    return (
      <ins
        ref={ref}
        className={cn("adsbygoogle block", className)}
        style={{ display: "block", minHeight }}
        data-ad-client={ADSENSE.publisherId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    );
  }

  // No real AdSense ID yet → render nothing. No dashed dev boxes, no ".env"
  // labels leaking onto the live site. The layout collapses cleanly and stays
  // CLS-safe. The moment you add VITE_ADSENSE_PUBLISHER_ID, real ads appear here.
  return null;
}

export const HeaderAd = ({ className }: { className?: string }) => (
  <AdShell slot="XXXXXXXXXX" label="Header Ad" minHeight={90} className={cn("w-full", className)} />
);

export const InArticleAd = ({ className }: { className?: string }) => (
  <AdShell slot="XXXXXXXXXX" label="In-Article Ad" minHeight={160} className={cn("my-8 w-full", className)} />
);

export const SidebarAd = ({ className }: { className?: string }) => (
  <AdShell slot="XXXXXXXXXX" label="Sidebar Ad" minHeight={280} className={cn("w-full", className)} />
);

export const FooterAd = ({ className }: { className?: string }) => (
  <AdShell slot="XXXXXXXXXX" label="Footer Ad" minHeight={90} className={cn("w-full", className)} />
);

export const BetweenPostsAd = ({ className }: { className?: string }) => (
  <AdShell slot="XXXXXXXXXX" label="Sponsored" minHeight={200} className={cn("w-full", className)} />
);

export const RelatedPostsAdSlot = ({ className }: { className?: string }) => (
  <AdShell slot="XXXXXXXXXX" label="Advertisement" minHeight={160} className={cn("w-full", className)} />
);
