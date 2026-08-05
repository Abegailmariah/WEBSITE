import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchAnnouncements } from "@/lib/announcements-api";
import { EmptyState } from "@/components/EmptyState";

interface Feature {
  t: string;
  d: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    t: "Real-time Announcements",
    d: "Critical updates from your institute delivered instantly.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 11v3a1 1 0 0 0 1 1h2l3 4V6L6 10H4a1 1 0 0 0-1 1Z" />
        <path d="M13 8.5a4 4 0 0 1 0 7" />
        <path d="M16 5.5a8 8 0 0 1 0 13" />
      </svg>
    ),
  },
  {
    t: "Direct Concerns",
    d: "Send complaints, questions, or suggestions to the right office.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M9 15h6" />
        <path d="M9 11h2" />
      </svg>
    ),
  },
  {
    t: "Off-Campus Friendly",
    d: "Built for 4th-year students working outside the campus.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </svg>
    ),
  },
];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const {
    data: announcements = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchAnnouncements(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const latest = announcements.slice(0, 3);
  const criticalCount = announcements.filter((a) => a.priority === "Critical").length;

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20 relative">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold mb-4">
                Colegio de Montalban
              </span>
              <h1 className="text-3xl sm:text-5xl font-bold text-white">
                Welcome, CdM Student
              </h1>
              <p className="mt-4 text-base sm:text-lg text-secondary/90 max-w-2xl mx-auto lg:mx-0">
                Stay updated with school announcements and submit concerns directly to your
                institute — all from one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  to="/announcements"
                  className="bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold hover:brightness-95 transition"
                >
                  View Announcements
                </Link>
                <Link
                  to="/submit-concern"
                  className="bg-white/10 border border-white/30 text-white px-6 py-3 rounded-md font-semibold hover:bg-white/20 transition"
                >
                  Submit a Concern
                </Link>
              </div>
            </div>

            {/* Stats / illustration panel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 border border-white/20 rounded-lg p-5 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white">{announcements.length}</div>
                <p className="text-sm text-secondary/80 mt-1">Active Announcements</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-lg p-5 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white">{criticalCount}</div>
                <p className="text-sm text-secondary/80 mt-1">Critical Alerts</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-lg p-5 backdrop-blur-sm col-span-2">
                <div className="text-xl font-semibold text-white">3 Institutes Supported</div>
                <p className="text-sm text-secondary/80 mt-1">
                  ICS, IBE, and ITE — concerns routed to the right office.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Announcements */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Latest Announcements</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recent official updates from Colegio de Montalban.
            </p>
          </div>
          <Link
            to="/announcements"
            className="text-primary font-medium text-sm hover:underline whitespace-nowrap"
          >
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="bg-card border rounded-lg p-5 shadow-sm animate-pulse"
                aria-hidden="true"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-4 w-14 bg-muted rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-muted rounded mb-3" />
                <div className="h-3 w-full bg-muted rounded mb-1" />
                <div className="h-3 w-5/6 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : isError || announcements.length === 0 ? (
          <EmptyState
            icon="announcement"
            title="No announcements available right now"
            description="Check back later for official updates."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((a) => (
              <article
                key={a.id}
                className="bg-card border rounded-lg p-5 shadow-sm flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{a.date}</span>
                  <span
                    className={
                      "text-xs font-semibold px-2 py-0.5 rounded-full " +
                      (a.priority === "Critical"
                        ? "bg-destructive text-white"
                        : "bg-secondary text-secondary-foreground")
                    }
                  >
                    {a.priority}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-line">
                  {a.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

<section className="max-w-6xl mx-auto px-4 pb-16 grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.t}
            className="bg-card rounded-lg p-6 shadow-sm border hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center font-bold mb-3">
              {f.icon}
            </div>
            <h3 className="font-semibold text-lg">{f.t}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
