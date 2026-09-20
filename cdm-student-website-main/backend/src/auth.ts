import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { cookieName, readableCookieNames, readCookie } from "./cookies.js";

// Admin PIN comes from env. Fail closed if it is not set — never fall back to
// a hardcoded default, which would be a critical security hole in production.
const ADMIN_PIN = process.env.ADMIN_PIN ?? "";
if (!ADMIN_PIN) {
  console.error("[Auth] FATAL: ADMIN_PIN environment variable is not set. Refusing to start.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && ADMIN_PIN.length < 16) {
  // This single shared secret guards every student concern in the system, so it
  // must not be guessable. Generate one with:
  //   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  console.warn(
    "[Auth] WARNING: ADMIN_PIN is shorter than 16 characters — use a long random value in production.",
  );
}

/** Parse a positive integer env var, falling back when unset/invalid. */
export function positiveIntEnv(raw: string | undefined, fallback: number): number {
  const parsed = parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ── Session lifetime ───────────────────────────────────────────────
// TWO limits apply: a sliding idle timeout (SESSION_TTL_MS) and an absolute
// hard cap (SESSION_ABSOLUTE_MAX_MS) that a session can never outlive no matter
// how active the user stays. Defaults: 2h idle, 12h absolute.
export const SESSION_IDLE_TTL_MS = positiveIntEnv(process.env.SESSION_TTL_MS, 2 * 60 * 60 * 1000);
const SESSION_ABSOLUTE_MAX_MS = positiveIntEnv(
  process.env.SESSION_ABSOLUTE_MAX_MS,
  12 * 60 * 60 * 1000,
);

// At most this many admin sessions may exist at once: logging in from a new
// browser eventually retires the oldest session instead of accumulating tokens.
const MAX_CONCURRENT_SESSIONS = 10;

// In-memory session store with expiry. Tokens are invalidated on server restart.
interface AdminSession {
  expiresAt: number;
  issuedAt: number;
}
const sessions = new Map<string, AdminSession>(); // token -> session

// Constant-time comparison of two strings by comparing SHA-256 digests.
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function verifyPin(pin: string): boolean {
  if (typeof pin !== "string") return false;
  return safeEqual(pin, ADMIN_PIN);
}

// Lazy cleanup of expired sessions.
function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

export function createSession(): string {
  cleanupExpired();

  // Retire the oldest sessions once the cap is reached (a Map preserves
  // insertion order, so the first key is the oldest).
  while (sessions.size >= MAX_CONCURRENT_SESSIONS) {
    const oldest = sessions.keys().next();
    if (oldest.done) break;
    sessions.delete(oldest.value);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(token, { expiresAt: now + SESSION_IDLE_TTL_MS, issuedAt: now });
  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function isAuthenticated(token: string): boolean {
  if (!token) return false;
  cleanupExpired();
  const session = sessions.get(token);
  if (!session) return false;

  const now = Date.now();
  if (session.expiresAt <= now) {
    sessions.delete(token);
    return false;
  }
  // Absolute lifetime cap — a session can never be stretched forever.
  if (now - session.issuedAt > SESSION_ABSOLUTE_MAX_MS) {
    sessions.delete(token);
    return false;
  }

  // Sliding idle expiration, never past the absolute cap.
  sessions.set(token, {
    issuedAt: session.issuedAt,
    expiresAt: Math.min(now + SESSION_IDLE_TTL_MS, session.issuedAt + SESSION_ABSOLUTE_MAX_MS),
  });
  return true;
}

/** Base name of the admin session cookie ("cdm_admin_token"). */
export const ADMIN_COOKIE_BASE = "cdm_admin_token";

// Cookie name to SET. In production this is `__Host-cdm_admin_token`.
export const COOKIE_NAME = cookieName(ADMIN_COOKIE_BASE);

// Names to read/clear: the prefixed one plus the pre-rollout legacy name, so a
// session issued before this change keeps working instead of silently logging
// the admin out.
export const ADMIN_COOKIE_NAMES = readableCookieNames(ADMIN_COOKIE_BASE);

// Extract the admin token from the Authorization header or the session cookie.
//
// The Authorization header exists for CLI/cURL testing only; the browser SPA
// relies exclusively on the httpOnly cookie so that an XSS payload cannot read
// a long-lived token out of JavaScript.
export function extractToken(req: Request): string {
  const header = req.headers.authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();

  return readCookie(req, ADMIN_COOKIE_NAMES);
}

// Express middleware that protects admin-only routes.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token || !isAuthenticated(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as Request & { adminToken?: string }).adminToken = token;
  next();
}
