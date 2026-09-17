import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Area-Based Academic Information Dissemination System" },
      {
        name: "description",
        content:
          "Privacy policy for the Area-Based Academic Information Dissemination System using BLE Beacon Technology at Colegio de Montalban.",
      },
      {
        property: "og:title",
        content: "Privacy Policy — Area-Based Academic Information Dissemination System",
      },
      {
        property: "og:description",
        content: "How Colegio de Montalban collects and processes your data.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

const sections = [
  {
    title: "1. Introduction",
    body: "Colegio de Montalban (CdM) respects your privacy and is committed to protecting the personal information you share through the Area-Based Academic Information Dissemination System using Bluetooth Low Energy (BLE) Beacon Technology (this website and its companion on-site beacon features). This Privacy Policy explains how we collect, use, and protect your data in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).",
  },
  {
    title: "2. Information We Collect",
    body: "When you use this system, we may collect the following personal information: your full name, student number, year and section, institute, program, and the details of any concerns you submit. For on-site area-based notifications, your device may detect nearby BLE beacon identifiers (e.g., beacon ID and signal strength) locally on your phone to determine which area's announcement applies to you — this proximity check happens on your device and does not by itself identify you to the school.",
  },
  {
    title: "3. How BLE Beacons Handle Your Data",
    body: "BLE beacons placed around campus only broadcast a short identifier — they do not collect, store, or transmit your personal information. Your phone listens for these signals when Bluetooth is on and shows the announcement matching your area. We do not perform continuous GPS tracking of students. If you keep Bluetooth off or use only this website, you can still read all announcements online without any beacon interaction.",
  },
  {
    title: "4. How We Use Your Information",
    body: "The information we collect is used solely for the following purposes: verifying your student identity, displaying relevant area-based announcements, processing and routing your concerns to the appropriate office, and providing responses to your inquiries. We do not sell, rent, or otherwise disclose your personal information to third parties for marketing purposes.",
  },
  {
    title: "5. Data Security",
    body: "We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. Access to submitted concerns is restricted to authorized personnel who need such information to address your concern.",
  },
  {
    title: "6. Data Retention",
    body: "We retain your personal information only for as long as necessary to fulfill the purposes described in this policy, comply with legal obligations, or as may be required for the proper administration of the system. Beacon proximity checks leave no record on our servers — only concerns you actively submit through this website are stored.",
  },
  {
    title: "7. Your Rights",
    body: "Under the Data Privacy Act, you have the right to access, correct, or request the deletion of your personal information held by the institution. You may also object to the processing of your data and withdraw consent, subject to legal and operational requirements.",
  },
  {
    title: "8. Consent",
    body: "By submitting a concern through this system, you consent to the collection and processing of your personal information for the stated purposes. You may withdraw your consent at any time by contacting the appropriate office. Using Bluetooth near campus beacons to view area announcements does not constitute consent for any additional data collection beyond what is described here.",
  },
  {
    title: "9. Contact Us",
    body: "For any questions or requests regarding this Privacy Policy or the handling of your personal data, you may contact Colegio de Montalban at info@cdm.edu.ph or through the registrar's office. See the About Us page for the full office directory.",
  },
];

function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <PageHeader
        badge="Legal"
        title="Privacy Policy"
        subtitle="How Colegio de Montalban collects, uses, and protects your personal information."
      />

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-foreground text-lg">{section.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        Last updated: {new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

