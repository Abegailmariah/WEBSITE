import { Link } from "@tanstack/react-router";

const contactInfo = [
  {
    label: "Address",
    value: "Colegio de Montalban, Kasiglahan Village, Rodriguez (Montalban), Rizal, Philippines",
  },
  {
    label: "Facebook",
    value: "Colegio de Montalban Official",
    link: "https://www.facebook.com/official.colegiodemontalban",
  },
  { label: "Email", value: "info@cdm.edu.ph" },
];

const quickLinks = [
  { to: "/", label: "Home" },
  { to: "/announcements", label: "Announcements" },
  { to: "/submit-concern", label: "Submit Concern" },
  { to: "/student", label: "Student Dashboard" },
  { to: "/contact", label: "About Us" },
];

const resources = [
  { to: "/faq", label: "FAQ" },
  { to: "/privacy-policy", label: "Privacy Policy" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* School info */}
        <div className="sm:col-span-2 lg:col-span-1">
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

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
            Quick Links
          </h3>
          <ul className="space-y-2">
            {quickLinks.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-secondary/90 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
            Resources
          </h3>
          <ul className="space-y-2">
            {resources.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-secondary/90 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <a
              href="https://www.facebook.com/official.colegiodemontalban"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Colegio de Montalban on Facebook"
              className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
              </svg>
              Facebook
            </a>
          </div>
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
          <div className="flex items-center gap-4">
            <Link to="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
