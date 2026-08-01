import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "cdm_portal.db");

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(DB_PATH));

console.log("=== Database file ===");
console.log("Path:", DB_PATH);
console.log("Size:", fs.statSync(DB_PATH).size, "bytes");
console.log("");

function printTable(query, label) {
  const res = db.exec(query);
  if (res.length === 0) {
    console.log(`${label}: (empty)`);
    return;
  }
  console.log(`=== ${label} ===`);
  console.log("Columns:", res[0].columns.join(", "));
  for (const row of res[0].values) {
    console.log(JSON.stringify(row));
  }
  console.log("");
}

printTable("SELECT name FROM sqlite_master WHERE type='table'", "Tables");
printTable("SELECT * FROM announcements ORDER BY id", "Announcements");
printTable("SELECT * FROM concerns ORDER BY id", "Concerns");

