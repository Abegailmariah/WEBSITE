import { Router, type Request, type Response } from "express";
import {
  verifyPin,
  createSession,
  destroySession,
  requireAuth,
  isAuthenticated,
  COOKIE_NAME,
  ADMIN_COOKIE_NAMES,
  SESSION_IDLE_TTL_MS,
  extractToken,
  positiveIntEnv,
} from "../auth.js";
import { audit, clientIp } from "../audit.js";
import { announcementInputSchema, zodErrorMessages } from "../validation.js";

import {
  getAllConcerns,
  getAllConcernsRaw,
  updateConcernStatus,
  updateConcern,
  deleteConcern,
  deleteAnnouncement,
  updateAnnouncement,
  getStats,
  getAuditLog,
} from "../database.js";

const router = Router();

// Cross-site cookies (Vercel frontend + separate API host) require
// SameSite=None + Secure. Same-site/local dev uses Lax.
// COOKIE_SAMESITE=none + NODE_ENV=production on the backend host.
const COOKIE_SAMESITE: "none" | "lax" =
  process.env.COOKIE_SAMESITE === "none" ? "none" : "lax";
const COOKIE_SECURE = process.env.NODE_ENV === "production" || COOKIE_SAMESITE === "none";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: COOKIE_SAMESITE,
  path: "/",
  secure: COOKIE_SECURE,
  // Matches the sliding idle session TTL (see backend/src/auth.ts).
  maxAge: SESSION_IDLE_TTL_MS,
};

// ── Admin login brute-force lockout ─────────────────────────────────
// The per-IP rate limiter in index.ts slows an attacker down; this lockout
// stops them, mirroring the pattern already used for student logins
// (backend/src/student-auth.ts). Keyed by client IP because the admin PIN is a
// shared secret with no username to key on.
//
// Note: like every in-memory control here, the counters reset on restart and
// are per-instance. Put the API behind Cloudflare/WAF for edge-level limits.
const MAX_FAILED_ATTEMPTS = positiveIntEnv(process.env.ADMIN_MAX_FAILED, 5);
const LOCKOUT_MS = positiveIntEnv(process.env.ADMIN_LOCKOUT_MS, 15 * 60 * 1000);
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();

function lockoutRemainingMs(ip: string): number {
  const entry = failedAttempts.get(ip);
  if (!entry) return 0;
  // lockUntil === 0 means "still counting failures", NOT "lock expired" —
  // delete it here and the counter would reset on every attempt.
  if (entry.lockUntil === 0) return 0;
  if (entry.lockUntil > Date.now()) return entry.lockUntil - Date.now();
  // Lock expired: clear it so the next failure starts a fresh count.
  failedAttempts.delete(ip);
  return 0;
}

function recordFailedLogin(ip: string): void {
  const entry = failedAttempts.get(ip) ?? { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0; // reset the counter once locked
  }
  failedAttempts.set(ip, entry);
}


