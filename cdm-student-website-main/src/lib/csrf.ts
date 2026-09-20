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

// Production uses the `__Host-` prefix (see backend/src/cookies.ts) so the
// cookie cannot be overwritten by an attacker-controlled sibling subdomain.
// Read both names so local dev and production behave the same.
export const CSRF_COOKIE_NAME_PREFIXED = "__Host-cdm_csrf_token";

export const CSRF_HEADER_NAME = "X-CSRF-Token";

// The backend echoes the active token in this response header (see
// backend/src/csrf.ts). It is the only way for a cross-origin SPA to learn the
// token, because document.cookie can only read cookies belonging to the
// frontend's own origin.
let cachedToken = "";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

// Returns the CSRF header value to attach to state-changing requests, or ""
// if no token is known yet.
export function getCsrfHeader(): Record<string, string> {
  const token =
    cachedToken || readCookie(CSRF_COOKIE_NAME_PREFIXED) || readCookie(CSRF_COOKIE_NAME);
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}

// Same as getCsrfHeader(), but makes sure a *server-valid* token is known by
// performing one GET to the backend first.
//
// Why the extra GET is not skipped even when a token is already present: the
// backend keeps issued tokens in memory, so after a server restart (or on a
// host that sleeps, like a free Render instance) a previously issued token is
// no longer valid. Re-bootstrapping lets the server hand back a token it
// actually knows about, which turns a permanent "403 Invalid or missing CSRF
// token" into a transparent retry.
//
// `endpoint` is any full URL belonging to the backend; only its origin is used.
export async function getCsrfHeaderAsync(endpoint: string): Promise<Record<string, string>> {
  try {
    const origin = new URL(endpoint).origin;
    const res = await fetch(`${origin}/`, {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
    });

    // Cross-origin path (Vercel -> Render): read the exposed response header.
    const headerToken = res.headers.get(CSRF_HEADER_NAME);
    if (headerToken) cachedToken = headerToken;

    // Same-origin path (local dev): the readable cookie is available directly.
    if (!cachedToken) {
      const cookieToken = readCookie(CSRF_COOKIE_NAME_PREFIXED) || readCookie(CSRF_COOKIE_NAME);
      if (cookieToken) cachedToken = cookieToken;
    }
  } catch {
    // Ignore bootstrap failures — the real request will surface any error.
  }

  return getCsrfHeader();
}
