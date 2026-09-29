import { getCsrfHeaderAsync } from "./csrf";
import { SUBMIT_CONCERN_ENDPOINT, BackendNotConfiguredError } from "./api-config";

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
  // Anti-bot fields (mirrored in backend/src/validation.ts):
  //  - `website` is a hidden honeypot input that humans never fill in.
  //  - `formOpenedAt` is the ms timestamp when the form was rendered, so the
  //    server can reject submissions that arrive implausibly fast.
  // Both are optional, so the API keeps working if they are omitted.
  website?: string;
  formOpenedAt?: number;
};

export type SubmitConcernResult = {
  message: string;
  id: number;
  status: string;
};

// "" when this build has no usable backend URL (see api-config.ts).
export const submitConcernEndpoint = SUBMIT_CONCERN_ENDPOINT;

export async function submitConcern(payload: SubmitConcernPayload): Promise<SubmitConcernResult> {
  const endpoint = SUBMIT_CONCERN_ENDPOINT;

  // Fail with an actionable message instead of a bare `TypeError: Failed to
  // fetch` against a localhost URL the visitor's browser cannot resolve.
  if (!endpoint) throw new BackendNotConfiguredError("submitting a concern");

  const res = await fetch(endpoint, {
    method: "POST",
    // Send cookies (CSRF + any session) on this cross-origin request.
    credentials: "include",
    headers: {
      "content-type": "application/json",
      // Attach the CSRF token for state-changing requests (double-submit).
      // Bootstraps the token cookie first if this is the first API call.
      ...(await getCsrfHeaderAsync(endpoint)),
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
