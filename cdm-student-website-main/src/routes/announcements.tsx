import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — CdM Student Portal" },
      { name: "description", content: "Latest announcements for Colegio de Montalban students." },
      { property: "og:title", content: "CdM Announcements" },
      { property: "og:description", content: "Latest announcements for CdM students." },
    ],
  }),
  component: AnnouncementsPage,
});

type Announcement = {
  id: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  content: string;
};

const mockAnnouncements: Announcement[] = [
  { id: 1, title: "Class Suspension", date: "Oct 20", priority: "Critical", content: "Classes are suspended due to typhoon. Stay safe and monitor official channels for updates." },
  { id: 2, title: "Enrollment Schedule", date: "Oct 25", priority: "Normal", content: "Enrollment for 2nd Semester starts. Please prepare your requirements early." },
  { id: 3, title: "OJT Orientation", date: "Nov 03", priority: "Normal", content: "Mandatory OJT orientation for all 4th-year students at the AVR." },
  { id: 4, title: "System Maintenance", date: "Nov 08", priority: "Critical", content: "The student portal will be under maintenance from 10PM to 2AM." },
];

function AnnouncementsPage() {
  const [open, setOpen] = useState<Announcement | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Announcements</h1>
        <p className="text-muted-foreground mt-1">Official updates from Colegio de Montalban.</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mockAnnouncements.map((a) => (
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
            <h2 className="text-lg font-semibold text-foreground">{a.title}</h2>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.content}</p>
            <button
              onClick={() => setOpen(a)}
              className="mt-4 self-start text-primary font-medium hover:underline"
            >
              Read more →
            </button>
          </article>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-card rounded-lg max-w-lg w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{open.date}</span>
              <span
                className={
                  "text-xs font-semibold px-2 py-0.5 rounded-full " +
                  (open.priority === "Critical"
                    ? "bg-destructive text-white"
                    : "bg-secondary text-secondary-foreground")
                }
              >
                {open.priority}
              </span>
            </div>
            <h2 className="text-xl font-bold text-primary">{open.title}</h2>
            <p className="mt-3 text-sm text-foreground">{open.content}</p>
            <button
              onClick={() => setOpen(null)}
              className="mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}