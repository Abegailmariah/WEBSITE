import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — CdM Student Portal" },
      { name: "description", content: "Contact information and office directory for Colegio de Montalban." },
      { property: "og:title", content: "Contact — CdM Student Portal" },
      { property: "og:description", content: "Contact information and office directory for Colegio de Montalban." },
    ],
  }),
  component: ContactPage,
});

const contactCards = [
  {
    icon: "📍",
    title: "Address",
    lines: ["Colegio de Montalban", "Kasiglahan Village, Rodriguez, Philippines, 1860", "(Montalban), Rizal, Philippines"],
},
  {
    icon: "👍",
    title: "Facebook",
    link: "https://www.facebook.com/official.colegiodemontalban",
    linkLabel: "Colegio de Montalban Official",
    lines: [],
  },
  {
    icon: "✉️",
    title: "Email",
    lines: ["info@cdm.edu.ph", "registrar@cdm.edu.ph"],
  },
  {
    icon: "🕒",
    title: "Office Hours",
    lines: ["Mon–Fri: 8:00 AM – 5:00 PM", "Sat: 8:00 AM – 12:00 PM"],
  },
];

const offices = [
  { office: "Registrar's Office", contact: "registrar@cdm.edu.ph", hours: "Mon–Fri, 8AM–5PM" },
  { office: "Accounting Office", contact: "accounting@cdm.edu.ph", hours: "Mon–Fri, 8AM–5PM" },
  { office: "Scholarship Office", contact: "scholarships@cdm.edu.ph", hours: "Mon–Fri, 8AM–5PM" },
  { office: "Guidance & Counseling", contact: "guidance@cdm.edu.ph", hours: "Mon–Fri, 8AM–5PM" },
];

function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10">
        <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold mb-4">
          Colegio de Montalban
        </span>
        <h1 className="text-3xl font-bold text-primary">Contact Us</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Reach out to the school or find the right office for your concerns.
          You can also submit your concerns directly through the portal.
        </p>
      </header>

      {/* Contact cards */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {contactCards.map((card) => (
          <div key={card.title} className="bg-card border rounded-lg p-5 shadow-sm">
            <div className="text-2xl mb-2">{card.icon}</div>
            <h2 className="font-semibold text-foreground">{card.title}</h2>
            {card.lines.map((line, i) => (
              <p key={i} className="text-sm text-muted-foreground mt-0.5">
                {line}
              </p>
            ))}
            {card.link && (
              <a
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-primary font-medium hover:underline break-words"
              >
                {card.linkLabel}
              </a>
            )}
          </div>
        ))}
      </section>

      {/* About section */}
      <section className="mb-10">
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-3">About the School</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Colegio de Montalban (CdM) is a public institution in Rodriguez
            (Montalban), Rizal, committed to providing accessible, quality
            tertiary education to the youth of the municipality and beyond.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Through this student portal, we aim to keep students informed with
            official announcements and provide a direct channel for submitting
            concerns to the appropriate institute or office.
          </p>
        </div>
      </section>

      {/* Office directory */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-foreground mb-4">Office Directory</h2>
        <div className="bg-card border rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold text-foreground">Office</th>
                <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 font-semibold text-foreground">Hours</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((office) => (
                <tr key={office.office} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{office.office}</td>
                  <td className="px-4 py-3 text-muted-foreground">{office.contact}</td>
                  <td className="px-4 py-3 text-muted-foreground">{office.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-lg bg-primary text-primary-foreground p-8 text-center">
        <h2 className="text-xl font-bold text-white">Need help with something?</h2>
        <p className="mt-2 text-secondary/90 text-sm max-w-xl mx-auto">
          Submit a complaint, question, or suggestion directly to your institute
          and we'll make sure it reaches the right office.
        </p>
        <Link
          to="/submit-concern"
          className="inline-block mt-5 bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold hover:brightness-95 transition"
        >
          Submit a Concern
        </Link>
      </section>
    </div>
  );
}
