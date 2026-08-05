import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  studentLogin,
  studentRegister,
  checkStudentSession,
  studentLogout,
  fetchStudentConcerns,
  fetchStudentAnnouncements,
  type Student,
  type StudentConcern,
  type StudentRegisterPayload,
} from "@/lib/student-api";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — CdM Student Portal" },
      {
        name: "description",
        content: "Login to view your concerns and announcements at Colegio de Montalban.",
      },
      { property: "og:title", content: "Student Dashboard — CdM" },
      {
        property: "og:description",
        content: "View your submitted concerns and relevant announcements.",
      },
    ],
  }),
  component: StudentPage,
});

function GreetingHeader({ student }: { student: Student }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary">
        {getGreeting()}, {student.first_name} 👋
      </h1>
      <p className="text-muted-foreground mt-1">{formatToday()}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {student.institute} — {student.program} · {student.section} · {student.student_number}
      </p>
    </div>
  );
}

const institutes = [
  "ICS — Institute of Computer Studies",
  "IBE — Institute of Business and Entrepreneurship",
  "ITE — Institute of Teacher Education",
];

const programs = [
  "BSIT",
  "BSCPE",
  "BSBA HRM",
  "BS ENTREP",
  "BSEd SCIENCE",
  "BECEd",
  "BEEd",
  "BTLEd ICT",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const concernTypeMeta: Record<
  StudentConcern["type"],
  { icon: string; badgeClass: string }
> = {
  Complaint: { icon: "⚠️", badgeClass: "bg-destructive/10 text-destructive" },
  Question: { icon: "❓", badgeClass: "bg-blue-100 text-blue-700" },
  Suggestion: { icon: "💡", badgeClass: "bg-secondary/40 text-secondary-foreground" },
};

function StudentPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search & filter state
  const [concernSearch, setConcernSearch] = useState("");
  const [concernStatus, setConcernStatus] = useState("All");
  const [announcementSearch, setAnnouncementSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await checkStudentSession();
        if (!cancelled && data.authenticated && data.student) {
          setStudent(data.student);
        }
      } catch {
        // not authenticated — show login form
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    data: concerns = [],
    isLoading: concernsLoading,
    refetch: refetchConcerns,
  } = useQuery({
    queryKey: ["student-concerns"],
    queryFn: fetchStudentConcerns,
    enabled: !!student,
  });

  const {
    data: announcements = [],
    isLoading: announcementsLoading,
  } = useQuery({
    queryKey: ["student-announcements"],
    queryFn: fetchStudentAnnouncements,
    enabled: !!student,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage(null);
    setSubmitting(true);

    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    try {
      if (mode === "login") {
        const studentNumber = String(fd.get("studentNumber") ?? "").trim();
        const password = String(fd.get("password") ?? "");
        if (!studentNumber || !password) {
          setErrorMessage("Student number and password are required.");
          setSubmitting(false);
          return;
        }
        const data = await studentLogin(studentNumber, password);
        setStudent(data.student);
        toast.success("Welcome back!", {
          description: `Signed in as ${data.student.first_name} ${data.student.last_name}.`,
        });
      } else {
        const payload: StudentRegisterPayload = {
          studentNumber: String(fd.get("studentNumber") ?? "").trim(),
          last: String(fd.get("last") ?? "").trim(),
          first: String(fd.get("first") ?? "").trim(),
          middle: String(fd.get("middle") ?? "").trim() || undefined,
          section: String(fd.get("section") ?? "").trim(),
          institute: String(fd.get("institute") ?? "").trim(),
          program: String(fd.get("program") ?? "").trim(),
          password: String(fd.get("password") ?? ""),
        };
        const required = ["studentNumber", "last", "first", "section", "institute", "program", "password"] as const;
        const missing = required.filter((k) => !payload[k]);
        if (missing.length) {
          setErrorMessage(`Please fill out: ${missing.join(", ")}.`);
          setSubmitting(false);
          return;
        }
        if (!/^\d{2}-\d{5}$/.test(payload.studentNumber)) {
          setErrorMessage("Student number must match format YY-NNNNN (e.g., 24-00123).");
          setSubmitting(false);
          return;
        }
        const data = await studentRegister(payload);
        setStudent(data.student);
        toast.success("Account created!", {
          description: `Welcome, ${data.student.first_name}!`,
        });
      }
      form.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(message);
      toast.error(mode === "login" ? "Login failed" : "Registration failed", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await studentLogout();
    setStudent(null);
    toast.success("Signed out.", { description: "You have been logged out of your account." });
  };

  const label = "block text-sm font-medium text-foreground mb-1";
  const input =
    "w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  // Loading session
  if (loadingSession) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-card border rounded-lg shadow-sm p-8 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Auth form (login / register)
  if (!student) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Login or create an account to view your concerns and announcements.
          </p>
        </header>

        <div className="mb-6 flex rounded-md border bg-card p-1 w-fit">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErrorMessage(null);
              }}
              className={
                "px-4 py-2 rounded-md text-sm font-medium transition-colors " +
                (mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m === "login" ? "Login" : "Create Account"}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border rounded-lg shadow-sm p-6 grid gap-5">
          <div>
            <label className={label}>
              Student Number <span className="text-destructive">*</span>
            </label>
            <input
              required
              name="studentNumber"
              className={input}
              placeholder="e.g. 24-00123"
              maxLength={8}
            />
          </div>

          {mode === "register" && (
            <>
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={label}>
                    Last name <span className="text-destructive">*</span>
                  </label>
                  <input required name="last" className={input} maxLength={120} />
                </div>
                <div>
                  <label className={label}>
                    First name <span className="text-destructive">*</span>
                  </label>
                  <input required name="first" className={input} maxLength={120} />
                </div>
                <div>
                  <label className={label}>Middle name</label>
                  <input name="middle" className={input} maxLength={120} />
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Year & Section</label>
                  <input required name="section" className={input} placeholder="e.g. 4-A" maxLength={120} />
                </div>
                <div>
                  <label className={label}>Institute</label>
                  <select required name="institute" className={input} defaultValue="">
                    <option value="" disabled>
                      Select institute
                    </option>
                    {institutes.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Program</label>
                <select required name="program" className={input} defaultValue="">
                  <option value="" disabled>
                    Select program
                  </option>
                  {programs.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className={label}>
              Password <span className="text-destructive">*</span>
            </label>
            <input
              required
              type="password"
              name="password"
              className={input}
              placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
              minLength={mode === "register" ? 6 : undefined}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-semibold hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </div>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Demo account: <code className="bg-muted px-1.5 py-0.5 rounded">24-00123</code> /{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded">student123</code>
          </p>
        )}
      </div>
    );
  }

  // Filtered lists
  const statusOptions = ["All", "Pending", "Read", "Resolved"];
  const filteredConcerns = concerns.filter((c) => {
    const matchesSearch =
      concernSearch.trim() === "" ||
      c.type.toLowerCase().includes(concernSearch.toLowerCase()) ||
      c.message.toLowerCase().includes(concernSearch.toLowerCase());
    const matchesStatus = concernStatus === "All" || c.status === concernStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredAnnouncements = announcements.filter((a) => {
    return (
      announcementSearch.trim() === "" ||
      a.title.toLowerCase().includes(announcementSearch.toLowerCase()) ||
      a.content.toLowerCase().includes(announcementSearch.toLowerCase())
    );
  });

  // Dashboard
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
<header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <GreetingHeader student={student} />
        <button
          onClick={handleLogout}
          className="bg-card border px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Logout
        </button>
      </header>

      {/* My Profile */}
      <section className="mb-8">
        <div className="bg-card border rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0">
              {student.first_name.charAt(0)}
              {student.last_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">My Profile</h2>
              <p className="text-sm text-muted-foreground">
                Keep your account information up to date.
              </p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Full Name</dt>
              <dd className="text-sm font-medium text-foreground">
                {student.last_name}, {student.first_name}{" "}
                {student.middle_name ? `${student.middle_name}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Student Number</dt>
              <dd className="text-sm font-medium text-foreground">{student.student_number}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Year & Section</dt>
              <dd className="text-sm font-medium text-foreground">{student.section}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Program</dt>
              <dd className="text-sm font-medium text-foreground">{student.program}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Institute</dt>
              <dd className="text-sm font-medium text-foreground">{student.institute}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* My Concerns */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">My Concerns</h2>
            <button
              onClick={() => refetchConcerns()}
              className="text-primary text-sm font-medium hover:underline"
            >
              Refresh
            </button>
          </div>

          {/* Search & filter controls */}
          <div className="mb-4 grid gap-3">
<input
              type="search"
              value={concernSearch}
              onChange={(e) => setConcernSearch(e.target.value)}
              className={input}
              placeholder="Search concerns..."
              aria-label="Search concerns"
            />
            <select
              value={concernStatus}
              onChange={(e) => setConcernStatus(e.target.value)}
              className={input}
              aria-label="Filter by concern status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>

          {concernsLoading ? (
            <div className="bg-card border rounded-lg p-5 animate-pulse space-y-3">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
) : filteredConcerns.length === 0 ? (
            <EmptyState
              icon="concern"
              title={concerns.length === 0 ? "No concerns yet" : "No matching concerns"}
              description={
                concerns.length === 0
                  ? "Your submitted concerns will appear here with their status."
                  : "Try adjusting your search or status filter."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredConcerns.map((c) => (
                <article key={c.id} className="bg-card border rounded-lg p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{c.created_at}</span>
                    <span
                      className={
                        "text-xs font-semibold px-2 py-0.5 rounded-full " +
                        (c.status === "Resolved"
                          ? "bg-secondary text-secondary-foreground"
                          : c.status === "Read"
                            ? "bg-primary text-primary-foreground"
                            : "bg-destructive text-white")
                      }
                    >
                      {c.status}
                    </span>
</div>
                  <span
                    className={
                      "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full " +
                      concernTypeMeta[c.type].badgeClass
                    }
                  >
                    <span aria-hidden="true">{concernTypeMeta[c.type].icon}</span>
                    {c.type}
                  </span>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{c.message}</p>
                  {c.response && (
                    <div className="mt-3 rounded-md bg-muted/40 border px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">Response: </span>
                      <span className="text-muted-foreground">{c.response}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Relevant Announcements */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Announcements</h2>

          {/* Search controls */}
          <div className="mb-4">
<input
              type="search"
              value={announcementSearch}
              onChange={(e) => setAnnouncementSearch(e.target.value)}
              className={input}
              placeholder="Search announcements..."
              aria-label="Search announcements"
            />
          </div>

          {announcementsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((s) => (
                <div key={s} className="bg-card border rounded-lg p-5 animate-pulse space-y-2">
                  <div className="h-3 w-1/3 bg-muted rounded" />
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <EmptyState
              icon="announcement"
              title={announcements.length === 0 ? "No announcements" : "No matching announcements"}
              description={
                announcements.length === 0
                  ? "Check back later for official updates."
                  : "Try a different search term."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.map((a) => (
                <article key={a.id} className="bg-card border rounded-lg p-5 shadow-sm">
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
                  <h3 className="font-semibold text-foreground">{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">
                    {a.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
