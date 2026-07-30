import { Link } from "@tanstack/react-router";

export function Navbar() {
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
        <nav className="flex items-center gap-1">
          <Link to="/" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/announcements" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Announcements
          </Link>
          <Link to="/submit-concern" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Submit Concern
          </Link>
        </nav>
      </div>
    </header>
  );
}