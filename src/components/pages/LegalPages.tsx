import { LegalPage } from "@/components/layout/LegalPage";
import { RLink, useRegion } from "@/components/RegionLink";
import { SITE } from "@/lib/config";

/** Single source of truth for legal contact + dates. */
const LEGAL = {
  email: "ytpremium4344@gmail.com",
  updated: "July 2026",
  /** Grievance Officer designation shown for IT Rules 2021 (India) & general complaints. */
  grievanceOfficer: `The Grievance Officer, ${SITE.name}`,
  grievanceTimelineAckHours: 48,
  grievanceTimelineResolveDays: 15,
} as const;

/** Region-specific data-protection framing shown inside the Privacy Policy. */
const REGION_PRIVACY: Record<
  string,
  { law: string; authority: string; rights: string }
> = {
  in: {
    law: "Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000 with its rules",
    authority: "the Data Protection Board of India",
    rights:
      "Under the DPDP Act 2023 you have the right to access a summary of your personal data, request correction or erasure, nominate another person to exercise your rights, and withdraw consent at any time.",
  },
  uk: {
    law: "UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018",
    authority: "the Information Commissioner's Office (ICO)",
    rights:
      "Under UK GDPR you have the rights of access, rectification, erasure, restriction, data portability, and objection, and you may withdraw consent at any time.",
  },
  ie: {
    law: "EU General Data Protection Regulation (GDPR) and Irish data-protection law",
    authority: "the Data Protection Commission (DPC) of Ireland",
    rights:
      "Under the GDPR you have the rights of access, rectification, erasure, restriction, data portability, and objection, and you may withdraw consent at any time.",
  },
  au: {
    law: "Privacy Act 1988 and the Australian Privacy Principles (APPs)",
    authority: "the Office of the Australian Information Commissioner (OAIC)",
    rights:
      "Under the Privacy Act 1988 you may request access to and correction of your personal information, and complain about how it is handled.",
  },
  ca: {
    law: "Personal Information Protection and Electronic Documents Act (PIPEDA)",
    authority: "the Office of the Privacy Commissioner of Canada",
    rights:
      "Under PIPEDA you may access your personal information, request corrections, and withdraw consent, subject to legal limits.",
  },
  us: {
    law: "applicable U.S. state privacy laws, including the California Consumer Privacy Act (CCPA/CPRA)",
    authority: "the relevant state attorney general or privacy agency",
    rights:
      "Depending on your state, you may have the right to know what personal information we hold, request its deletion, and opt out of the sale or sharing of personal information. We do not sell your personal information.",
  },
  sg: {
    law: "Personal Data Protection Act 2012 (PDPA)",
    authority: "the Personal Data Protection Commission (PDPC) of Singapore",
    rights:
      "Under the PDPA you may request access to and correction of your personal data and withdraw consent to its use.",
  },
  za: {
    law: "Protection of Personal Information Act, 2013 (POPIA)",
    authority: "the Information Regulator of South Africa",
    rights:
      "Under POPIA you may request access to, correction, or deletion of your personal information and object to its processing.",
  },
};

const DEFAULT_PRIVACY = {
  law: "applicable data-protection laws in your country of residence",
  authority: "your local data-protection authority",
  rights:
    "You may request access to, correction of, or deletion of your personal data, and withdraw consent at any time.",
};

function useRegionPrivacy() {
  const region = useRegion();
  return (region && REGION_PRIVACY[region]) || DEFAULT_PRIVACY;
}

