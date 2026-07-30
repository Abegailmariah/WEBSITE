import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type KeyboardEvent } from "react";

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
  { id: 2, title: "Enrollment Schedule", date: "Oct 25", priority: "Normal", content: "Enrollment for this Semester starts. Please prepare your requirements early.\n\n1st Year: October 25-26\n2nd Year: October 27-28\n3rd Year: October 29-30\n4th Year: October 31 - November 1" },
  { id: 3, title: "OJT Orientation", date: "Nov 03", priority: "Normal", content: "Mandatory OJT orientation for all 4th-year students at the AVR." },
  { id: 4, title: "System Maintenance", date: "Nov 08", priority: "Critical", content: "The student portal will be under maintenance from 10PM to 2AM." },
  { id: 5, title: "Scholarship Application", date: "Nov 10", priority: "Normal", content: "Scholarship applications are now open for the upcoming semester!\n\nEligible students may apply for:\n- TES (Tertiary Education Subsidy)\n- TDP (Tulong Dunong Program)\n \nDeadline: November 30\nLocation: Registrar's Office\n\nFor inquiries, visit the Scholarship Office or email scholarships@cdm.edu.ph." },
];

function AnnouncementsPage() {
  const [open, setOpen] = useState<Announcement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: lock focus inside modal while open, restore on close
  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      // Focus the close button when modal opens
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [open]);

  // Close on Escape key
  function handleModalKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Announcements</h1>
        <p className="text-muted-foreground mt-1">Official updates from Colegio de Montalban.</p>
      </header>

      <div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden={!!open}
        role="region"
        aria-label="All announcements list"
      >
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
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-line">{a.content}</p>
            <button
              onClick={() => setOpen(a)}
              className="mt-4 self-start text-primary font-medium hover:underline"
              aria-expanded={open?.id === a.id}
              aria-controls={`announcement-dialog-${a.id}`}
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
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`announcement-title-${open.id}`}
          id={`announcement-dialog-${open.id}`}
        >
          <div
            ref={modalRef}
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
            <h2 id={`announcement-title-${open.id}`} className="text-xl font-bold text-primary">
              {open.title}
            </h2>
            <p className="mt-3 text-sm text-foreground whitespace-pre-line">{open.content}</p>
            <button
              ref={closeButtonRef}
              onClick={() => setOpen(null)}
              className="mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
              aria-label={`Close ${open.title} announcement`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

