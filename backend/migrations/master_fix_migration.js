/**
 * Master Migration: Fix all missing columns, table issues, and schema inconsistencies
 * Run: node migrations/master_fix_migration.js (from backend/ directory)
 */
const db = require("../config/database");

const fixes = [
  // ── call_reports: Add missing columns for session-based tracking ──
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS session_id VARCHAR(50) DEFAULT NULL AFTER id",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS client_name VARCHAR(150) DEFAULT NULL AFTER session_id",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS staff_name VARCHAR(150) DEFAULT NULL AFTER client_name",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS executive_name VARCHAR(150) DEFAULT '' AFTER staff_name",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS call_sequence INT DEFAULT 1 AFTER staff_name",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS assigned_time INT DEFAULT 30 AFTER end_time",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS actual_duration INT DEFAULT 0 AFTER assigned_time",
  "ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS is_exceeded TINYINT(1) DEFAULT 0 AFTER actual_duration",

  // ── amc_alc_services: Add service_person_id for employee tracking ──
  "ALTER TABLE amc_alc_services ADD COLUMN IF NOT EXISTS service_person_id INT DEFAULT NULL AFTER service_person",

  // ── tasks: Add created_date alias column (we'll use generated or just add it) ──
  "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_date DATE NULL AFTER project_priority",

  // ── notifications: Ensure is_read is consistent ──
  "ALTER TABLE notifications MODIFY COLUMN is_read TINYINT(1) DEFAULT 0",

  // ── lead_reminders: Ensure employee_id exists ──
  "ALTER TABLE lead_reminders ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL AFTER notification_sent",

  // ── lead_activity: Ensure employee_id exists ──
  "ALTER TABLE lead_activity ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL AFTER created_at",

  // ── lead_escalations: Ensure all needed columns exist ──
  "ALTER TABLE lead_escalations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL DEFAULT NULL AFTER created_at",
  "ALTER TABLE lead_escalations ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL AFTER missed_threshold_reached",

  // ── teammember: Ensure mobile_number exists ──
  "ALTER TABLE teammember ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20) DEFAULT NULL AFTER mobile",

  // ── estimate_invoices: Add missing bank columns ──
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS bank_details_id VARCHAR(50) DEFAULT NULL AFTER supplier_branch",
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS bank_company VARCHAR(150) DEFAULT NULL AFTER bank_details_id",
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL AFTER bank_company",
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50) DEFAULT NULL AFTER bank_name",
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50) DEFAULT NULL AFTER bank_account",
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100) DEFAULT NULL AFTER bank_ifsc",
  "ALTER TABLE estimate_invoices ADD COLUMN IF NOT EXISTS custom_terms TEXT DEFAULT NULL AFTER bank_branch",

  // ── service_estimations: Add missing bank columns ──
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS bank_details_id VARCHAR(50) DEFAULT NULL AFTER supplier_branch",
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS bank_company VARCHAR(150) DEFAULT NULL AFTER bank_details_id",
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL AFTER bank_company",
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50) DEFAULT NULL AFTER bank_name",
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50) DEFAULT NULL AFTER bank_account",
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100) DEFAULT NULL AFTER bank_ifsc",
  "ALTER TABLE service_estimations ADD COLUMN IF NOT EXISTS custom_terms TEXT DEFAULT NULL AFTER bank_branch",
];

let done = 0;
let errors = 0;

function runNext() {
  if (done >= fixes.length) {
    console.log(`\n✅ Migration complete. ${fixes.length - errors} succeeded, ${errors} skipped/errored.`);
    process.exit(0);
  }

  const sql = fixes[done];
  const colName = sql.includes("ADD COLUMN") ? sql.split("ADD COLUMN")[1]?.split(" ")[1] || "?" : "?";

  db.query(sql, (err) => {
    if (err) {
      if (err.code === "ER_DUP_FIELDNAME" || err.message.includes("Duplicate column")) {
        console.log(`⏭️  Skipped (already exists): ${colName}`);
      } else if (err.code === "ER_PARSE_ERROR" && sql.includes("IF NOT EXISTS")) {
        // MySQL < 8.0.19 doesn't support IF NOT EXISTS for ADD COLUMN
        // Try without it
        const retrySql = sql.replace(" ADD COLUMN IF NOT EXISTS ", " ADD COLUMN ");
        db.query(retrySql, (err2) => {
          if (err2) {
            if (err2.code === "ER_DUP_FIELDNAME" || err2.message.includes("Duplicate column")) {
              console.log(`⏭️  Skipped (already exists): ${colName}`);
            } else {
              console.log(`❌ Error on ${colName}: ${err2.message.split("\n")[0]}`);
              errors++;
            }
          } else {
            console.log(`✅ Added: ${colName}`);
          }
          done++;
          runNext();
        });
        return;
      } else {
        console.log(`❌ Error on ${colName}: ${err.message.split("\n")[0]}`);
        errors++;
      }
    } else {
      console.log(`✅ Added: ${colName}`);
    }
    done++;
    runNext();
  });
}

console.log("🚀 Starting master schema fix migration...\n");
runNext();
