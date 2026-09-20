// Retention helper (Data Privacy Act, RA 10173).
//
// Student concerns contain personal information (name, student number, section,
// institute, program, free-text message). They should not be kept forever.
// This deletes concerns that are marked "Resolved" and are older than the
// retention window, and writes an audit entry recording the purge.
//
// Deliberately NOT scheduled inside the server: an administrator runs it (or a
// Render Cron Job runs it) so records are never deleted silently.
//
// Usage (from backend/):
//   npm run build
//   CONCERN_RETENTION_DAYS=180 npm run purge     # deletes resolved concerns >180 days old
//   DRY_RUN=1 CONCERN_RETENTION_DAYS=180 npm run purge   # report only
//
// Pending/Read concerns are never touched — they still need action.

const retentionDays = parseInt(process.env.CONCERN_RETENTION_DAYS ?? "180", 10);
if (!Number.isFinite(retentionDays) || retentionDays < 1) {
  console.error("[Purge] CONCERN_RETENTION_DAYS must be a positive number of days.");
  process.exit(1);
}

const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

let purgeResolvedConcernsOlderThan;
try {
  ({ purgeResolvedConcernsOlderThan } = await import("../dist/database.js"));
} catch (err) {
  console.error("[Purge] Could not load ../dist/database.js — run `npm run build` first.");
  console.error(String(err));
  process.exit(1);
}

if (dryRun) {
  // Counting only: a dry run must never delete anything.
  const { getDatabase } = await import("../dist/database.js");
  const db = await getDatabase();
  const result = db.exec(
    `SELECT COUNT(*) FROM concerns
     WHERE status = 'Resolved'
       AND COALESCE(created_at, datetime('now')) <= datetime('now', ?)`,
    [`-${retentionDays} days`],
  );
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  console.log(
    `[Purge] DRY RUN: ${count} resolved concern(s) older than ${retentionDays} days would be deleted.`,
  );
  process.exit(0);
}

const removed = await purgeResolvedConcernsOlderThan(retentionDays);
console.log(
  `[Purge] Deleted ${removed} resolved concern(s) older than ${retentionDays} days.`,
);
