import { Link } from "@tanstack/react-router";

const quickLinks = [
  { label: "Home", to: "/" as const },
  { label: "Announcements", to: "/announcements" as const },
  { label: "Submit Concern", to: "/submit-concern" as const },
  { label: "Contact", to: "/contact" as const },
  { label: "Admin", to: "/admin" as const },
];

const contactInfo = [
  {
    label: "Address",
    value: "Colegio de Montalban, Kasiglahan Village, Rodriguez (Montalban), Rizal, Philippines",
  },
  {
    label: "Facebook",
    value: "Colegio de Montalban Official (Pamantasan ng Montalban)",
    link: "https://www.facebook.com/ColegioDeMontalbanOfficial",
  },
  { label: "Email", value: "info@cdm.edu.ph" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* School info */}
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center font-bold">
              CdM
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-white">Colegio de Montalban</div>
              <div className="text-xs text-secondary/90">Student Portal</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-secondary/80 max-w-md">
            Your one-stop portal for official announcements and submitting concerns to the right
            institute. Stay informed, stay connected.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
            Quick Links
          </h3>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-secondary/90 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
            Contact Us
          </h3>
          <ul className="space-y-3">
            {contactInfo.map((item) => (
              <li key={item.label} className="text-sm text-secondary/90">
                <span className="block font-medium text-white">{item.label}</span>
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors break-words"
                  >
                    {item.value}
                  </a>
                ) : (
                  item.value
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary/80">
          <span>© {new Date().getFullYear()} Colegio de Montalban. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
