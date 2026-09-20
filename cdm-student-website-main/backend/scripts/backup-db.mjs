// Database backup helper.
//
// The free Render plan has an EPHEMERAL filesystem: cdm_portal.db is wiped on
// every restart/redeploy, taking every announcement and student concern with
// it. This copies the SQLite file to timestamped snapshots so a scheduled job
// (Render Cron Job, Task Scheduler, or a manual run before a demo) keeps an
// off-instance copy.
//
// Usage (from backend/):
//   npm run build            # creates dist/
//   npm run backup           # writes backups/cdm_portal-<timestamp>.db
//   DB_PATH=/var/data/cdm_portal.db BACKUP_DIR=/var/data/backups npm run backup
//
// Restore = stop the API, copy the snapshot over DB_PATH, start the API.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "..");

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(backendRoot, "cdm_portal.db");
const backupDir = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(backendRoot, "backups");

// How many snapshots to keep (oldest are pruned) so the disk cannot fill up.
const KEEP = parseInt(process.env.BACKUP_KEEP ?? "14", 10) || 14;

if (!fs.existsSync(dbPath)) {
  console.error(`[Backup] No database found at ${dbPath} — nothing to back up.`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `cdm_portal-${stamp}.db`);
fs.copyFileSync(dbPath, target);

const sizeKb = (fs.statSync(target).size / 1024).toFixed(1);
console.log(`[Backup] Saved ${target} (${sizeKb} KB)`);

const snapshots = fs
  .readdirSync(backupDir)
  .filter((f) => f.startsWith("cdm_portal-") && f.endsWith(".db"))
  .sort();

for (const stale of snapshots.slice(0, Math.max(0, snapshots.length - KEEP))) {
  fs.unlinkSync(path.join(backupDir, stale));
  console.log(`[Backup] Pruned old snapshot ${stale}`);
}

console.log(`[Backup] ${Math.min(snapshots.length, KEEP)} snapshot(s) retained in ${backupDir}`);
