import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./student-auth.js";
import type { Announcement, Concern, AuditLog, Student } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "cdm_portal.db");

let db: SqlJsDatabase | null = null;

// ── Database lifecycle ─────────────────────────────────────────────

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB file if it exists, otherwise create a new in-memory DB
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");
  initializeSchema(db);
  runMigrations(db);
  seedIfEmpty(db);
  seedStudentsIfEmpty(db);
  saveDatabase(db);

  return db;
}

// Persist the in-memory SQLite database to disk.
// On Windows, fs.renameSync over an open file throws EPERM, so we
// fall back to a direct writeFileSync when the atomic rename fails.
function saveDatabase(database: SqlJsDatabase): void {
  const data = database.export();
  const buffer = Buffer.from(data);
  const tmpPath = `${DB_PATH}.tmp`;

  try {
    fs.writeFileSync(tmpPath, buffer);
    try {
      fs.renameSync(tmpPath, DB_PATH);
    } catch (renameErr) {
      // Windows can refuse to rename over the open file (EPERM/EEXIST).
      // Fall back to a direct write, then clean up the temp file.
      fs.writeFileSync(DB_PATH, buffer);
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup failures
      }
    }
  } catch (writeErr) {
    // Last resort: direct write if even writing the temp file failed.
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initializeSchema(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('Critical', 'Normal')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS concerns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      student_number TEXT NOT NULL,
      section TEXT NOT NULL,
      institute TEXT NOT NULL,
      program TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('Complaint', 'Question', 'Suggestion')),
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Read', 'Resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

database.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_number TEXT NOT NULL UNIQUE,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      section TEXT NOT NULL,
      institute TEXT NOT NULL,
      program TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// Lightweight migrations that add columns/tables without dropping data.
function runMigrations(database: SqlJsDatabase): void {
  const cols = database.exec("PRAGMA table_info(concerns)");
  const existing: string[] =
    cols.length > 0 ? cols[0].values.map((row) => String(row[1])) : [];

  if (!existing.includes("email")) {
    database.run("ALTER TABLE concerns ADD COLUMN email TEXT");
  }
  if (!existing.includes("response")) {
    database.run("ALTER TABLE concerns ADD COLUMN response TEXT");
  }
}

function seedIfEmpty(database: SqlJsDatabase): void {
  const result = database.exec("SELECT COUNT(*) as cnt FROM announcements");
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  if (count > 0) return;

  const seedData: Announcement[] = [
    {
      title: "Class Suspension",
      date: "Oct 20, 2025",
      priority: "Critical",
      content:
        "Classes are suspended due to typhoon. Stay safe and monitor official channels for updates.",
    },
    {
      title: "Enrollment Schedule",
      date: "Oct 25, 2025",
      priority: "Normal",
      content:
        "Enrollment for this Semester starts. Please prepare your requirements early.\n\n1st Year: October 25-26\n2nd Year: October 27-28\n3rd Year: October 29-30\n4th Year: October 31 - November 1",
    },
    {
      title: "OJT Orientation",
      date: "Nov 03, 2025",
      priority: "Normal",
      content: "Mandatory OJT orientation for all 4th-year students at the AVR.",
    },
    {
      title: "System Maintenance",
      date: "Nov 08, 2025",
      priority: "Critical",
      content: "The student portal will be under maintenance from 10PM to 2AM.",
    },
    {
      title: "Scholarship Application",
      date: "Nov 10, 2025",
      priority: "Normal",
      content:
        "Scholarship applications are now open for the upcoming semester!\n\nEligible students may apply for:\n- TES (Tertiary Education Subsidy)\n- TDP (Tulong Dunong Program)\n\nDeadline: November 30\nLocation: Registrar's Office\n\nFor inquiries, visit the Scholarship Office or email scholarships@cdm.edu.ph.",
    },
  ];

  const stmt = database.prepare(
    "INSERT INTO announcements (title, date, priority, content) VALUES (@title, @date, @priority, @content)",
  );

  for (const item of seedData) {
    stmt.bind({
      "@title": item.title,
      "@date": item.date,
      "@priority": item.priority,
      "@content": item.content,
    });
    stmt.run();
    stmt.reset();
  }
  stmt.free();

  saveDatabase(database);
  console.log(`[DB] Seeded ${seedData.length} announcements.`);
}

// Ensure a demo student account exists so the student dashboard can be
// tested right away. Login with: 24-00123 / student123
// This is idempotent: if the account already exists it is updated to the
// documented demo credentials so the demo login always works.
// IMPORTANT: The demo account is only seeded in non-production environments.
// In production it is deliberately NOT created so that weak demo credentials
// never exist.
function seedStudentsIfEmpty(database: SqlJsDatabase): void {
  if (process.env.NODE_ENV === "production") {
    console.log("[DB] Skipped demo student seeding (production mode).");
    return;
  }

  const demo = {
    student_number: "24-00123",
    last_name: "Demo",
    first_name: "Student",
    middle_name: "Account",
    section: "4-A",
    institute: "ICS — Institute of Computer Studies",
    program: "BSIT",
    password_hash: hashPassword("student123"),
  };

  const existing = database.exec(
    "SELECT id FROM students WHERE student_number = ?",
    [demo.student_number],
  );

  if (existing.length > 0 && existing[0].values.length > 0) {
    // Update the existing demo account to the documented credentials.
    database.run(
      `UPDATE students SET last_name = ?, first_name = ?, middle_name = ?, section = ?, institute = ?, program = ?, password_hash = ?
       WHERE student_number = ?`,
      [
        demo.last_name,
        demo.first_name,
        demo.middle_name,
        demo.section,
        demo.institute,
        demo.program,
        demo.password_hash,
        demo.student_number,
      ],
    );
    saveDatabase(database);
    console.log("[DB] Demo student account updated (24-00123 / student123).");
    return;
  }

  const stmt = database.prepare(
    `INSERT INTO students (student_number, last_name, first_name, middle_name, section, institute, program, password_hash)
     VALUES (@student_number, @last_name, @first_name, @middle_name, @section, @institute, @program, @password_hash)`,
  );

  stmt.bind({
    "@student_number": demo.student_number,
    "@last_name": demo.last_name,
    "@first_name": demo.first_name,
    "@middle_name": demo.middle_name,
    "@section": demo.section,
    "@institute": demo.institute,
    "@program": demo.program,
    "@password_hash": demo.password_hash,
  });
  stmt.run();
  stmt.free();

  saveDatabase(database);
  console.log("[DB] Seeded demo student account (24-00123 / student123).");
}

// ── Query helpers ──────────────────────────────────────────────────

function rowsToObjects<T>(results: ReturnType<SqlJsDatabase["exec"]>): T[] {
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

// ── Announcements ──────────────────────────────────────────────────

export async function getAllAnnouncements(
  page?: number,
  limit?: number,
  sort: "newest" | "oldest" = "newest",
): Promise<Announcement[] | { data: Announcement[]; total: number; page: number; totalPages: number }> {
  const database = await getDatabase();
  const order = sort === "oldest" ? "ASC" : "DESC";

  // Paginated request
  if (page !== undefined && limit !== undefined) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const countResult = database.exec("SELECT COUNT(*) as cnt FROM announcements");
    const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const current = Math.min(safePage, totalPages);
    const offset = (current - 1) * safeLimit;

    const results = database.exec(
      `SELECT * FROM announcements ORDER BY created_at ${order}, id ${order} LIMIT ? OFFSET ?`,
      [safeLimit, offset],
    );
    return {
      data: rowsToObjects<Announcement>(results),
      total,
      page: current,
      totalPages,
    };
  }

  // Array request (backward compatible)
  const results = database.exec(
    `SELECT * FROM announcements ORDER BY created_at ${order}, id ${order}`,
  );
  return rowsToObjects<Announcement>(results);
}

export async function createAnnouncement(announcement: Announcement): Promise<Announcement> {
  const database = await getDatabase();
  database.run("INSERT INTO announcements (title, date, priority, content) VALUES (?, ?, ?, ?)", [
    announcement.title,
    announcement.date,
    announcement.priority,
    announcement.content,
  ]);
  const result = database.exec("SELECT last_insert_rowid() AS id");
  saveDatabase(database);

  const id = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  return { id, ...announcement };
}

// ── Concerns ───────────────────────────────────────────────────────

export async function createConcern(concern: Concern): Promise<Concern> {
  const database = await getDatabase();

  database.run(
    `INSERT INTO concerns (last_name, first_name, middle_name, student_number, section, institute, program, type, message, response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      concern.last_name,
      concern.first_name,
      concern.middle_name ?? null,
      concern.student_number,
      concern.section,
      concern.institute,
      concern.program,
      concern.type,
      concern.message,
      null,
    ],
  );
  const result = database.exec("SELECT last_insert_rowid() AS id");
  saveDatabase(database);

  const id = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  return { id, ...concern, status: "Pending" };
}

// Admin list with pagination + optional search.
export async function getAllConcerns(
  page: number = 1,
  limit: number = 10,
  search: string = "",
): Promise<{ data: Concern[]; total: number; page: number; totalPages: number }> {
  const database = await getDatabase();

  const searchTerm = search.trim();
  const searchWhere = searchTerm
    ? ` WHERE (last_name LIKE '%' || ? || '%' OR first_name LIKE '%' || ? || '%' OR student_number LIKE '%' || ? || '%' OR message LIKE '%' || ? || '%')`
    : "";
  const searchParams = searchTerm ? [searchTerm, searchTerm, searchTerm, searchTerm] : [];

  // Get total count
  const countResult = database.exec(
    `SELECT COUNT(*) as cnt FROM concerns${searchWhere}`,
    searchParams,
  );
  const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const offset = (safePage - 1) * limit;

  const results = database.exec(
    `SELECT * FROM concerns${searchWhere} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return {
    data: rowsToObjects<Concern>(results),
    total,
    page: safePage,
    totalPages,
  };
}

// All concerns (no pagination) for CSV export.
export async function getAllConcernsRaw(search: string = ""): Promise<Concern[]> {
  const database = await getDatabase();
  const searchTerm = search.trim();
  const searchWhere = searchTerm
    ? ` WHERE (last_name LIKE '%' || ? || '%' OR first_name LIKE '%' || ? || '%' OR student_number LIKE '%' || ? || '%' OR message LIKE '%' || ? || '%')`
    : "";
  const searchParams = searchTerm ? [searchTerm, searchTerm, searchTerm, searchTerm] : [];

  const results = database.exec(
    `SELECT * FROM concerns${searchWhere} ORDER BY created_at DESC, id DESC`,
    searchParams,
  );
  return rowsToObjects<Concern>(results);
}

export async function updateConcernStatus(
  id: number,
  status: "Pending" | "Read" | "Resolved",
): Promise<Concern | null> {
  const database = await getDatabase();
  database.run("UPDATE concerns SET status = ? WHERE id = ?", [status, id]);
  saveDatabase(database);

  const results = database.exec("SELECT * FROM concerns WHERE id = ?", [id]);
  const concerns = rowsToObjects<Concern>(results);
  return concerns[0] ?? null;
}

// Update both status and optional response in one operation.
export async function updateConcern(id: number, status: string, response?: string): Promise<Concern | null> {
  const database = await getDatabase();
  if (response !== undefined) {
    database.run("UPDATE concerns SET status = ?, response = ? WHERE id = ?", [status, response, id]);
  } else {
    database.run("UPDATE concerns SET status = ? WHERE id = ?", [status, id]);
  }
  saveDatabase(database);

  const results = database.exec("SELECT * FROM concerns WHERE id = ?", [id]);
  const concerns = rowsToObjects<Concern>(results);
  return concerns[0] ?? null;
}

export async function deleteConcern(id: number): Promise<boolean> {
  const database = await getDatabase();
  database.run("DELETE FROM concerns WHERE id = ?", [id]);
  saveDatabase(database);
  return true;
}

export async function updateAnnouncement(
  id: number,
  announcement: Pick<Announcement, "title" | "date" | "priority" | "content">,
): Promise<Announcement | null> {
  const database = await getDatabase();
  database.run(
    "UPDATE announcements SET title = ?, date = ?, priority = ?, content = ? WHERE id = ?",
    [announcement.title, announcement.date, announcement.priority, announcement.content, id],
  );
  saveDatabase(database);

  const results = database.exec("SELECT * FROM announcements WHERE id = ?", [id]);
  const announcements = rowsToObjects<Announcement>(results);
  return announcements[0] ?? null;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const database = await getDatabase();
  database.run("DELETE FROM announcements WHERE id = ?", [id]);
  saveDatabase(database);
  return true;
}

export async function getStats(): Promise<{
  announcements: number;
  concerns: number;
  pending: number;
  read: number;
  resolved: number;
}> {
  const database = await getDatabase();

  const annResult = database.exec("SELECT COUNT(*) as cnt FROM announcements");
  const concernsResult = database.exec("SELECT COUNT(*) as cnt FROM concerns");
  const pendingResult = database.exec("SELECT COUNT(*) as cnt FROM concerns WHERE status = 'Pending'");
  const readResult = database.exec("SELECT COUNT(*) as cnt FROM concerns WHERE status = 'Read'");
  const resolvedResult = database.exec(
    "SELECT COUNT(*) as cnt FROM concerns WHERE status = 'Resolved'",
  );

  const count = (results: ReturnType<SqlJsDatabase["exec"]>): number =>
    results.length > 0 ? (results[0].values[0][0] as number) : 0;

  return {
    announcements: count(annResult),
    concerns: count(concernsResult),
    pending: count(pendingResult),
    read: count(readResult),
    resolved: count(resolvedResult),
  };
}

// ── Audit log ──────────────────────────────────────────────────────

export async function addAuditLog(action: string, detail?: string): Promise<void> {
  const database = await getDatabase();
  database.run("INSERT INTO audit_log (action, detail) VALUES (?, ?)", [action, detail ?? null]);
  saveDatabase(database);
}

export async function getAuditLog(limit: number = 50): Promise<AuditLog[]> {
  const database = await getDatabase();
  const safeLimit = Math.min(200, Math.max(1, limit));
  const results = database.exec(
    "SELECT * FROM audit_log ORDER BY id DESC LIMIT ?",
    [safeLimit],
  );
  return rowsToObjects<AuditLog>(results);
}

// ── Students ───────────────────────────────────────────────────────

export async function getStudentByStudentNumber(studentNumber: string): Promise<Student | null> {
  const database = await getDatabase();
  const results = database.exec("SELECT * FROM students WHERE student_number = ?", [studentNumber]);
  const students = rowsToObjects<Student>(results);
  return students[0] ?? null;
}

export async function getStudentById(id: number): Promise<Student | null> {
  const database = await getDatabase();
  const results = database.exec("SELECT * FROM students WHERE id = ?", [id]);
  const students = rowsToObjects<Student>(results);
  return students[0] ?? null;
}

export async function createStudent(
  student: Omit<Student, "id" | "created_at">,
): Promise<Student> {
  const database = await getDatabase();
  database.run(
    `INSERT INTO students (student_number, last_name, first_name, middle_name, section, institute, program, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.student_number,
      student.last_name,
      student.first_name,
      student.middle_name ?? null,
      student.section,
      student.institute,
      student.program,
      student.password_hash,
    ],
  );
  const result = database.exec("SELECT last_insert_rowid() AS id");
  saveDatabase(database);

  const id = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  return { id, ...student };
}

// Get all concerns submitted by a specific student (by student number).
export async function getConcernsByStudent(studentNumber: string): Promise<Concern[]> {
  const database = await getDatabase();
  const results = database.exec(
    "SELECT * FROM concerns WHERE student_number = ? ORDER BY created_at DESC, id DESC",
    [studentNumber],
  );
  return rowsToObjects<Concern>(results);
}
