import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// ── CSRF Protection ─────────────────────────────────────────────────
// A lightweight double-submit-style CSRF protection. A random token is
// generated per session and stored in a readable cookie. State-changing
// requests must echo that token back in a custom header (X-CSRF-Token),
// which the browser cannot forge cross-origin. This complements the
// SameSite=Lax cookie settings already in place.

export const CSRF_COOKIE_NAME = "cdm_csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

const tokens = new Map<string, number>(); // token -> expiresAt
const CSRF_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, expiresAt] of tokens) {
    if (expiresAt <= now) tokens.delete(token);
  }
}

export function createCsrfToken(): string {
  cleanupExpired();
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(token, Date.now() + CSRF_TTL_MS);
  return token;
}

export function isValidCsrfToken(token: string): boolean {
  if (!token) return false;
  cleanupExpired();
  const expiresAt = tokens.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function destroyCsrfToken(token: string): void {
  tokens.delete(token);
}

// Middleware: ensure a CSRF token exists for the session and is available
// to the client via a cookie. Safe to apply to all routes.
export function csrfCookieBootstrap(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

  let token = existing?.split("=").slice(1).join("=") ?? "";
  if (!token || !tokens.has(token)) {
    token = createCsrfToken();
    // The CSRF token is NOT a session secret — the session auth cookies remain
    // httpOnly. This cookie must be readable by JavaScript so the SPA can echo
    // it back in the X-CSRF-Token header (double-submit pattern).
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  next();
}

// Middleware: require a valid CSRF token header for state-changing methods.
// Only validates when the request is not a simple safe method (GET/HEAD/OPTIONS).
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME];
  if (typeof headerToken !== "string" || !isValidCsrfToken(headerToken)) {
    res.status(403).json({ error: "Invalid or missing CSRF token" });
    return;
  }

  next();
}
