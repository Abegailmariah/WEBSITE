// Audit-log helpers shared by every route.
//
// Audit entries capture WHO acted (implicitly, via the authenticated route) and
// FROM WHERE (ip + user agent), which is what makes the log useful during an
// incident review instead of just a list of successful actions.
import type { Request } from "express";
import { addAuditLog } from "./database.js";

/**
 * Best-effort client IP.
 *
 * Requires `app.set("trust proxy", 1)` (see index.ts) so Express resolves the
 * real client address from the Render/Vercel proxy chain. Never trust a raw
 * X-Forwarded-For header for authorization decisions — this value is recorded
 * for forensics, not for access control.
 */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "";
}

/** Fire-and-forget audit write so logging never blocks a response. */
export function audit(req: Request, action: string, detail?: string): void {
  const userAgent = String(req.headers["user-agent"] ?? "").slice(0, 200);
  void addAuditLog(action, detail, clientIp(req), userAgent).catch((err) => {
    console.error("[Audit] Failed to write entry:", action, err);
  });
}
