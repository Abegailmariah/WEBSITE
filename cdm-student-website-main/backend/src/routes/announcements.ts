import { Router, type Request, type Response } from "express";
import { getAllAnnouncements, createAnnouncement } from "../database.js";
import { requireAuth } from "../auth.js";
import { audit } from "../audit.js";
import { announcementInputSchema, zodErrorMessages } from "../validation.js";

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
    // Same schema as PUT /admin/announcements/:id — one definition, so the two
    // write paths can never drift apart. Enforces type, length caps, the
    // priority whitelist, and a character whitelist for the BLE beacon area.
    const parsed = announcementInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ errors: zodErrorMessages(parsed.error) });
      return;
    }

    const announcement = await createAnnouncement(parsed.data);
    audit(
      req,
      "announcement.create",
      `Created announcement #${announcement.id} — ${parsed.data.title}`,
    );
    res.status(201).json(announcement);
  } catch (err) {
    console.error("[Announcements] Failed to create:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
