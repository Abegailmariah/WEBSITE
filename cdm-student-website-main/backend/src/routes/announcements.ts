import { Router, type Request, type Response } from "express";
import { getAllAnnouncements, createAnnouncement, addAuditLog } from "../database.js";
import { requireAuth } from "../auth.js";

const router = Router();

// GET /announcements — Fetch all announcements (optionally paginated + sorted)
router.get("/", async (req: Request, res: Response) => {
  try {
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const sort = req.query.sort === "oldest" ? "oldest" : "newest";

    // Only paginate when both page & limit are provided
    if (pageParam !== undefined && limitParam !== undefined) {
      const page = parseInt(String(pageParam), 10) || 1;
      const limit = parseInt(String(limitParam), 10) || 10;
      const result = await getAllAnnouncements(page, limit, sort);
      res.json(result);
      return;
    }

    const announcements = await getAllAnnouncements(undefined, undefined, sort);
    res.json(announcements);
  } catch (err) {
    console.error("[Announcements] Failed to fetch:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /announcements — Create a new announcement (admin only)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, date, priority, content } = req.body;

    // Validation
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

    const announcement = await createAnnouncement({ title, date, priority, content });
    await addAuditLog("announcement.create", `Created announcement #${announcement.id} — ${title}`);
    res.status(201).json(announcement);
  } catch (err) {
    console.error("[Announcements] Failed to create:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

