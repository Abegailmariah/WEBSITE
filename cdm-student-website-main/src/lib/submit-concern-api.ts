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

const DEFAULT_ENDPOINT = "http://localhost:8000/submit-concern";

export function getSubmitConcernEndpoint() {
  // Vite convention: import.meta.env.VITE_*
  // Keep it optional so the app can still run without configuration.
  return (
    (import.meta as any).env?.VITE_SUBMIT_CONCERN_ENDPOINT ?? DEFAULT_ENDPOINT
  );
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
    (error as any).status = res.status;
    throw error;
  }

  return res.json().catch(() => ({}));
}

