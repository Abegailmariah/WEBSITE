import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Announcement, Concern } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "cdm_portal.db");

let db: SqlJsDatabase | null = null;

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
  seedIfEmpty(db);
  saveDatabase(db);

  return db;
}

function saveDatabase(database: SqlJsDatabase): void {
  const data = database.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
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

// ── Query Helpers ──────────────────────────────────────────────────

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const database = await getDatabase();
  const results = database.exec("SELECT * FROM announcements ORDER BY created_at DESC");
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as Announcement;
  });
}

export async function createAnnouncement(announcement: Announcement): Promise<Announcement> {
  const database = await getDatabase();
  database.run("INSERT INTO announcements (title, date, priority, content) VALUES (?, ?, ?, ?)", [
    announcement.title,
    announcement.date,
    announcement.priority,
    announcement.content,
  ]);
  saveDatabase(database);

  const result = database.exec("SELECT last_insert_rowid() as id");
  const id = result[0].values[0][0] as number;
  return { id, ...announcement };
}

export async function createConcern(concern: Concern): Promise<Concern> {
  const database = await getDatabase();
  database.run(
    `INSERT INTO concerns (last_name, first_name, middle_name, student_number, section, institute, program, type, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  );
  saveDatabase(database);

  const result = database.exec("SELECT last_insert_rowid() as id");
  const id = result[0].values[0][0] as number;
  return { id, ...concern, status: "Pending" };
}
