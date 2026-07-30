import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export function Navbar() {
  const [dark, setDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("cdm-theme", dark ? "dark" : "light");
  }, [dark]);

  const linkCls =
    "text-secondary hover:text-white transition-colors font-medium px-3 py-2 rounded-md";
  const activeCls = "bg-white/10 text-white";

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
        <div className="flex items-center gap-1">
          <Link to="/" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/announcements" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Announcements
          </Link>
          <Link to="/submit-concern" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Submit Concern
          </Link>
          <button
            onClick={() => setDark((d) => !d)}
            className="ml-2 p-2 rounded-md text-secondary hover:text-white hover:bg-white/10 transition-colors"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
