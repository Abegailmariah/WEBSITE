import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements, type Announcement } from "@/lib/announcements-api";

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

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20 text-center">
          <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold mb-4">
            Colegio de Montalban
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white">Welcome, CdM Student</h1>
          <p className="mt-4 text-base sm:text-lg text-secondary/90 max-w-2xl mx-auto">
            Stay updated with school announcements and submit concerns directly to your institute —
            all from one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
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
              <div key={s} className="bg-card border rounded-lg p-5 shadow-sm animate-pulse">
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
          <div className="rounded-lg border bg-card p-10 text-center">
            <div className="text-4xl mb-3">📢</div>
            <p className="text-lg font-medium text-foreground">
              No announcements available right now
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for official updates.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((a) => (
              <article key={a.id} className="bg-card border rounded-lg p-5 shadow-sm flex flex-col">
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
        {[
          {
            t: "Real-time Announcements",
            d: "Critical updates from your institute delivered instantly.",
          },
          {
            t: "Direct Concerns",
            d: "Send complaints, questions, or suggestions to the right office.",
          },
          {
            t: "Off-Campus Friendly",
            d: "Built for 4th-year students working outside the campus.",
          },
        ].map((f) => (
          <div key={f.t} className="bg-card rounded-lg p-6 shadow-sm border">
            <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center font-bold mb-3">
              ★
            </div>
            <h3 className="font-semibold text-lg">{f.t}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
