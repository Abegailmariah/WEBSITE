import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import announcementsRouter from "./routes/announcements.js";
import concernsRouter from "./routes/concerns.js";
import adminRouter from "./routes/admin.js";
import trackRouter from "./routes/track.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "8000", 10);

// ── CORS ───────────────────────────────────────────────────────────
// Restrict to explicit origins, plus any localhost/127.0.0.1 origin for
// local development so the frontend works regardless of the dev port.
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, tests)
      if (!origin) return callback(null, true);
      // Dev-friendly: allow any localhost/127.0.0.1 origin on any port
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return callback(null, true);
        }
      } catch {
        // fall through to the allowlist check
      }
      if (CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ── Rate Limiters ─────────────────────────────────────────────────
const adminLoginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

const concernSubmitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 submissions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please slow down." },
});

const adminMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 mutations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin actions. Please slow down." },
});

// ── Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));

// ── Health Check ───────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "CdM Student Portal API", version: "2.0.0" });
});

// ── Routes ─────────────────────────────────────────────────────────
app.use("/announcements", announcementsRouter);
app.use("/submit-concern", concernSubmitLimiter, concernsRouter);
app.use("/track", trackRouter);
app.use("/admin/login", adminLoginLimiter);
app.use("/admin", adminMutationLimiter, adminRouter);

// ── 404 Handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global Error Handler ───────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // CORS errors have a specific message
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "Origin not allowed by CORS" });
    return;
  }
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
║  Track          : ${`http://localhost:${PORT}/track/:code`.padEnd(29)}║
║  Admin          : ${`http://localhost:${PORT}/admin`.padEnd(31)}║
╚══════════════════════════════════════════════╝
  `);
});

