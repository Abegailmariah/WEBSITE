import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — CdM Student Portal" },
      {
        name: "description",
        content: "Frequently asked questions about the Colegio de Montalban student portal.",
      },
      { property: "og:title", content: "FAQ — CdM Student Portal" },
      {
        property: "og:description",
        content: "Frequently asked questions about the CdM student portal.",
      },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    question: "What is the CdM Student Portal?",
    answer:
      "The CdM Student Portal is your one-stop online hub for official announcements and for submitting complaints, questions, or suggestions directly to the appropriate institute or office at Colegio de Montalban.",
  },
  {
    question: "Who can use this portal?",
    answer:
      "Anyone can view public announcements. Students of Colegio de Montalban can submit concerns through the Submit Concern page — no account needed.",
  },
  {
    question: "How do I submit a concern?",
    answer:
      "Go to the 'Submit Concern' page, fill out your details, select the appropriate institute and type of concern, write your message, and click 'Submit Concern'. Make sure to consent to the data privacy notice before submitting.",
  },
  {
    question: "Which institutes are supported?",
    answer:
      "The portal supports three institutes: the Institute of Computer Studies (ICS), the Institute of Business and Entrepreneurship (IBE), and the Institute of Teacher Education (ITE).",
  },
  {
    question: "Is my personal information safe?",
    answer:
      "Yes. We collect only the information needed to address your concern and process it in accordance with the Data Privacy Act of 2012 (RA 10173). Please review our Privacy Policy for full details.",
  },
  {
    question: "Who do I contact for other inquiries?",
    answer:
      "You can reach the Registrar, Accounting, Scholarship, or Guidance offices through the Contact page. Our office directory lists the emails and hours for each office.",
  },
];

function FaqItem({
  faq,
  open,
  onToggle,
}: {
  faq: { question: string; answer: string };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        <span>{faq.question}</span>
        <span
          className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <PageHeader
        badge="Support"
        title="Frequently Asked Questions"
        subtitle="Answers to common questions about the CdM Student Portal and submitting concerns."
      />

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <FaqItem
            key={faq.question}
            faq={faq}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>

      <div className="mt-10 bg-primary text-primary-foreground rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-white">Still have questions?</h2>
        <p className="mt-2 text-sm text-secondary/90 max-w-md mx-auto">
          Reach our offices through the Contact page, or submit your question directly through the
          portal.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold hover:brightness-95 hover:-translate-y-0.5 transition-all"
          >
            Contact Us
          </Link>
          <Link
            to="/submit-concern"
            className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-6 py-3 rounded-md font-semibold hover:bg-white/20 transition-colors"
          >
            Submit a Concern
          </Link>
        </div>
      </div>
    </div>
  );
}