// POST /admin/login — verify PIN, create a session token, and set an httpOnly cookie
router.post("/login", (req: Request, res: Response) => {
  const ip = clientIp(req);
  const remaining = lockoutRemainingMs(ip);
  if (remaining > 0) {
    res.setHeader("Retry-After", String(Math.ceil(remaining / 1000)));
    res.status(429).json({
      error: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60000)} minute(s).`,
    });
    return;
  }

  const { pin } = req.body ?? {};

  if (typeof pin !== "string" || !verifyPin(pin)) {
    recordFailedLogin(ip);
    audit(req, "admin.login_failed", "Invalid PIN");
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const token = createSession();
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  audit(req, "admin.login", "Admin logged in");
  // The session token is deliberately NOT returned in the body: it lives only in
  // the httpOnly cookie so an XSS payload cannot exfiltrate it. The SPA never
  // needs the raw value (see src/lib/admin-api.ts -> checkAdminSession()).
  res.json({ ok: true });
});

// GET /admin/session — check whether the current cookie/session is valid
router.get("/session", (req: Request, res: Response) => {
  const token = extractToken(req);
  res.json({ authenticated: token ? isAuthenticated(token) : false });
});

// POST /admin/logout — invalidate the current session token
router.post("/logout", requireAuth, (req: Request, res: Response) => {
  const { adminToken } = req as Request & { adminToken?: string };
  if (adminToken) {
    destroySession(adminToken);
    audit(req, "admin.logout", "Admin logged out");
  }
  // Clear both the current (possibly __Host-) name and the pre-rollout legacy
  // name so no stale cookie survives a logout.
  for (const name of ADMIN_COOKIE_NAMES) {
    res.clearCookie(name, { path: "/" });
  }
  res.json({ ok: true });
});

// GET /admin/stats — dashboard summary counts
router.get("/stats", requireAuth, async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error("[Admin] Failed to fetch stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/concerns — list all submitted concerns (with pagination + optional search)
router.get("/concerns", requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const result = await getAllConcerns(page, limit, search);
    res.json(result);
  } catch (err) {
    console.error("[Admin] Failed to fetch concerns:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/concerns/export — download all concerns as CSV
router.get("/concerns/export", requireAuth, async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const concerns = await getAllConcernsRaw(search);

    const escapeCsv = (v: unknown): string => {
      let s = v === null || v === undefined ? "" : String(v);
      // Neutralize spreadsheet formula injection (OWASP): if a cell starts
      // with =, +, -, @, tab, or CR, prefix it with a single quote.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      if (/["\n,\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = [
      "id",
      "last_name",
      "first_name",
      "middle_name",
      "student_number",
      "section",
      "institute",
      "program",
      "type",
      "status",
      "message",
      "response",
      "created_at",
    ].join(",");

    const rows = concerns.map((c) =>
      [
        c.id,
        c.last_name,
        c.first_name,
        c.middle_name,
        c.student_number,
        c.section,
        c.institute,
        c.program,
        c.type,
        c.status,
        c.message,
        c.response,
        c.created_at,
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = [header, ...rows].join("\r\n");

    // A CSV export is the single biggest PII egress in the system, so it is
    // always recorded with actor + origin.
    audit(
      req,
      "concern.export",
      `Exported ${concerns.length} concern(s)${search ? ` (search: ${search})` : ""}`,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="concerns-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    console.error("[Admin] Failed to export concerns:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/concerns/:id — delete a concern
router.delete("/concerns/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid concern id" });
      return;
    }

    await deleteConcern(id);
    audit(req, "concern.delete", `Deleted concern #${id}`);
    res.json({ ok: true, id });
  } catch (err) {
    console.error("[Admin] Failed to delete concern:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/concerns/:id — update a concern's status and/or response
router.patch("/concerns/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, response } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid concern id" });
      return;
    }
    if (!status || !["Pending", "Read", "Resolved"].includes(status)) {
      res.status(400).json({ error: "status must be 'Pending', 'Read', or 'Resolved'" });
      return;
    }
    if (response !== undefined && typeof response !== "string") {
      res.status(400).json({ error: "response must be a string" });
      return;
    }
    if (typeof response === "string" && response.length > 2000) {
      res.status(400).json({ error: "response must be at most 2000 characters" });
      return;
    }

    const concern = await updateConcern(id, status, response);
    if (!concern) {
      res.status(404).json({ error: "Concern not found" });
      return;
    }

    audit(req, "concern.update", `Updated concern #${id} → status ${status}`);
    res.json(concern);
  } catch (err) {
    console.error("[Admin] Failed to update concern:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/audit — recent audit log entries
router.get("/audit", requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const logs = await getAuditLog(limit);
    res.json(logs);
  } catch (err) {
    console.error("[Admin] Failed to fetch audit log:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/announcements/:id — delete an announcement
router.delete("/announcements/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid announcement id" });
      return;
    }

    await deleteAnnouncement(id);
    audit(req, "announcement.delete", `Deleted announcement #${id}`);
    res.json({ ok: true, id });
  } catch (err) {
    console.error("[Admin] Failed to delete announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/announcements/:id — update an existing announcement
router.put("/announcements/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid announcement id" });
      return;
    }

    const parsed = announcementInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ errors: zodErrorMessages(parsed.error) });
      return;
    }

    const { title, date, priority, area, content } = parsed.data;

    const announcement = await updateAnnouncement(id, { title, date, priority, area, content });
    if (!announcement) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }

    audit(req, "announcement.update", `Updated announcement #${id} — ${title}`);
    res.json(announcement);
  } catch (err) {
    console.error("[Admin] Failed to update announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
