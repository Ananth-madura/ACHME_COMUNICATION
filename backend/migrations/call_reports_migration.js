/**
 * Migration: Upgrade call_reports table to support full session-based call tracking
 * Run: node migrations/call_reports_migration.js  (from backend/ directory)
 */
const db = require("../config/database");

const columns = [
  "ALTER TABLE call_reports ADD COLUMN session_id VARCHAR(50) DEFAULT NULL",
  "ALTER TABLE call_reports ADD COLUMN client_name VARCHAR(150) DEFAULT NULL",
  "ALTER TABLE call_reports ADD COLUMN staff_name VARCHAR(150) DEFAULT NULL",
  "ALTER TABLE call_reports ADD COLUMN call_sequence INT DEFAULT 1",
  "ALTER TABLE call_reports ADD COLUMN start_time DATETIME DEFAULT NULL",
  "ALTER TABLE call_reports ADD COLUMN end_time DATETIME DEFAULT NULL",
  "ALTER TABLE call_reports ADD COLUMN assigned_time INT DEFAULT 30",
  "ALTER TABLE call_reports ADD COLUMN actual_duration INT DEFAULT 0",
  "ALTER TABLE call_reports ADD COLUMN is_exceeded TINYINT(1) DEFAULT 0",
  "ALTER TABLE call_reports ADD COLUMN remarks TEXT DEFAULT NULL",
];

let done = 0;
columns.forEach(sql => {
  db.query(sql, (err) => {
    if (err && !err.message.includes("Duplicate column")) {
      console.warn("Skipped (already exists or error):", err.message.split("\n")[0]);
    } else if (!err) {
      console.log("✅ Added:", sql.split("ADD COLUMN ")[1].split(" ")[0]);
    }
    done++;
    if (done === columns.length) {
      console.log("\n✅ Migration complete");
      process.exit(0);
    }
  });
});
