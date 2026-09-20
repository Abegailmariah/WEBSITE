// Central place for session/CSRF cookie names.
//
// In production the cookies carry the `__Host-` prefix. Browsers then require
// Secure + Path=/ + no Domain, which makes it impossible for an attacker who
// controls a sibling subdomain to overwrite ("toss") our session cookie — the
// classic cookie-tossing / session-fixation attack that SameSite alone does not
// stop. The prefix is only valid over HTTPS, so local http development falls
// back to the bare name.
import type { Request } from "express";

export const USE_HOST_PREFIX = process.env.NODE_ENV === "production";

/** Cookie name to SET: prefixed in production, bare otherwise. */
export function cookieName(base: string): string {
  return USE_HOST_PREFIX ? `__Host-${base}` : base;
}

/**
 * Every name we should READ or CLEAR, prefixed first.
 *
 * The legacy bare name is kept in the list so sessions issued before the
 * `__Host-` rollout (or a local dev cookie) are still recognized instead of
 * silently logging the admin out.
 */
export function readableCookieNames(base: string): string[] {
  return USE_HOST_PREFIX ? [`__Host-${base}`, base] : [base];
}

/** Pull a cookie value out of a raw Cookie header. Returns "" when absent. */
export function readCookie(req: Request, names: string[]): string {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name && names.includes(name)) return rest.join("=");
  }
  return "";
}
