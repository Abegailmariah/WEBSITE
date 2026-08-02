export type SubmitConcernPayload = {
  last: string;
  first: string;
  middle?: string;
  studentNumber: string;
  section: string;
  institute: string;
  program: string;
  type: "Complaint" | "Question" | "Suggestion";
  message: string;
};

export type TrackedConcern = {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  student_number: string;
  section: string;
  institute: string;
  program: string;
  type: "Complaint" | "Question" | "Suggestion";
  message: string;
  status: "Pending" | "Read" | "Resolved";
  created_at?: string;
};

const DEFAULT_ENDPOINT = "http://localhost:8000/submit-concern";

export function getSubmitConcernEndpoint() {
  // Vite convention: import.meta.env.VITE_*
  // Keep it optional so the app can still run without configuration.
  const env = import.meta.env;
  const endpoint = env?.VITE_SUBMIT_CONCERN_ENDPOINT ?? DEFAULT_ENDPOINT;

  if (typeof window !== "undefined" && !env?.VITE_SUBMIT_CONCERN_ENDPOINT) {
    console.warn(
      "[CdM Portal] VITE_SUBMIT_CONCERN_ENDPOINT is not set. Using default:",
      DEFAULT_ENDPOINT,
      "\nCreate a .env file based on .env.example to configure.",
    );
  }

  return endpoint;
}

export async function submitConcern(payload: SubmitConcernPayload) {
  const endpoint = getSubmitConcernEndpoint();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let details = "";
    try {
      details = await res.text();
    } catch {
      // ignore
    }

    const error = new Error(
      `Submit concern failed: HTTP ${res.status}${details ? ` - ${details}` : ""}`,
    );
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  return res.json().catch(() => ({}));
}

// GET /submit-concern/:id — Track a single concern by reference ID
export async function trackConcern(id: number): Promise<TrackedConcern> {
  const endpoint = getSubmitConcernEndpoint();

  const res = await fetch(`${endpoint}/${id}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    let message = `Concern not found: HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<TrackedConcern>;
}

// GET /submit-concern/student/:studentNumber — List all concerns for a student number
export async function fetchMyConcerns(
  studentNumber: string,
): Promise<TrackedConcern[]> {
  const endpoint = getSubmitConcernEndpoint();

  const res = await fetch(`${endpoint}/student/${encodeURIComponent(studentNumber)}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    let message = `Failed to load concerns: HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { data: TrackedConcern[] };
  return data.data ?? [];
}
