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
  deleteAnnouncement,
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

// GET /admin/concerns — list all submitted concerns (with pagination)
router.get("/concerns", requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const result = await getAllConcerns(page, limit);
    res.json(result);
  } catch (err) {
    console.error("[Admin] Failed to fetch concerns:", err);
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

export default router;

