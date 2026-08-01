import { Router, type Request, type Response } from "express";
import { getAllAnnouncements, createAnnouncement } from "../database.js";

const router = Router();

// GET /announcements — Fetch all announcements
router.get("/", async (_req: Request, res: Response) => {
  try {
    const announcements = await getAllAnnouncements();
    res.json(announcements);
  } catch (err) {
    console.error("[Announcements] Failed to fetch:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /announcements — Create a new announcement
router.post("/", async (req: Request, res: Response) => {
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
    res.status(201).json(announcement);
  } catch (err) {
    console.error("[Announcements] Failed to create:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
