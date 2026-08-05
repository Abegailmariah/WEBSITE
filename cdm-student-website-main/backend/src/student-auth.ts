import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const SESSION_TTL_MS = parseInt(process.env.STUDENT_SESSION_TTL_MS ?? String(12 * 60 * 60 * 1000), 10); // 12h

// In-memory session store. Tokens are invalidated on server restart.
const sessions = new Map<string, { studentId: number; expiresAt: number }>();

// ── Account lockout (brute-force protection) ───────────────────────
const MAX_FAILED_ATTEMPTS = parseInt(process.env.STUDENT_MAX_FAILED ?? "5", 10);
const LOCKOUT_MS = parseInt(process.env.STUDENT_LOCKOUT_MS ?? String(15 * 60 * 1000), 10); // 15 min
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();

export function isStudentLocked(studentNumber: string): boolean {
  const entry = failedAttempts.get(studentNumber);
  if (!entry) return false;
  if (entry.lockUntil > Date.now()) return true;
  // Lock expired — clear it.
  failedAttempts.delete(studentNumber);
  return false;
}

export function recordFailedAttempt(studentNumber: string): void {
  const entry = failedAttempts.get(studentNumber) ?? { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0; // reset count once locked
  }
  failedAttempts.set(studentNumber, entry);
}

export function clearFailedAttempts(studentNumber: string): void {
  failedAttempts.delete(studentNumber);
}

export function getLockoutRemaining(studentNumber: string): number {
  const entry = failedAttempts.get(studentNumber);
  if (!entry) return 0;
  return Math.max(0, entry.lockUntil - Date.now());
}

// ── Password hashing (scrypt) ──────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Session management ─────────────────────────────────────────────

export function createStudentSession(studentId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { studentId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function destroyStudentSession(token: string): void {
  sessions.delete(token);
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

export function getStudentIdFromToken(token: string): number | null {
  if (!token) return null;
  cleanupExpired();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  // Sliding expiration
  sessions.set(token, { ...session, expiresAt: Date.now() + SESSION_TTL_MS });
  return session.studentId;
}

export const STUDENT_COOKIE_NAME = "cdm_student_token";

export function extractStudentToken(req: Request): string {
  const header = req.headers.authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();

  const cookieHeader = req.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === STUDENT_COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return "";
}

// Express middleware that requires a valid student session.
export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  const token = extractStudentToken(req);
  const studentId = getStudentIdFromToken(token);

  if (!studentId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as Request & { studentToken?: string; studentId?: number }).studentToken = token;
  (req as Request & { studentToken?: string; studentId?: number }).studentId = studentId;
  next();
}
