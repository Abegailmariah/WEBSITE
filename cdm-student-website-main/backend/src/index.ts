import express from "express";
import cors from "cors";
import announcementsRouter from "./routes/announcements.js";
import concernsRouter from "./routes/concerns.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "8000", 10);

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "16kb" }));

// ── Health Check ───────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "CdM Student Portal API", version: "1.0.0" });
});

// ── Routes ─────────────────────────────────────────────────────────
app.use("/announcements", announcementsRouter);
app.use("/submit-concern", concernsRouter);

// ── 404 Handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global Error Handler ───────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     CdM Student Portal — API Server         ║
║──────────────────────────────────────────────║
║  Listening on :${String(PORT).padEnd(35)}║
║  Announcements : ${`http://localhost:${PORT}/announcements`.padEnd(32)}║
║  Submit Concern: ${`http://localhost:${PORT}/submit-concern`.padEnd(28)}║
╚══════════════════════════════════════════════╝
  `);
});

