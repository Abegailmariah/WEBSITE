import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CdM Student Portal" },
      {
        name: "description",
        content: "Privacy policy for the Colegio de Montalban student portal.",
      },
      { property: "og:title", content: "Privacy Policy — CdM Student Portal" },
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
    body: "Colegio de Montalban (CdM) respects your privacy and is committed to protecting the personal information you share through the CdM Student Portal. This Privacy Policy explains how we collect, use, and protect your data in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).",
  },
  {
    title: "2. Information We Collect",
    body: "When you use the Student Portal, we may collect the following personal information: your full name, student number, year and section, institute, program, and the details of any concerns you submit.",
  },
  {
    title: "3. How We Use Your Information",
    body: "The information we collect is used solely for the following purposes: verifying your student identity, displaying relevant announcements, processing and routing your concerns to the appropriate office, and providing responses to your inquiries. We do not sell, rent, or otherwise disclose your personal information to third parties for marketing purposes.",
  },
  {
    title: "4. Data Security",
    body: "We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. Access to submitted concerns is restricted to authorized personnel who need such information to address your concern.",
  },
  {
    title: "5. Data Retention",
    body: "We retain your personal information only for as long as necessary to fulfill the purposes described in this policy, comply with legal obligations, or as may be required for the proper administration of the portal.",
  },
  {
    title: "6. Your Rights",
    body: "Under the Data Privacy Act, you have the right to access, correct, or request the deletion of your personal information held by the institution. You may also object to the processing of your data and withdraw consent, subject to legal and operational requirements.",
  },
  {
    title: "7. Consent",
    body: "By submitting a concern through the portal, you consent to the collection and processing of your personal information for the stated purposes. You may withdraw your consent at any time by contacting the appropriate office.",
  },
  {
    title: "8. Contact Us",
    body: "For any questions or requests regarding this Privacy Policy or the handling of your personal data, you may contact Colegio de Montalban at info@cdm.edu.ph or through the registrar's office.",
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

