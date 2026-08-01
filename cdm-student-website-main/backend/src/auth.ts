import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// Admin PIN comes from env (default for local development).
const ADMIN_PIN = process.env.ADMIN_PIN ?? "admin123";

// Simple in-memory session store. Tokens are invalidated on server restart.
const sessions = new Set<string>();

export function verifyPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}

export function createSession(): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.add(token);
  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function isAuthenticated(token: string): boolean {
  return sessions.has(token);
}

// Express middleware that protects admin-only routes.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token || !isAuthenticated(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as Request & { adminToken?: string }).adminToken = token;
  next();
}

