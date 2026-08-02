import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements, type Announcement } from "@/lib/announcements-api";

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

function AnnouncementsPage() {
  const [open, setOpen] = useState<Announcement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "Critical" | "Normal">("All");

  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Announcements</h1>
          <p className="text-muted-foreground mt-1">Official updates from Colegio de Montalban.</p>
        </header>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="bg-card border rounded-lg p-5 shadow-sm animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-4 w-14 bg-muted rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded mb-3" />
              <div className="h-3 w-full bg-muted rounded mb-1" />
              <div className="h-3 w-5/6 bg-muted rounded mb-1" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Announcements</h1>
          <p className="text-muted-foreground mt-1">Official updates from Colegio de Montalban.</p>
        </header>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">Failed to load announcements.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:brightness-110 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (announcements.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Announcements</h1>
          <p className="text-muted-foreground mt-1">Official updates from Colegio de Montalban.</p>
        </header>
        <div className="rounded-lg border bg-card p-10 text-center">
          <div className="text-4xl mb-3">📢</div>
          <p className="text-lg font-medium text-foreground">No announcements yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back later for official updates.
          </p>
        </div>
      </div>
    );
  }

  // Filter announcements by search + priority
  const filtered = announcements.filter((a) => {
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "All" || a.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Announcements</h1>
        <p className="text-muted-foreground mt-1">Official updates from Colegio de Montalban.</p>
      </header>

      {/* Search + priority filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full sm:w-64 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex flex-wrap gap-2">
          {(["All", "Critical", "Normal"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={
                "px-3 py-2 rounded-md text-xs font-medium transition-colors " +
                (priorityFilter === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border text-muted-foreground hover:text-foreground")
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center">
          <div className="text-4xl mb-3">📢</div>
          <p className="text-lg font-medium text-foreground">No announcements match your search</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden={!!open}
          role="region"
          aria-label="All announcements list"
        >
          {filtered.map((a) => (
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
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-line">
                {a.content}
              </p>
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
      )}

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
