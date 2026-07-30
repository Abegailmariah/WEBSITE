import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold mb-4">
            Colegio de Montalban
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Welcome, CdM Student
          </h1>
          <p className="mt-4 text-lg text-secondary/90 max-w-2xl mx-auto">
            Stay updated with school announcements and submit concerns
            directly to your institute — all from one place.
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

      <section className="max-w-6xl mx-auto px-4 py-16 grid gap-6 md:grid-cols-3">
        {[
          { t: "Real-time Announcements", d: "Critical updates from your institute delivered instantly." },
          { t: "Direct Concerns", d: "Send complaints, questions, or suggestions to the right office." },
          { t: "Off-Campus Friendly", d: "Built for 4th-year students working outside the campus." },
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
