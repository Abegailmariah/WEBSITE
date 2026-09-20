import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { extractToken, positiveIntEnv } from "./auth.js";
import { cookieName, readCookie } from "./cookies.js";

// ── CSRF Protection (stateless, signed double-submit) ───────────────
// A state-changing request must echo a server-signed token in the
// X-CSRF-Token header. The token is NOT something the server has to remember:
//
//   token = <nonce>.<issuedAtMs>.<HMAC-SHA256(secret, nonce.issuedAt.sessionToken)>
//
// Two properties matter:
//
//  1. Nobody can mint a token without the secret, so a valid token can only
//     come from this server, and only inside the last CSRF_TTL_MS.
//  2. The signature is bound to the caller's session cookie value (cross-
//     session replay defence). A token minted for an anonymous visitor — or
//     for an attacker's own session — will NOT validate on a request that
//     carries the admin's session cookie. Anonymous tokens (bound to "") are
//     still issued, because the public concern form needs one.
//
// This replaces the previous in-memory Map of tokens, which (a) lost every
// token on restart, (b) was shared between sessions rather than bound to one,
// and (c) would not have worked across multiple server instances. Verification
// is now pure computation: no storage, no eviction, no shared state.
//
// The cookie merely carries the token to the client. Same-site clients can read
// it with document.cookie; a cross-site SPA (Vercel -> Render) cannot, so the
// token is also echoed in the X-CSRF-Token response header, which is exposed to
// CORS clients through `exposedHeaders` in index.ts.

export const CSRF_COOKIE_BASE = "cdm_csrf_token";

// Cookie name to SET (prefixed with __Host- in production).
export const CSRF_COOKIE_NAME = cookieName(CSRF_COOKIE_BASE);

// Legacy bare name, still read so a client holding a pre-rollout cookie works.
export const LEGACY_CSRF_COOKIE_NAME = CSRF_COOKIE_BASE;

export const CSRF_HEADER_NAME = "x-csrf-token";

const CSRF_TTL_MS = positiveIntEnv(process.env.CSRF_TTL_MS, 8 * 60 * 60 * 1000); // 8h

// Prefer a dedicated secret; fall back to ADMIN_PIN (already required and never
// committed) so no new mandatory env var is introduced. Rotating the PIN
// invalidates outstanding tokens, which is transparent to the SPA because
// src/lib/csrf.ts re-bootstraps a token before every state-changing request.
const CSRF_SECRET =
  process.env.CSRF_SECRET || process.env.ADMIN_PIN || crypto.randomBytes(32).toString("hex");

function sign(data: string): string {
  return crypto.createHmac("sha256", CSRF_SECRET).update(data).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Mint a token bound to `sessionToken` ("" for an anonymous visitor).
 * Re-issuing is cheap, which is why the SPA can simply bootstrap a fresh token
 * before each state-changing request.
 */
export function createCsrfToken(sessionToken: string = ""): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  const payload = `${nonce}.${issuedAt}`;
  return `${payload}.${sign(`${payload}.${sessionToken}`)}`;
}

/** Verify a token's signature, age, and session binding. */
export function isValidCsrfToken(token: string, sessionToken: string = ""): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [nonce, issuedAtRaw, signature] = parts;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || !nonce || !signature) return false;

  const age = Date.now() - issuedAt;
  if (age < 0 || age > CSRF_TTL_MS) return false;

  return timingSafeEqualHex(sign(`${nonce}.${issuedAtRaw}.${sessionToken}`), signature);
}

/**
 * The session value a CSRF token is bound to for THIS request.
 *
 * Only the admin session cookie is bound today. If a second authenticated
 * surface is added later (e.g. student accounts), include its cookie value here
 * so tokens issued on one surface cannot be replayed on the other.
 */
function sessionTokenFor(req: Request): string {
  return extractToken(req);
}

// Middleware: make sure the client holds a token that is valid for its current
// session, and expose it via cookie (same-site) and header (cross-site).
export function csrfCookieBootstrap(req: Request, res: Response, next: NextFunction): void {
  const sessionToken = sessionTokenFor(req);
  const presented = readCookie(req, [CSRF_COOKIE_NAME, LEGACY_CSRF_COOKIE_NAME]);

  // Re-issue whenever the presented cookie is missing, expired, or bound to a
  // different session than the one on this request.
  const token = isValidCsrfToken(presented, sessionToken)
    ? presented
    : createCsrfToken(sessionToken);

  if (token !== presented) {
    // The CSRF token is NOT a session secret — the session auth cookies stay
    // httpOnly. This one must be readable by JavaScript so a same-site SPA can
    // echo it back in the X-CSRF-Token header (double-submit pattern).
    // Cross-site (Vercel + separate API host) needs SameSite=None + Secure.
    const sameSiteNone = process.env.COOKIE_SAMESITE === "none";
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: sameSiteNone ? "none" : "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production" || sameSiteNone,
    });
  }

  // Always echo the token in a response header as well.
  //
  // Why: when the frontend and API live on DIFFERENT sites (Vercel + Render),
  // the browser scopes a cookie set by the API host to the API host only —
  // document.cookie on the frontend origin can never read it. Without this
  // header the SPA would have no way to learn the token and every
  // state-changing request would fail with 403.
  res.setHeader(CSRF_HEADER_NAME, token);

  next();
}

/**
 * Middleware: require a valid CSRF token header for state-changing methods.
 *
 * Only the HEADER is validated (not header-vs-cookie equality): the header is
 * the part an attacker cannot forge, because making a victim's browser attach a
 * custom header requires a CORS preflight that our origin allowlist rejects.
 * Comparing header to cookie as well would break the legitimate cross-site
 * flow, where the cookie is rotated after login while the client keeps using
 * the freshly bootstrapped header value.
 */
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME];
  if (
    typeof headerToken !== "string" ||
    !isValidCsrfToken(headerToken, sessionTokenFor(req))
  ) {
    res.status(403).json({ error: "Invalid or missing CSRF token" });
    return;
  }

  next();
}

