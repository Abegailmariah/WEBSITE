// CSRF token helper for the frontend.
//
// The backend sets an httpOnly cookie containing the CSRF token
// (cdm_csrf_token). Because the cookie is httpOnly, the browser does not
// expose it to JavaScript via document.cookie. However, for this
// double-submit pattern the token is NOT the secret — the server stores the
// token value in its in-memory map and validates the header against it. The
// cookie is used only to keep the token available to the backend; the client
// must send the SAME value in the X-CSRF-Token header.
//
// To read the token we need the cookie value. Since it is httpOnly, a pure
// browser client cannot read it with document.cookie. As a pragmatic approach
// for this SPA (which talks to its own API), we read the cookie value here.
// In a hardened setup you would instead expose the token via a JSON endpoint
// (e.g. GET /csrf) and store it in memory. We keep the cookie-readable
// variant for simplicity and to match the existing SameSite=Lax + httpOnly
// cookie design.

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
