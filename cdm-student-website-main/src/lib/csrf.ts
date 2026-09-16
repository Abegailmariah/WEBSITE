// CSRF token helper for the frontend.
//
// The backend issues the token in a *readable* cookie (httpOnly: false) named
// cdm_csrf_token via its csrfCookieBootstrap middleware, which runs on every
// request. State-changing requests must echo that same value back in the
// X-CSRF-Token header (double-submit pattern).
//
// The token is NOT a secret: the server keeps it in an in-memory map and
// validates the header against it. The cookie merely carries the token to the
// client so the SPA can echo it back — the session cookies themselves (admin
// and student) remain httpOnly.
//
// Since the backend only sets the cookie in response to a request, any page
// that changes state without first calling the API (e.g. /submit-concern) has
// to bootstrap it. getCsrfHeaderAsync() below does exactly that with one GET.

export const CSRF_COOKIE_NAME = "cdm_csrf_token";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

// Returns the CSRF header value to attach to state-changing requests, or ""
// if no token cookie is present.
export function getCsrfHeader(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE_NAME);
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}

// Same as getCsrfHeader(), but ensures the token cookie exists first by making a
// single GET to the backend when it is missing.
//
// The backend's csrfCookieBootstrap middleware sets cdm_csrf_token on ANY
// response, so a GET to the API origin is enough to bootstrap it. This matters
// for pages that mutate state without calling the API beforehand (such as
// /submit-concern), where the cookie would otherwise not exist yet and the
// request would be rejected with "Invalid or missing CSRF token".
//
// `endpoint` is any full URL belonging to the backend; only its origin is used.
export async function getCsrfHeaderAsync(endpoint: string): Promise<Record<string, string>> {
  const existing = getCsrfHeader();
  if (Object.keys(existing).length > 0) return existing;

  try {
    const origin = new URL(endpoint).origin;
    await fetch(`${origin}/`, {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
    });
  } catch {
    // Ignore bootstrap failures — the real request will surface any error.
  }

  return getCsrfHeader();
}
