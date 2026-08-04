import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkCls =
    "text-secondary hover:text-white transition-colors font-medium px-3 py-2 rounded-md";
  const activeCls = "bg-white/10 text-white";

  const navLinks = [
    { to: "/", label: "Home", exact: true },
    { to: "/announcements", label: "Announcements", exact: false },
    { to: "/submit-concern", label: "Submit Concern", exact: false },
    { to: "/student", label: "Student", exact: false },
    { to: "/contact", label: "About Us", exact: false },
  ];

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center font-bold">
            CdM
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-white">Colegio de Montalban</div>
            <div className="text-xs text-secondary/90">Student Portal</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={linkCls}
              activeProps={{ className: `${linkCls} ${activeCls}` }}
              activeOptions={link.exact ? { exact: true } : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-md text-secondary hover:text-white hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            title={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-white/10 bg-primary">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 text-secondary hover:text-white transition-colors font-medium"
                activeProps={{ className: "text-white" }}
                activeOptions={link.exact ? { exact: true } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
