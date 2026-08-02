import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// Admin PIN comes from env (default for local development).
const ADMIN_PIN = process.env.ADMIN_PIN ?? "admin123";
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MS ?? String(8 * 60 * 60 * 1000), 10); // 8h

// In-memory session store with expiry. Tokens are invalidated on server restart.
const sessions = new Map<string, number>(); // token -> expiresAt

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

export function createSession(): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

// Lazy cleanup of expired sessions.
function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(token);
  }
}

export function isAuthenticated(token: string): boolean {
  if (!token) return false;
  cleanupExpired();
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  // Sliding expiration: refresh the session TTL on use.
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return true;
}

export const COOKIE_NAME = "cdm_admin_token";

// Extract the admin token from the Authorization header or the session cookie.
export function extractToken(req: Request): string {
  const header = req.headers.authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();

  const cookieHeader = req.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return "";
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

