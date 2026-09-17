import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  adminLogin,
  adminLogout,
  checkAdminSession,
  deleteAnnouncement,
  deleteConcern,
  downloadConcernsCsv,
  fetchAdminConcerns,
  fetchAdminStats,
  fetchAuditLog,
  updateAnnouncement,
  updateConcernStatus,
  updateConcernWithResponse,
  type AdminConcern,
  type AdminStats,
  type AuditLogEntry,
} from "@/lib/admin-api";
import {
  createAnnouncement,
  fetchAnnouncementsPage,
  type Announcement,
  type AnnouncementsResponse,
} from "@/lib/announcements-api";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Area-Based Academic Information Dissemination System (BLE)" },
      {
        name: "description",
        content:
          "Admin console for publishing area-based announcements disseminated via Bluetooth Low Energy (BLE) beacons at Colegio de Montalban, and for managing student concerns.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"overview" | "announcements" | "concerns" | "audit">("overview");

  // Check session on mount (httpOnly cookie)
  useEffect(() => {
    void checkAdminSession()
      .then(setAuthed)
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-muted-foreground text-sm">Checking session...</div>
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-2">
            Admin · BLE Beacon Capstone
          </span>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Publish area-based announcements for BLE beacons and track student concerns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="text-sm text-primary font-medium hover:underline">
            ← Back to site
          </Link>
          <button
            onClick={async () => {
              await adminLogout();
              setAuthed(false);
            }}
            className="text-sm border border-border rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["overview", "announcements", "concerns", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors " +
              (tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-card border text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "concerns" && <ConcernsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminLogin(pin);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3">
            <Logo className="w-12 h-12" title="Colegio de Montalban" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the admin PIN to publish area-based announcements and manage student concerns.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="••••••••"
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:brightness-110 transition disabled:opacity-60"
          >
            {busy ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Authorized personnel only. Contact the system administrator if you need access.
        </p>
      </div>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="bg-card border rounded-lg p-6 shadow-sm animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Area Announcements", value: stats.announcements, accent: "text-primary" },
    { label: "Total Concerns", value: stats.concerns, accent: "text-foreground" },
    { label: "Pending", value: stats.pending, accent: "text-amber-600" },
    { label: "Resolved", value: stats.resolved, accent: "text-emerald-600" },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border rounded-lg p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-card border rounded-lg p-6 shadow-sm">
        <h2 className="font-semibold text-foreground mb-2">Concern Status</h2>
        <p className="-mt-1 mb-3 text-xs text-muted-foreground">
          Concerns submitted through the website are routed here; area announcements above are what
          BLE beacons broadcast per location.
        </p>
        <div className="flex flex-wrap gap-6">
          {[
            { label: "Pending", value: stats.pending, color: "#f59e0b" },
            { label: "Read", value: stats.read, color: "#3b82f6" },
            { label: "Resolved", value: stats.resolved, color: "#10b981" },
          ].map((s) => {
            const total = stats.concerns || 1;
            const pct = Math.round((s.value / total) * 100);
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className="text-sm font-semibold text-foreground">
                  {s.value} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Announcements tab ──────────────────────────────────────────────

function AnnouncementsTab() {
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<AnnouncementsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const limit = 10;

  const load = async (p: number) => {
    setError(null);
    try {
      const data = await fetchAnnouncementsPage(p, limit);
      setResponse(data);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this announcement?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAnnouncement(id);
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.filter((a) => a.id !== id),
              total: Math.max(0, prev.total - 1),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete announcement");
    } finally {
      setBusy(false);
    }
  };

  const filtered =
    response?.data.filter((a) => a.title.toLowerCase().includes(search.toLowerCase())) ?? [];

  const items = response?.data ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Area Announcements</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            These are published to the website and mirrored to BLE beacons per area.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full sm:w-48 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:brightness-110 transition whitespace-nowrap"
          >
            {showForm ? "Cancel" : "+ New Area Announcement"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <NewAnnouncementForm
          onCreated={(a) => {
            setResponse((prev) =>
              prev ? { ...prev, data: [a, ...prev.data], total: prev.total + 1 } : prev,
            );
            setShowForm(false);
          }}
        />
      )}

      {editing && (
        <EditAnnouncementForm
          announcement={editing}
          onCancel={() => setEditing(null)}
          onUpdated={(updated) => {
            setResponse((prev) =>
              prev
                ? {
                    ...prev,
                    data: prev.data.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
                  }
                : prev,
            );
            setEditing(null);
          }}
        />
      )}

      {!response ? (
        <div className="bg-card border rounded-lg p-10 text-center text-muted-foreground text-sm">
          Loading announcements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {search ? "No announcements match your search." : "No announcements yet."}
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg shadow-sm divide-y">
          {filtered.map((a) => (
            <div key={a.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
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
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                    title="Campus area whose BLE beacon mirrors this announcement"
                  >
                    📍 {a.area || "Campus-Wide"}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.date}</span>
                </div>
                <h3 className="font-semibold text-foreground mt-1.5">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">
                  {a.content}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditing(a);
                    setShowForm(false);
                  }}
                  disabled={busy}
                  className="text-xs text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={busy}
                  className="text-xs text-destructive border border-destructive/30 rounded-md px-2.5 py-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {response && response.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {response.page} of {response.totalPages} ({response.total} total)
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= response.totalPages}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// Campus areas with BLE beacons. Keep in sync with the mobile/beacon deployment.
export const CAMPUS_AREAS = [
  "Campus-Wide",
  "Main Gate",
  "Registrar's Office",
  "Accounting Office",
  "Scholarship Office",
  "Guidance & Counseling",
  "ICS Building",
  "IBE Building",
  "ITE Building",
  "AVR",
  "Library",
  "Canteen",
] as const;

function NewAnnouncementForm({ onCreated }: { onCreated: (a: Announcement) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<"Critical" | "Normal">("Normal");
  const [area, setArea] = useState<string>("Campus-Wide");
  const [customArea, setCustomArea] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resolvedArea = area === "Other" ? customArea.trim() : area;
      const created = await createAnnouncement({ title, date, priority, area: resolvedArea, content });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card border rounded-lg p-5 mb-6 grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={input}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
        <input
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={input}
          placeholder="e.g. Nov 20, 2025"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "Critical" | "Normal")}
          className={input}
        >
          <option value="Normal">Normal</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Area / Beacon Location *
        </label>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={input} required>
          {CAMPUS_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value="Other">Other…</option>
        </select>
        {area === "Other" && (
          <input
            required
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            className={`${input} mt-2`}
            placeholder="e.g. Covered Court"
          />
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          The BLE beacon in this area mirrors the announcement.
        </p>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-foreground mb-1">Content *</label>
        <textarea
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={input}
          placeholder="Write the announcement details..."
        />
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-semibold hover:brightness-110 transition disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create Announcement"}
        </button>
      </div>
    </form>
  );
}

function EditAnnouncementForm({
  announcement,
  onCancel,
  onUpdated,
}: {
  announcement: Announcement;
  onCancel: () => void;
  onUpdated: (updated: Announcement) => void;
}) {
  const [title, setTitle] = useState(announcement.title);
  const [date, setDate] = useState(announcement.date);
  const [priority, setPriority] = useState<"Critical" | "Normal">(announcement.priority);
  const [area, setArea] = useState<string>(
    (CAMPUS_AREAS as readonly string[]).includes(announcement.area)
      ? announcement.area
      : "Other",
  );
  const [customArea, setCustomArea] = useState<string>(
    (CAMPUS_AREAS as readonly string[]).includes(announcement.area) ? "" : announcement.area,
  );
  const [content, setContent] = useState(announcement.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resolvedArea = area === "Other" ? customArea.trim() : area;
      const updated = await updateAnnouncement(announcement.id, {
        title,
        date,
        priority,
        area: resolvedArea,
        content,
      });
      onUpdated({ ...announcement, ...updated });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update announcement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card border rounded-lg p-5 mb-6 grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={input}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
        <input
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={input}
          placeholder="e.g. Nov 20, 2025"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "Critical" | "Normal")}
          className={input}
        >
          <option value="Normal">Normal</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Area / Beacon Location *
        </label>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={input} required>
          {CAMPUS_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value="Other">Other…</option>
        </select>
        {area === "Other" && (
          <input
            required
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            className={`${input} mt-2`}
            placeholder="e.g. Covered Court"
          />
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-foreground mb-1">Content *</label>
        <textarea
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={input}
          placeholder="Write the announcement details..."
        />
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-semibold hover:brightness-110 transition disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Concerns tab ───────────────────────────────────────────────────

function ConcernsTab() {
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<{
    data: AdminConcern[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "Pending" | "Read" | "Resolved">("All");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [replyId, setReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const limit = 10;

  const load = async (p: number, q: string = search.trim()) => {
    setError(null);
    try {
      const data = await fetchAdminConcerns(p, limit, q);
      setResponse(data);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load concerns");
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const handleStatus = async (id: number, status: AdminConcern["status"]) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateConcernStatus(id, status);
      if (response) {
        setResponse({
          ...response,
          data: response.data.map((c) => (c.id === id ? updated : c)),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  const handleReply = async (id: number) => {
    if (!replyText.trim()) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateConcernWithResponse(id, "Resolved", replyText.trim());
      if (response) {
        setResponse({
          ...response,
          data: response.data.map((c) => (c.id === id ? updated : c)),
        });
      }
      setReplyId(null);
      setReplyText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update response");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConcern = async (id: number) => {
    if (!window.confirm("Delete this concern permanently?")) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteConcern(id);
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.filter((c) => c.id !== id),
              total: Math.max(0, prev.total - 1),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete concern");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = response?.data.filter((c) => filter === "All" || c.status === filter) ?? [];

  // Reset to page 1 when filter changes
  const handleFilterChange = (f: typeof filter) => {
    setFilter(f);
    if (f !== filter) {
      void load(1);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Concerns</h2>
          <div className="flex flex-wrap gap-2">
            {(["All", "Pending", "Read", "Resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors " +
                  (filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => downloadConcernsCsv(search.trim())}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-card border text-muted-foreground hover:text-foreground"
              title="Download all concerns as CSV"
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(1);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, student number, or message..."
            className="w-full sm:w-80 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:brightness-110 transition"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!response ? (
        <div className="bg-card border rounded-lg p-10 text-center text-muted-foreground text-sm">
          Loading concerns...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm">No concerns match this filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card border rounded-lg p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {c.last_name}, {c.first_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.student_number} • {c.section} • {c.program}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.institute}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "text-xs font-semibold px-2 py-0.5 rounded-full " +
                      (c.status === "Resolved"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "Read"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700")
                    }
                  >
                    {c.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-foreground mt-3 whitespace-pre-line">{c.message}</p>

              {c.response && (
                <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-foreground">Response:</p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">
                    {c.response}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-xs text-muted-foreground mr-1">Status:</span>
                {(["Pending", "Read", "Resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(c.id, s)}
                    disabled={busyId === c.id}
                    className={
                      "text-xs rounded-md px-2.5 py-1.5 border transition-colors disabled:opacity-50 " +
                      (c.status === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {s}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setReplyId(replyId === c.id ? null : c.id);
                    setReplyText(c.response ?? "");
                  }}
                  disabled={busyId === c.id}
                  className="text-xs text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {replyId === c.id ? "Cancel" : c.response ? "Edit response" : "Add response"}
                </button>

                <button
                  onClick={() => handleDeleteConcern(c.id)}
                  disabled={busyId === c.id}
                  className="ml-auto text-xs text-destructive border border-destructive/30 rounded-md px-2.5 py-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              {replyId === c.id && (
                <div className="mt-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Write a response for the student..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setReplyId(null)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReply(c.id)}
                      disabled={busyId === c.id || !replyText.trim()}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
                    >
                      {busyId === c.id ? "Saving..." : "Save response"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {response && response.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {response.page} of {response.totalPages} ({response.total} total)
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= response.totalPages}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Audit tab ──────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await fetchAuditLog(50);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-card border text-muted-foreground hover:text-foreground transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!logs ? (
        <div className="bg-card border rounded-lg p-10 text-center text-muted-foreground text-sm">
          Loading audit log...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm">No audit entries yet.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg shadow-sm divide-y">
          {logs.map((entry) => (
            <div key={entry.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm">{entry.action}</p>
                {entry.detail && (
                  <p className="text-sm text-muted-foreground mt-0.5 break-words">{entry.detail}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {entry.created_at ?? ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
