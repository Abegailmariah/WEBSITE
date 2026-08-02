import { Router, type Request, type Response } from "express";
import { getConcernByTrackingCode } from "../database.js";

const router = Router();

// GET /track/:code — Public status lookup via tracking code
router.get("/:code", async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code ?? "").trim().toUpperCase();
    if (!code || !/^CDM-[A-Z2-9]{6}$/.test(code)) {
      res.status(400).json({ error: "Invalid tracking code format (expected CDM-XXXXXX)" });
      return;
    }

    const concern = await getConcernByTrackingCode(code);
    if (!concern) {
      res.status(404).json({ error: "No concern found with that tracking code" });
      return;
    }

    // Only expose non-sensitive data
    res.json({
      tracking_code: code,
      status: concern.status,
      response: concern.response ?? null,
      type: concern.type,
      created_at: concern.created_at,
    });
  } catch (err) {
    console.error("[Track] Failed to look up:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

