import { Router, type Request, type Response } from "express";
import {
  verifyPin,
  createSession,
  destroySession,
  requireAuth,
} from "../auth.js";
import {
  getAllConcerns,
  updateConcernStatus,
  deleteConcern,
  deleteAnnouncement,
  updateAnnouncement,
  getStats,
} from "../database.js";

const router = Router();

// POST /admin/login — verify PIN and return a session token
router.post("/login", (req: Request, res: Response) => {
  const { pin } = req.body ?? {};

  if (typeof pin !== "string" || !verifyPin(pin)) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const token = createSession();
  res.json({ token });
});

// POST /admin/logout — invalidate the current session token
router.post("/logout", requireAuth, (req: Request, res: Response) => {
  const { adminToken } = req as Request & { adminToken?: string };
  if (adminToken) destroySession(adminToken);
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

// DELETE /admin/concerns/:id — delete a concern
router.delete("/concerns/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid concern id" });
      return;
    }

    await deleteConcern(id);
    res.json({ ok: true, id });
  } catch (err) {
    console.error("[Admin] Failed to delete concern:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/concerns/:id — update a concern's status
router.patch("/concerns/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid concern id" });
      return;
    }
    if (!status || !["Pending", "Read", "Resolved"].includes(status)) {
      res.status(400).json({ error: "status must be 'Pending', 'Read', or 'Resolved'" });
      return;
    }

    const concern = await updateConcernStatus(id, status);
    if (!concern) {
      res.status(404).json({ error: "Concern not found" });
      return;
    }

    res.json(concern);
  } catch (err) {
    console.error("[Admin] Failed to update concern:", err);
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

    res.json(announcement);
  } catch (err) {
    console.error("[Admin] Failed to update announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