export function PrivacyPage() {
  const rp = useRegionPrivacy();
  const region = useRegion();
  // Show the Grievance Officer section on the India route AND on the default
  // (unprefixed) site, since the primary domain (factonia.in) is India-based
  // and its main /privacy URL carries no region prefix.
  const showGrievance = !region || region === "in";

  return (
    <LegalPage title="Privacy Policy" updated={LEGAL.updated}>
      <p>
        This Privacy Policy explains how {SITE.name} ("we", "us", or "our") collects, uses, stores, and
        protects your personal data when you visit {SITE.url} (the "Site"). We are committed to processing
        your data lawfully and transparently in accordance with {rp.law}. By using the Site you agree to the
        practices described in this policy.
      </p>

      <h2>Who we are (Data Fiduciary / Controller)</h2>
      <p>
        {SITE.name} operates this Site and decides how and why your personal data is processed. For any
        privacy-related request you can reach us at{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>What data we collect</h2>
      <ul>
        <li>
          <strong>Information you provide voluntarily</strong> — such as your name, email address, and the
          content of any message you send us through our contact channels.
        </li>
        <li>
          <strong>Usage &amp; device data</strong> — anonymous or pseudonymous analytics such as pages
          visited, approximate location, browser type, and device information.
        </li>
        <li>
          <strong>Cookies &amp; similar technologies</strong> — small files used for essential site
          functionality, analytics, and (in future) advertising.
        </li>
      </ul>

      <h2>Why we collect it &amp; legal basis</h2>
      <p>
        We process your data to respond to your enquiries, operate and improve the Site, understand
        readership through analytics, keep the Site secure, and — where enabled — serve advertising. Our
        legal basis is your <strong>consent</strong> (which you may withdraw at any time) and our legitimate
        interest in running the Site. We only collect data that is necessary for these purposes.
      </p>

      <h2>Consent</h2>
      <p>
        Where the law requires it, we rely on your consent before collecting personal data or setting
        non-essential cookies. You give consent by voluntarily submitting information to us or by accepting
        cookies where a consent banner is shown. You can withdraw consent at any time by contacting us; this
        does not affect processing carried out before withdrawal.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep personal data only for as long as necessary for the purpose it was collected. Messages sent
        to us are generally retained for up to 24 months and then deleted, unless a longer period is required
        by law. Anonymous analytics may be retained in aggregated form.
      </p>

      <h2>Cookies &amp; analytics</h2>
      <p>
        We may use privacy-respecting analytics to understand how the Site is used. These services may set
        cookies. You can control or delete cookies through your browser settings. Where required by law, a
        cookie-consent notice is shown before non-essential cookies are set.
      </p>

      <h2>Advertising</h2>
      <p>
        We may in future display advertising through networks such as Google AdSense, Google AdMob, or other
        third-party ad partners. When advertising is enabled, these vendors may use cookies or device
        identifiers to serve and measure ads, including personalized ads based on your prior visits. Where
        required, we will request your consent first, and you can opt out of personalized advertising via{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          Google Ads Settings
        </a>{" "}
        or your device's ad-preferences settings. Third-party ad partners operate under their own privacy
        policies.
      </p>

      <h2>Sharing your data</h2>
      <p>
        We do not sell your personal data. We share it only with service providers who help us operate the
        Site (such as hosting, analytics, and advertising partners), and only to the extent necessary. These
        providers may process data outside your country under appropriate safeguards.
      </p>

      <h2>Your rights</h2>
      <p>{rp.rights}</p>
      <p>
        To exercise any of these rights, email us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We
        will respond within the timeframe required by law. If you are not satisfied with our response, you may
        lodge a complaint with {rp.authority}.
      </p>

      <h2>Children's privacy</h2>
      <p>
        The Site is not directed at children, and we do not knowingly collect personal data from children
        below the age set by the applicable law of your country. If you believe a child has provided us data,
        contact us and we will delete it.
      </p>

      {showGrievance && (
        <>
          <h2>Grievance Officer (IT Rules 2021)</h2>
          <p>
            In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics
            Code) Rules, 2021 and the DPDP Act 2023, the details of our Grievance Officer are:
          </p>
          <ul>
            <li>
              <strong>Name / Designation:</strong> {LEGAL.grievanceOfficer}
            </li>
            <li>
              <strong>Email:</strong> <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </li>
          </ul>
          <p>
            We acknowledge complaints within {LEGAL.grievanceTimelineAckHours} hours and aim to resolve them
            within {LEGAL.grievanceTimelineResolveDays} days of receipt.
          </p>
        </>
      )}

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The "Last updated" date above reflects the latest
        revision, and continued use of the Site after changes means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or use our{" "}
        <RLink to="/contact">contact page</RLink>.
      </p>
    </LegalPage>
  );
}

export function TermsPage() {
  const region = useRegion();
  const isIndia = region === "in";

  return (
    <LegalPage title="Terms of Service" updated={LEGAL.updated}>
      <p>
        These Terms of Service ("Terms") govern your access to and use of {SITE.name} at {SITE.url} (the
        "Site"). By accessing or using the Site, you agree to be bound by these Terms. If you do not agree,
        please do not use the Site.
      </p>

      <h2>Use of content</h2>
      <p>
        All content on the Site — including articles, text, graphics, and logos — is provided for general
        informational purposes and is owned by or licensed to {SITE.name}. It is protected by applicable
        copyright and intellectual-property laws. You may read and share links to our content, but you may not
        republish, reproduce, or redistribute it commercially without our prior written permission.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the Site, attempt unauthorized access, scrape content at scale, introduce
        malicious code, or disrupt its operation. You agree to use the Site only for lawful purposes and in a
        way that does not infringe the rights of others.
      </p>

      <h2>User submissions</h2>
      <p>
        If you send us messages or feedback, you grant us permission to use that content to respond to and
        improve our services. You are responsible for ensuring your submissions are lawful and do not infringe
        any third-party rights.
      </p>

      <h2>Third-party links &amp; advertising</h2>
      <p>
        The Site may contain links to third-party websites and may display advertising served by networks such
        as Google AdSense or AdMob. We are not responsible for the content, products, or practices of
        third-party sites or advertisers.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The Site and its content are provided "as is" and "as available" without warranties of any kind,
        whether express or implied, to the fullest extent permitted by law.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, {SITE.name} shall not be liable for any indirect,
        incidental, or consequential damages arising from your use of, or inability to use, the Site. Nothing
        in these Terms excludes liability that cannot be excluded under the law of your country.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify and hold {SITE.name} harmless from any claims or demands arising out of your
        breach of these Terms or your misuse of the Site.
      </p>

      <h2>Governing law</h2>
      <p>
        {isIndia
          ? `These Terms are governed by the laws of India, and any disputes are subject to the jurisdiction of the courts of India, without prejudice to any mandatory consumer-protection rights available to you in your country of residence.`
          : `These Terms are governed by the laws applicable where ${SITE.name} operates, without prejudice to any mandatory consumer-protection rights available to you in your country of residence.`}
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms at any time. The "Last updated" date reflects the latest version, and
        continued use of the Site constitutes acceptance of the revised Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or use our{" "}
        <RLink to="/contact">contact page</RLink>.
      </p>
    </LegalPage>
  );
}

export function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" updated={LEGAL.updated}>
      <p>
        The information provided by {SITE.name} on {SITE.url} (the "Site") is for general informational and
        educational purposes only. All content is published in good faith; however, we make no representation
        or warranty of any kind regarding its accuracy, completeness, or reliability.
      </p>

      <h2>No professional advice</h2>
      <p>
        Content on the Site does not constitute professional, legal, financial, medical, or other advice.
        Before acting on any information here, you should consult a qualified professional for your specific
        situation. Any reliance you place on the information is strictly at your own risk.
      </p>

      <h2>Accuracy &amp; updates</h2>
      <p>
        Topics can change over time. While we strive to keep articles current, we do not guarantee that all
        information remains accurate or up to date, and we are not obliged to update any content.
      </p>

      <h2>External links</h2>
      <p>
        The Site may contain links to external websites that are not provided or maintained by us. We do not
        guarantee the accuracy, relevance, or completeness of any information on third-party sites and are not
        responsible for their content.
      </p>

      <h2>Advertising &amp; affiliates</h2>
      <p>
        We may display advertising through networks such as Google AdSense or AdMob, and may in future earn
        commissions from affiliate links at no extra cost to you. Advertisements and affiliate links do not
        constitute an endorsement, and advertisers are solely responsible for their offerings.
      </p>

      <h2>Fair use &amp; images</h2>
      <p>
        We aim to use images and media that are original, properly licensed, or used under fair-use / fair-
        dealing principles. If you believe any content on the Site infringes your copyright, please contact us
        at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and we will review and, where appropriate,
        remove it promptly.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this disclaimer? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or use our{" "}
        <RLink to="/contact">contact page</RLink>.
      </p>
    </LegalPage>
  );
}
