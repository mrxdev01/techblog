import { Clock, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { RLink, useRegion } from "@/components/RegionLink";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/config";

const CONTACT_EMAIL = "ytpremium4344@gmail.com";

/** Country-specific legal / data-handling note shown on the contact page. */
const REGION_NOTES: Record<string, { title: string; body: string }> = {
  in: {
    title: "India — DPDP Act 2023",
    body:
      "In line with the Digital Personal Data Protection Act, 2023 and the IT Rules 2021, any personal details you share by email are used solely to respond to your message. You may ask us to access or delete your data at any time by writing to the address above.",
  },
  uk: {
    title: "United Kingdom — UK GDPR",
    body:
      "Under the UK GDPR and the Data Protection Act 2018, information you send us is processed only to reply to your enquiry. You have the right to access, correct, or request erasure of your personal data by contacting us.",
  },
  ie: {
    title: "Ireland & EU — GDPR",
    body:
      "Under the EU General Data Protection Regulation (GDPR), details you email us are processed lawfully and only to handle your enquiry. You may exercise your rights of access, rectification, and erasure at any time.",
  },
  au: {
    title: "Australia — Privacy Act 1988",
    body:
      "In accordance with the Privacy Act 1988 and the Australian Privacy Principles, personal information you provide is collected only to respond to you and is never sold or shared for marketing.",
  },
  ca: {
    title: "Canada — PIPEDA",
    body:
      "Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), any information you share is used only to answer your message, with your consent, and kept no longer than necessary.",
  },
  us: {
    title: "United States",
    body:
      "We handle the information you email us responsibly and use it only to respond to your enquiry. We do not sell your personal information. Residents of California and other states may request access to or deletion of their data.",
  },
  sg: {
    title: "Singapore — PDPA",
    body:
      "Under Singapore's Personal Data Protection Act (PDPA), personal data you provide is collected, used, and retained only for the purpose of responding to your enquiry.",
  },
  za: {
    title: "South Africa — POPIA",
    body:
      "In line with the Protection of Personal Information Act (POPIA), the details you email us are processed lawfully and only to respond to your message.",
  },
};

const DEFAULT_NOTE = {
  title: "Your privacy",
  body:
    "Any details you email us are used only to respond to your enquiry. We never sell your personal information, and you can ask us to delete it at any time.",
};

export function ContactPage() {
  const region = useRegion();
  const note = (region && REGION_NOTES[region]) || DEFAULT_NOTE;
  const subject = encodeURIComponent(`Enquiry for ${SITE.name}`);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-bold">Get in touch</h1>
            <p className="text-sm text-muted-foreground">
              Questions, feedback, story tips, or partnership enquiries — we'd love to hear from you.
            </p>
          </div>
        </div>

        {/* Primary contact card */}
        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email us at</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}
                  className="text-lg font-semibold text-foreground underline-offset-4 hover:underline break-all"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <a href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}>Send an email</a>
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>We usually reply within a couple of days.</span>
          </div>
        </div>

        {/* Region-aware legal / privacy note */}
        <div className="mt-6 rounded-2xl border bg-muted/40 p-6">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{note.title}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{note.body}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Read our{" "}
            <RLink to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </RLink>{" "}
            and{" "}
            <RLink to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
              Terms
            </RLink>{" "}
            for full details.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
