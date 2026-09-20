// MUST be the very first import so the .env file is loaded before any other
// module (e.g. auth.ts) reads process.env at load time.
import "./load-env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import announcementsRouter from "./routes/announcements.js";
import concernsRouter from "./routes/concerns.js";
import adminRouter from "./routes/admin.js";
import { getStats } from "./database.js";
import { csrfCookieBootstrap, requireCsrf } from "./csrf.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "8000", 10);

// ── Proxy awareness ────────────────────────────────────────────────
// Render (and Vercel) terminate TLS in front of the app, so req.ip and the
// protocol come from the X-Forwarded-* headers. Without this, EVERY client
// behind the proxy shares one IP address: the rate limiters below would count
// all visitors as a single client (one attacker could then lock out real
// admins and the whole campus at once), and audit entries would record the
// proxy instead of the actor. `1` = trust exactly one hop.
app.set("trust proxy", 1);

// Helmet already removes it; being explicit documents the intent.
app.disable("x-powered-by");


// ── Security Headers (Helmet) ──────────────────────────────────────
app.use(helmet());

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
    // Allow the SPA to read the CSRF bootstrap header. Without this, a
    // cross-origin (Vercel -> Render) fetch can send/receive cookies but
    // JavaScript cannot read custom response headers, so the double-submit
    // token could never be obtained. See csrf.ts.
    exposedHeaders: ["X-CSRF-Token"],
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

// Broad abuse ceiling for the whole API. Deliberately generous — its job is to
// stop one client from saturating the free-tier instance, not to shape normal
// traffic (the dashboard makes a handful of requests per action).
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // 600 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// ── Middleware ──────────────────────────────────────────────────────
// Rate limiting runs before body parsing so a blocked request is rejected
// without allocating a JSON parser for it.
app.use(globalLimiter);
app.use(express.json({ limit: "16kb" }));

// Provide a CSRF cookie to every client and validate state-changing
// requests across all routes.
app.use(csrfCookieBootstrap);
app.use(requireCsrf);

// ── Health Check ───────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Area-Based Academic Information Dissemination System API",
    version: "2.0.0",
  });
});

// ── Health Check ───────────────────────────────────────────────────
// Liveness/readiness probe. Unlike "/" this actually touches the datastore, so
// a missing or corrupt SQLite file reports unhealthy instead of "ok".
app.get("/health", async (_req, res) => {
  try {
    const stats = await getStats();
    res.json({
      status: "ok",
      database: "ok",
      announcements: stats.announcements,
      concerns: stats.concerns,
    });
  } catch (err) {
    console.error("[Health] Database check failed:", err);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

// ── Routes ─────────────────────────────────────────────────────────
app.use("/announcements", announcementsRouter);
app.use("/submit-concern", concernSubmitLimiter, concernsRouter);
app.use("/admin/login", adminLoginLimiter);
app.use("/admin", adminMutationLimiter, adminRouter);

// NOTE: the /student/* router was removed deliberately. It had no frontend
// consumer (the student dashboard was dropped) yet stayed reachable, which meant
// public account creation, student-number enumeration and an extra data path
// for no benefit. See SECURITY.md before reintroducing it.

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

  // body-parser rejections (malformed JSON, payload over the 16kb limit) are
  // CLIENT errors. Reporting them as 500 both misleads the caller and floods the
  // logs with stack traces from hostile or broken input.
  const status = (err as Error & { status?: number; statusCode?: number }).status ??
    (err as Error & { statusCode?: number }).statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 413 ? "Payload too large" : "Bad request" });
    return;
  }

  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     Area-Based Info Dissemination — API Server     ║
║──────────────────────────────────────────────║
║  Listening on :${String(PORT).padEnd(35)}║
║  Announcements : ${`http://localhost:${PORT}/announcements`.padEnd(32)}║
║  Submit Concern: ${`http://localhost:${PORT}/submit-concern`.padEnd(28)}║
║  Admin          : ${`http://localhost:${PORT}/admin`.padEnd(31)}║
╚══════════════════════════════════════════════╝
  `);
});
