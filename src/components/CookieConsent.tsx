import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RLink } from "@/components/RegionLink";
import { ANALYTICS, ADSENSE } from "@/lib/config";

const STORAGE_KEY = "factonia-cookie-consent";

/** True once any tracking/advertising service is actually configured. */
const TRACKING_CONFIGURED =
  !!ANALYTICS.gaMeasurementId || !!ANALYTICS.clarityProjectId || ADSENSE.enabled;

/**
 * Consent-based cookie notice.
 *
 * Only appears when at least one tracking/advertising service is configured
 * (Google Analytics, Clarity, or AdSense) AND the visitor hasn't chosen yet.
 * While no such service is enabled, nothing renders — because no non-essential
 * cookies are set, so no banner is legally required. The moment you add
 * VITE_GA_MEASUREMENT_ID / VITE_ADSENSE_PUBLISHER_ID etc., the banner activates
 * automatically. The stored choice can be read elsewhere to gate tag loading.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!TRACKING_CONFIGURED) return;
    try {
      const choice = localStorage.getItem(STORAGE_KEY);
      if (!choice) setVisible(true);
    } catch {
      /* localStorage unavailable — skip the banner */
    }
  }, []);

  function decide(choice: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
    setVisible(false);
    // Notify any listeners (e.g. an analytics loader) about the decision.
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: choice }));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border bg-card/95 p-4 shadow-elegant backdrop-blur-lg sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Cookie className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use cookies for analytics and advertising to improve your experience. You can accept or
            decline non-essential cookies. Read our{" "}
            <RLink to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </RLink>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => decide("declined")} className="flex-1 sm:flex-none">
            Decline
          </Button>
          <Button size="sm" onClick={() => decide("accepted")} className="flex-1 sm:flex-none">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
