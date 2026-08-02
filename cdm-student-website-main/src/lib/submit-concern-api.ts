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
  consent: boolean;
};

export type SubmitConcernResult = {
  message: string;
  id: number;
  status: string;
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

export async function submitConcern(payload: SubmitConcernPayload): Promise<SubmitConcernResult> {
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

  return res.json() as Promise<SubmitConcernResult>;
}
