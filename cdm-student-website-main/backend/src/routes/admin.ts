import { Router, type Request, type Response } from "express";
import {
  verifyPin,
  createSession,
  destroySession,
  requireAuth,
  isAuthenticated,
  COOKIE_NAME,
  extractToken,
} from "../auth.js";
import {
  getAllConcerns,
  getAllConcernsRaw,
  updateConcernStatus,
  updateConcern,
  deleteConcern,
  deleteAnnouncement,
  updateAnnouncement,
  getStats,
  addAuditLog,
  getAuditLog,
} from "../database.js";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60 * 1000, // 8 hours, matches session TTL
};

// POST /admin/login — verify PIN, create a session token, and set an httpOnly cookie
router.post("/login", (req: Request, res: Response) => {
  const { pin } = req.body ?? {};

  if (typeof pin !== "string" || !verifyPin(pin)) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const token = createSession();
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  awaitAudit("admin.login", "Admin logged in");
  res.json({ token });
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
    awaitAudit("admin.logout", "Admin logged out");
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
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
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

const header = [
      "id", "last_name", "first_name", "middle_name",
      "student_number", "section", "institute", "program", "type",
      "status", "message", "response", "created_at",
    ].join(",");

    const rows = concerns.map((c) =>
      [
        c.id, c.last_name, c.first_name, c.middle_name,
        c.student_number, c.section, c.institute, c.program, c.type,
        c.status, c.message, c.response, c.created_at,
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = [header, ...rows].join("\r\n");
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
    awaitAudit("concern.delete", `Deleted concern #${id}`);
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

    awaitAudit("concern.update", `Updated concern #${id} → status ${status}`);
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
    awaitAudit("announcement.delete", `Deleted announcement #${id}`);
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

    const { title, date, priority, content } = req.body ?? {};

    const errors: string[] = [];
    if (!title || typeof title !== "string") errors.push("title is required");
    if (!date || typeof date !== "string") errors.push("date is required");
    if (!priority || !["Critical", "Normal"].includes(priority))
      errors.push("priority must be 'Critical' or 'Normal'");
    if (!content || typeof content !== "string") errors.push("content is required");

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const announcement = await updateAnnouncement(id, { title, date, priority, content });
    if (!announcement) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }

    awaitAudit("announcement.update", `Updated announcement #${id} — ${title}`);
    res.json(announcement);
  } catch (err) {
    console.error("[Admin] Failed to update announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: fire-and-forget audit logging so it never blocks the response.
function awaitAudit(action: string, detail?: string): void {
  void addAuditLog(action, detail);
}

export default router;

