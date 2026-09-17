import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Area-Based Academic Information Dissemination System" },
      {
        name: "description",
        content:
          "Frequently asked questions about the Area-Based Academic Information Dissemination System using Bluetooth Low Energy (BLE) Beacon Technology at Colegio de Montalban.",
      },
      { property: "og:title", content: "FAQ — Area-Based Academic Information Dissemination System" },
      {
        property: "og:description",
        content:
          "How BLE beacons deliver area-based academic announcements at Colegio de Montalban, plus concerns and support.",
      },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    question: "What is this system / capstone about?",
    answer:
      "This website is the web component of our capstone titled “Area-Based Academic Information Dissemination System using Bluetooth Low Energy (BLE) Beacon Technology.” It delivers official academic announcements from Colegio de Montalban based on area/location via BLE beacons, and gives students a direct channel to submit complaints, questions, or suggestions to the right institute or office.",
  },
  {
    question: "How does the BLE beacon technology work?",
    answer:
      "BLE beacons are small devices placed around campus (e.g., Registrar, institute buildings, AVR, gates). When a student with Bluetooth enabled is near a beacon's area, the system can push the announcement that applies to that area — so you only get updates relevant to where you are, instead of one noisy bulletin board for everyone.",
  },
  {
    question: "Do I need to turn on Bluetooth or install anything?",
    answer:
      "To receive area-based notifications on-site, turn on Bluetooth on your phone so it can detect nearby beacons. This website works without Bluetooth — you can read all announcements, submit concerns, and contact offices here from any device with internet. No account is needed to view announcements or submit a concern as a guest.",
  },
  {
    question: "What kind of announcements will I receive?",
    answer:
      "Official academic updates such as class suspensions, enrollment schedules, OJT orientations, scholarship applications, and system maintenance. Announcements marked “Critical” are urgent (e.g., suspension, maintenance), while “Normal” covers routine information. The latest announcements are also listed on the Home and Announcements pages even if you are off-campus.",
  },
  {
    question: "Who can use this system?",
    answer:
      "Anyone can view public announcements. Students of Colegio de Montalban — including 4th-year students who are off-campus for OJT — can submit concerns through the Submit Concern page with no account needed. Admin staff use the Admin dashboard to publish announcements and manage concerns.",
  },
  {
    question: "How do I submit a concern?",
    answer:
      "Go to the 'Submit Concern' page, fill out your name, student number (format YY-NNNNN, e.g., 24-00123), year & section, institute and program, select the type (Complaint, Question, or Suggestion), write your message, tick the Data Privacy consent, and click 'Submit Concern'. Your concern is routed to the appropriate institute or office.",
  },
  {
    question: "Which institutes are supported?",
    answer:
      "Three institutes: the Institute of Computer Studies (ICS), the Institute of Business and Entrepreneurship (IBE), and the Institute of Teacher Education (ITE). Choose the institute and program that match your enrollment so your concern reaches the right office.",
  },
  {
    question: "I am off-campus. Will I still get updates?",
    answer:
      "Yes. BLE area alerts only trigger when you are near a beacon on campus, but all announcements are mirrored on this website (Home and Announcements pages, refreshed automatically). Off-campus and OJT students can stay updated here and still submit concerns online.",
  },
  {
    question: "Is my personal information safe?",
    answer:
      "Yes. We collect only what is needed to address your concern (name, student number, section, program, and message) and process it in accordance with the Data Privacy Act of 2012 (RA 10173). Please review our Privacy Policy for full details.",
  },
  {
    question: "Who do I contact for other inquiries?",
    answer:
      "You can reach the Registrar, Accounting, Scholarship, or Guidance offices through the Contact / About Us page. The office directory there lists emails and office hours for each office.",
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
        badge="Support · BLE Beacon Capstone"
        title="Frequently Asked Questions"
        subtitle="How the Area-Based Academic Information Dissemination System using BLE Beacon Technology works at Colegio de Montalban."
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

